// FILE: /api/import/detect-changes/route.ts (The Definitive Version)

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export async function POST(request: NextRequest) {
  try {
    const { userId, importData, sheetId, tabName } = await request.json()

    if (!userId || !importData || !Array.isArray(importData) || !sheetId || !tabName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const user = await getAuthenticatedUser()
    if (user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // --- Step 1: Fetch the structured snapshot data for this specific sheet/tab ---
    const { data: snapshotData, error: snapshotError } = await supabase
      .from('page_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .eq('sheet_id', sheetId)
      .eq('sheet_tab_name', tabName)

    if (snapshotError || !snapshotData || snapshotData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No export snapshot found to compare against. Please re-export the data to this tab first.',
        },
        { status: 404 }
      )
    }

    const snapshotMap = new Map(snapshotData.map(item => [String(item.hubspot_page_id), item]))

    // --- Step 2: Define mapping for ONLY the fields we want to compare ---
    // Only compare the most essential content fields that users actually edit
    const fieldsToCompare: { [key: string]: string } = {
      Name: 'name',
      'Html Title': 'html_title',
      'Meta Description': 'meta_description',
      Slug: 'slug',
      State: 'state',
      'Current State': 'current_state',
      'Content Type': 'content_type',
      Published: 'published',
    }

    const changes = []

    for (const sheetRow of importData) {
      const pageId = sheetRow['Id'] // Use bracket notation for safety with spaces
      if (!pageId) continue

      const snapshotPage = snapshotMap.get(String(pageId))
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

        // Special handling for "EMPTY" values in database
        let normalizedSnapshotValue = snapshotValue
        if (snapshotValue === 'EMPTY' || snapshotValue === '') {
          normalizedSnapshotValue = null
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
          normalizedSnapshotValue !== null && typeof normalizedSnapshotValue === 'object'
            ? JSON.stringify(normalizedSnapshotValue)
            : String(normalizedSnapshotValue ?? '')
        const newStr =
          sheetValue !== null && typeof sheetValue === 'object'
            ? JSON.stringify(sheetValue)
            : String(sheetValue ?? '')

        if (oldStr !== newStr) {
          isModified = true
          modifiedFields[dbColumn] = {
            old: snapshotValue, // Send back the raw original value
            new: sheetValue, // Send back the raw new value
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
            isDifferent: oldStr !== newStr,
          })
        }
      }

      if (isModified) {
        changes.push({
          pageId: pageId,
          name: sheetRow['Name'] || snapshotPage.name,
          type: 'modified',
          fields: modifiedFields,
        })
      }
    }

    return NextResponse.json({
      success: true,
      changes,
      summary: {
        totalItems: importData.length,
        itemsWithChanges: changes.length,
        totalChanges: changes.reduce((acc, item) => acc + Object.keys(item.fields).length, 0),
      },
    })
  } catch (error) {
    console.error('CRITICAL ERROR in detect-changes:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.'
    return NextResponse.json(
      { success: false, error: errorMessage, stack: error instanceof Error ? error.stack : null },
      { status: 500 }
    )
  }
}
