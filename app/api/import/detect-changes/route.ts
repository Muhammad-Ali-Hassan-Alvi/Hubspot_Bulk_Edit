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
    // --- FIX #1: Receive the contentType from the frontend request ---
    const { userId, importData, contentType, importType = 'sheets' } = await request.json()

    if (!userId || !importData || !Array.isArray(importData) || importData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty required fields.' },
        { status: 400 }
      )
    }

    // --- Add validation for the new contentType field ---
    if (importType === 'csv' && !contentType) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: contentType for CSV import.' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const user = await getAuthenticatedUser()
    if (user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // --- FIX #2: Normalize contentType to match the format in backup_id ---
    // e.g., "Landing Pages" -> "landing_pages"
    const normalizedContentType = contentType
      .replace(/-/g, ' ') // handles "landing-pages"
      .replace(/\s+/g, '_') // handles "landing pages"
      .toLowerCase()

    // Get the latest backup to compare against for the *specific content type*
    let query = supabase
      .from('page_snapshots')
      .select('backup_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    // For CSV imports, look for CSV backups that match the content type
    if (importType === 'csv') {
      // --- FIX #3: Make the query specific to the content type ---
      // OLD: query = query.like('backup_id', 'csv_%')
      query = query.like('backup_id', `csv_${normalizedContentType}_%`)
    } else {
      // Assuming sheets logic is different and might not need this change yet
      query = query.not('backup_id', 'like', 'csv_%')
    }

    const { data: latestBackupRun, error: backupIdError } = await query.single()

    if (backupIdError || !latestBackupRun) {
      return NextResponse.json(
        {
          success: false,
          error: `No database backup found for content type "${contentType}". Please export your data first.`,
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
    // DYNAMIC FIELD MAPPING (This part is correct)
    // =================================================================
    const headers = Object.keys(importData[0])
    const ignoreList = ['Id', 'Export Date', 'Created At', 'Updated At']
    const fieldsToCompare: { [key: string]: string } = {}

    for (const header of headers) {
      if (ignoreList.some(itemToIgnore => itemToIgnore.toLowerCase() === header.toLowerCase())) {
        continue
      }
      const dbField = header.replace(/\s+/g, '_').toLowerCase()
      fieldsToCompare[header] = dbField
    }
    
    // ... (rest of the file is the same as the previous correct version)
    
    console.log('=== DEBUG INFO ===')
    // ... (your debugging logs)

    const changes = []

    for (const importRow of importData) {
      const pageId = importRow['Id']
      if (!pageId) {
        continue
      }

      const dbPage = dbDataMap.get(String(pageId))
      if (!dbPage) {
        // ... (new page logic - no changes needed here)
        continue
      }
      
      const modifiedFields: { [key: string]: any } = {}
      let isModified = false

      for (const header in fieldsToCompare) {
        const dbField = fieldsToCompare[header]
        const importValue = importRow[header]
        const dbValue = dbPage.page_content?.[dbField] || (dbPage as any)[dbField]

        if (isEmptyOrNA(dbValue) && isEmptyOrNA(importValue)) {
          continue
        }

        let normalizedImportValue = normalizeForComparison(importValue)
        let normalizedDbValue = normalizeForComparison(dbValue)

        if (header === 'Archived At' || header === 'Publish Date') {
          normalizedImportValue = normalizedImportValue.replace(/Z$/, '+00:00')
          normalizedDbValue = normalizedDbValue.replace(/Z$/, '+00:00')
        }
        
        // ... (state normalization logic)

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