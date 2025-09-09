import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export async function POST(request: NextRequest) {
  try {
    const { userId, contentType, sheetId, tabName, lastDataHash } = await request.json()

    if (!userId || !sheetId || !tabName) {
      return NextResponse.json(
        { success: false, error: 'Missing required data' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const user = await getAuthenticatedUser()

    if (user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Google access token
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('google_access_token')
      .eq('user_id', userId)
      .single()

    if (!userSettings?.google_access_token) {
      return NextResponse.json(
        { success: false, error: 'Google Sheets not connected' },
        { status: 400 }
      )
    }

    // Fetch current sheet data
    const { google } = await import('googleapis')
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: userSettings.google_access_token })

    const sheets = google.sheets({ version: 'v4', auth })

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!A:Z`
    })

    const rows = response.data.values || []
    
    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        hasChanges: false,
        dataHash: 'empty',
        changes: []
      })
    }

    const headers = rows[0]
    const dataRows = rows.slice(1)

    const processedData = dataRows.map((row, index) => {
      const item: any = { id: `gsheet_${index}` }
      headers.forEach((header, i) => {
        item[header] = row[i] || ''
      })
      return item
    })

    // Generate current data hash
    const currentDataHash = generateDataHash(processedData)

    // If hash hasn't changed, no need to detect changes
    if (lastDataHash && currentDataHash === lastDataHash) {
      return NextResponse.json({
        success: true,
        hasChanges: false,
        dataHash: currentDataHash,
        changes: []
      })
    }

    // Hash has changed, detect specific changes
    // ========================================================================
    // KEY CHANGE #1: Fetch the page snapshots, not the export snapshots
    // ========================================================================
    const { data: pageSnapshots, error: snapshotError } = await supabase
      .from('page_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .eq('sheet_id', sheetId)
      .eq('sheet_tab_name', tabName)
      .order('created_at', { ascending: false })

    if (snapshotError || !pageSnapshots || pageSnapshots.length === 0) {
      return NextResponse.json({
        success: true,
        hasChanges: false,
        dataHash: currentDataHash,
        changes: [],
        message: 'No page snapshots found to compare against. Please export the data first.'
      })
    }

    // Create a Map for fast lookups using hubspot_page_id
    const originalDataMap = new Map(pageSnapshots.map((item: any) => [String(item.hubspot_page_id), item]))

    // Only compare the most essential content fields that users actually edit
    const fieldsToCompare: { [key: string]: string } = {
      'Name': 'name',
      'Html Title': 'html_title',
      'Meta Description': 'meta_description',
      'Slug': 'slug',
      'State': 'state',
      'Current State': 'current_state',
      'Content Type': 'content_type',
      'Published': 'published',
    }
    
    // ========================================================================
    // KEY CHANGE #2: Compare sheet data against the snapshot map
    // ========================================================================
    const changes: any[] = []

    for (const sheetRow of processedData) {
      const pageId = sheetRow['Id']
      if (!pageId) continue

      const snapshotPage = originalDataMap.get(String(pageId))
      if (!snapshotPage) continue

      const modifiedFields: { [key: string]: any } = {}
      let isModified = false

      // Iterate over ONLY the fields we want to compare
      for (const header in fieldsToCompare) {
        const dbColumn = fieldsToCompare[header]

        let sheetValue = sheetRow[header]
        const snapshotValue = (snapshotPage as any)[dbColumn]

        // Skip comparison if the field doesn't exist in the sheet data
        if (sheetValue === undefined) {
          continue
        }

        // --- Start of Hydration & Normalization ---
        // Treat empty sheet cells as null to match the database
        if (sheetValue === '' || sheetValue === undefined) {
          sheetValue = null
        }

        // Hydrate string booleans to real booleans
        if (sheetValue === 'TRUE') sheetValue = true
        else if (sheetValue === 'FALSE') sheetValue = false
        // Hydrate JSON strings to objects/arrays
        else if (
          typeof sheetValue === 'string' &&
          (sheetValue.startsWith('{') || sheetValue.startsWith('['))
        ) {
          try {
            sheetValue = JSON.parse(sheetValue)
          } catch (e) {
            // If parsing fails, keep the original string value
            console.warn(`Failed to parse JSON for field ${header}:`, e)
          }
        }
        // --- End of Hydration & Normalization ---

        // Final Comparison: Convert both to strings for a foolproof check
        const oldStr =
          snapshotValue !== null && typeof snapshotValue === 'object'
            ? JSON.stringify(snapshotValue)
            : String(snapshotValue ?? '')
        const newStr =
          sheetValue !== null && typeof sheetValue === 'object'
            ? JSON.stringify(sheetValue)
            : String(sheetValue ?? '')

        if (oldStr !== newStr) {
          isModified = true
          modifiedFields[dbColumn] = {
            old: snapshotValue,
            new: sheetValue,
            header: header, // Include the header/column name from the sheet
            dbColumn: dbColumn, // Include the database column name
          }
        }

        // Debug logging for Current State field
        if (header === 'Current State') {
          console.log(`DEBUG Current State for page ${pageId}:`, {
            header,
            dbColumn,
            sheetValue,
            snapshotValue,
            normalizedSnapshotValue,
            oldStr,
            newStr,
            isDifferent: oldStr !== newStr
          })
        }
      }

      if (isModified) {
        // Flatten the changes to match the expected format
        for (const [field, values] of Object.entries(modifiedFields)) {
          changes.push({
            field: field,
            oldValue: (values as any).old ?? '',
            newValue: (values as any).new ?? '',
            pageId: pageId,
            header: (values as any).header, // Include the header/column name
            dbColumn: (values as any).dbColumn, // Include the database column name
          })
        }
      }
    }

    // Log the polling activity
    await supabase.from('audit_logs').insert([
      {
        user_id: userId,
        action_type: 'polling_changes_detected',
        resource_type: contentType,
        resource_id: sheetId,
        details: {
          sheet_id: sheetId,
          tab_name: tabName,
          total_items: processedData.length,
          items_with_changes: changes.length,
          changes_detected: flattenedChanges.length,
          data_hash: currentDataHash,
        },
      },
    ])

    return NextResponse.json({
      success: true,
      hasChanges: changes.length > 0,
      dataHash: currentDataHash,
      changes: changes,
      summary: {
        totalItems: processedData.length,
        itemsWithChanges: new Set(changes.map(c => c.pageId)).size,
        totalChanges: changes.length,
      },
    })
  } catch (error) {
    console.error('CRITICAL ERROR in poll-changes:', error)

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.'
    return NextResponse.json(
      {
        success: false,
        error: `Failed to poll for changes: ${errorMessage}`,
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    )
  }
}

// Generate a simple hash for data comparison
function generateDataHash(data: any[]): string {
  if (!data || data.length === 0) return 'empty'
  
  // Create a simple hash based on row count and first few rows
  const sample = data.slice(0, 3).map(row => 
    Object.values(row).join('|')
  ).join('||')
  
  return `${data.length}_${sample.length}_${JSON.stringify(sample).slice(0, 100)}`
}
