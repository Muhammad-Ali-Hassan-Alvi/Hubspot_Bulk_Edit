// FILE: /api/import/detect-changes/route.ts (Database Backup Comparison)

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

/**
 * Checks if a value is effectively empty, null, undefined, or "N/A".
 * @param value The value to check.
 * @returns boolean
 */
const isEmptyOrNA = (value: any): boolean => {
  if (value === null || value === undefined) {
    return true
  }
  if (typeof value === 'string') {
    const trimmedValue = value.trim().toLowerCase()
    return (
      trimmedValue === '' ||
      trimmedValue === 'n/a' ||
      trimmedValue === 'undefined' ||
      trimmedValue === 'null'
    )
  }
  return false
}

/**
 * Normalizes a value for a consistent string-based comparison.
 * Handles objects, arrays, booleans, and empty values.
 * @param value The value to normalize.
 * @returns string
 */
const normalizeForComparison = (value: any): string => {
  if (isEmptyOrNA(value)) {
    return '' // Represent all empty-like values as an empty string
  }
  // For objects and arrays, stringify them for a consistent comparison
  if (typeof value === 'object') {
    // Handle Supabase's empty array/object representation vs sheet's string version
    if (Array.isArray(value) && value.length === 0) return '[]'
    if (Object.keys(value).length === 0) return '{}'
    return JSON.stringify(value)
  }
  // Convert booleans to lowercase strings
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  // For everything else, convert to string and trim
  return String(value).trim()
}

export async function POST(request: NextRequest) {
  try {
    const { userId, importData, sheetId, tabName, importType = 'sheets' } = await request.json()

    if (!userId || !importData || !Array.isArray(importData) || importData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty required fields.' },
        { status: 400 }
      )
    }

    // For Google Sheets, sheetId and tabName are required
    if (importType === 'sheets' && (!sheetId || !tabName)) {
      return NextResponse.json(
        { success: false, error: 'Missing sheetId or tabName for Google Sheets import.' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const user = await getAuthenticatedUser()
    if (user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get the latest backup to compare against
    let query = supabase
      .from('page_snapshots')
      .select('backup_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    // For CSV imports, look for CSV backups; for sheets, look for sheet backups
    if (importType === 'csv') {
      query = query.like('backup_id', 'csv_%')
    } else {
      query = query.not('backup_id', 'like', 'csv_%')
    }

    const { data: latestBackupRun, error: backupIdError } = await query.single()

    if (backupIdError || !latestBackupRun) {
      return NextResponse.json(
        {
          success: false,
          error: `No database backup found to compare against. Please export your data first using ${importType === 'csv' ? 'CSV export' : 'Google Sheets export'}.`,
        },
        { status: 404 }
      )
    }

    // Get the latest snapshot data to compare against (not the backup data)
    const { data: dbBackupData, error: dbError } = await supabase
      .from('page_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .eq('backup_id', latestBackupRun.backup_id)

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { success: false, error: 'Database error while fetching backup data.' },
        { status: 500 }
      )
    }

    const dbDataMap = new Map(dbBackupData.map(item => [String(item.hubspot_page_id), item]))

    // =================================================================
    // START: DYNAMIC FIELD MAPPING
    // =================================================================
    const headers = Object.keys(importData[0])

    // These fields should be ignored during comparison because they are metadata
    // or the primary key itself.
    const ignoreList = ['Id', 'Export Date', 'Created At', 'Updated At']

    const fieldsToCompare: { [key: string]: string } = {}

    for (const header of headers) {
      if (ignoreList.some(itemToIgnore => itemToIgnore.toLowerCase() === header.toLowerCase())) {
        continue
      }
      // Map sheet headers to page_snapshots table column names
      // The page_snapshots table uses snake_case field names
      const dbField = header.replace(/\s+/g, '_').toLowerCase()
      fieldsToCompare[header] = dbField
    }
    // =================================================================
    // END: DYNAMIC FIELD MAPPING
    // =================================================================

    // Debug: Log the data we're working with
    console.log('=== DEBUG INFO ===')
    console.log('Import type:', importType)
    console.log('Total snapshot records found:', dbBackupData.length)
    console.log('Sample snapshot record:', dbBackupData[0])
    console.log('Import headers:', Object.keys(importData[0]))
    console.log('Sample import row:', importData[0])
    console.log('Field mapping:', fieldsToCompare)

    // Debug: Check if we have any pages with matching IDs
    const importPageIds = importData.map(row => row['Id']).filter(id => id)
    const dbPageIds = dbBackupData.map(row => row.hubspot_page_id)
    const matchingIds = importPageIds.filter(id => dbPageIds.includes(String(id)))
    console.log('Import Page IDs (first 5):', importPageIds.slice(0, 5))
    console.log('DB Page IDs (first 5):', dbPageIds.slice(0, 5))
    console.log('Matching IDs count:', matchingIds.length)
    console.log('Matching IDs (first 5):', matchingIds.slice(0, 5))

    const changes = []

    for (const importRow of importData) {
      // HubSpot uses 'Id' from the export, but the DB column is hubspot_page_id
      const pageId = importRow['Id']
      if (!pageId) {
        console.log('Skipping row - no Id field found:', Object.keys(importRow))
        continue
      }

      const dbPage = dbDataMap.get(String(pageId))
      if (!dbPage) {
        console.log(`No snapshot data found for page ID: ${pageId} - treating as new page`)
        // If page doesn't exist in snapshot, treat it as a new page with all fields as changes
        const newPageChanges: { [key: string]: any } = {}
        let hasChanges = false

        for (const header in fieldsToCompare) {
          const dbField = fieldsToCompare[header]
          const importValue = importRow[header]

          // Skip empty values for new pages
          if (isEmptyOrNA(importValue)) continue

          newPageChanges[dbField] = {
            old: null, // No old value since it's a new page
            new: importValue,
            header: header,
            dbField: dbField,
          }
          hasChanges = true
        }

        if (hasChanges) {
          changes.push({
            pageId: pageId,
            name: importRow['Name'] || `Page ${pageId}`,
            type: 'new',
            fields: newPageChanges,
          })
        }
        continue
      }

      // Debug: Log specific page we're checking
      if (pageId === '221892034283' || pageId === '231355241185') {
        console.log(`=== CHECKING PAGE ${pageId} ===`)
        console.log('Import data:', importRow)
        console.log('DB snapshot data:', dbPage)
      }

      const modifiedFields: { [key: string]: any } = {}
      let isModified = false

      // Compare each dynamically mapped field
      for (const header in fieldsToCompare) {
        const dbField = fieldsToCompare[header]
        const importValue = importRow[header]

        // Get the value from page_content JSONB field, not direct database columns
        const dbValue = dbPage.page_content?.[dbField] || (dbPage as any)[dbField]

        // Skip comparison if the database field doesn't exist (undefined) or is null - this prevents
        // false positives where the page_snapshots table doesn't have all fields
        if (dbValue === undefined || dbValue === null) {
          if (pageId === '221892034283' && (header === 'Name' || header === 'Html Title')) {
            console.log(`Skipping field ${header} - not in database (${dbValue})`)
          }
          continue
        }

        // Debug: Log field comparison for our specific page
        if (pageId === '221892034283' && (header === 'Name' || header === 'Html Title')) {
          console.log(`Field: ${header} -> DB Field: ${dbField}`)
          console.log(`Import value: "${importValue}"`)
          console.log(`DB value: "${dbValue}"`)
          console.log(`Is DB empty: ${isEmptyOrNA(dbValue)}`)
          console.log(`Is Import empty: ${isEmptyOrNA(importValue)}`)
        }

        // Skip comparison only if BOTH values are empty - this allows detection of changes
        // when database has empty values but import has data (like new DRAFT pages)
        if (isEmptyOrNA(dbValue) && isEmptyOrNA(importValue)) {
          continue
        }

        let normalizedImportValue = normalizeForComparison(importValue)
        let normalizedDbValue = normalizeForComparison(dbValue)

        // Special handling for date formats - normalize timezone formats
        if (header === 'Archived At' || header === 'Publish Date') {
          // Normalize both values to the same timezone format
          normalizedImportValue = normalizedImportValue.replace(/Z$/, '+00:00')
          normalizedDbValue = normalizedDbValue.replace(/Z$/, '+00:00')
        }

        // Special handling for HubSpot's state values - normalize to common categories
        if (header === 'Current State' || header === 'State') {
          // Normalize import value
          const importStateUpper = normalizedImportValue.toUpperCase()
          if (
            importStateUpper === 'PUBLISHED_OR_SCHEDULED' ||
            importStateUpper === 'PUBLISHED_AB' ||
            importStateUpper === 'PUBLISHED_AB_VARIANT'
          ) {
            normalizedImportValue = 'published'
          } else if (
            importStateUpper === 'DRAFT_AB' ||
            importStateUpper === 'DRAFT_AB_VARIANT' ||
            importStateUpper === 'LOSER_AB_VARIANT'
          ) {
            normalizedImportValue = 'draft'
          } else if (importStateUpper === 'SCHEDULED_AB') {
            normalizedImportValue = 'scheduled'
          }

          // Normalize database value
          const dbStateUpper = normalizedDbValue.toUpperCase()
          if (
            dbStateUpper === 'PUBLISHED_OR_SCHEDULED' ||
            dbStateUpper === 'PUBLISHED_AB' ||
            dbStateUpper === 'PUBLISHED_AB_VARIANT'
          ) {
            normalizedDbValue = 'published'
          } else if (
            dbStateUpper === 'DRAFT_AB' ||
            dbStateUpper === 'DRAFT_AB_VARIANT' ||
            dbStateUpper === 'LOSER_AB_VARIANT'
          ) {
            normalizedDbValue = 'draft'
          } else if (dbStateUpper === 'SCHEDULED_AB') {
            normalizedDbValue = 'scheduled'
          }
        }

        // Compare the normalized values
        if (normalizedDbValue.toLowerCase() !== normalizedImportValue.toLowerCase()) {
          isModified = true
          modifiedFields[dbField] = {
            old: dbValue,
            new: importValue,
            header: header,
            dbField: dbField,
          }
          console.log(
            `Change detected for page ${pageId}, field ${header}: db="${dbValue}" -> import="${importValue}"`
          )
        }
      }

      if (isModified) {
        changes.push({
          pageId: pageId,
          name: importRow['Name'] || dbPage.name,
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
        backupId: latestBackupRun.backup_id,
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
