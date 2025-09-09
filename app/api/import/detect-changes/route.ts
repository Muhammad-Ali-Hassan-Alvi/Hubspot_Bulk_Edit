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
    return true;
  }
  if (typeof value === 'string') {
    const trimmedValue = value.trim().toLowerCase();
    return trimmedValue === '' || trimmedValue === 'n/a' || trimmedValue === 'undefined' || trimmedValue === 'null';
  }
  return false;
};

/**
 * Normalizes a value for a consistent string-based comparison.
 * Handles objects, arrays, booleans, and empty values.
 * @param value The value to normalize.
 * @returns string
 */
const normalizeForComparison = (value: any): string => {
  if (isEmptyOrNA(value)) {
    return ""; // Represent all empty-like values as an empty string
  }
  // For objects and arrays, stringify them for a consistent comparison
  if (typeof value === 'object') {
    // Handle Supabase's empty array/object representation vs sheet's string version
    if (Array.isArray(value) && value.length === 0) return '[]';
    if (Object.keys(value).length === 0) return '{}';
    return JSON.stringify(value);
  }
  // Convert booleans to lowercase strings
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  // For everything else, convert to string and trim
  return String(value).trim();
};

export async function POST(request: NextRequest) {
  try {
    const { userId, importData, sheetId, tabName } = await request.json()

    if (!userId || !importData || !Array.isArray(importData) || !sheetId || !tabName || importData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty required fields.' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const user = await getAuthenticatedUser()
    if (user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get the latest backup to compare against
    const { data: latestBackupRun, error: backupIdError } = await supabase
      .from('hubspot_page_backups')
      .select('backup_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (backupIdError || !latestBackupRun) {
      return NextResponse.json({
        success: false,
        error: 'No database backup found to compare against. Please export your data first.',
      }, { status: 404 })
    }

    // Get the backup data
    const { data: dbBackupData, error: dbError } = await supabase
      .from('hubspot_page_backups')
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
    const headers = Object.keys(importData[0]);
    
    // These fields should be ignored during comparison because they are metadata
    // or the primary key itself.
    const ignoreList = ['Id', 'Export Date', 'Created At', 'Updated At'];

    const fieldsToCompare: { [key: string]: string } = {};

    for (const header of headers) {
      if (ignoreList.some(itemToIgnore => itemToIgnore.toLowerCase() === header.toLowerCase())) {
            continue;
        }
        // Convert "Sheet Header Name" to "database_column_name"
        const dbField = header.replace(/\s+/g, '_').toLowerCase();
        fieldsToCompare[header] = dbField;
    }
    // =================================================================
    // END: DYNAMIC FIELD MAPPING
    // =================================================================

    const changes = [];

    for (const sheetRow of importData) {
      // HubSpot uses 'Id' from the export, but the DB column is hubspot_page_id
      const pageId = sheetRow['Id'] 
      if (!pageId) continue

      const dbPage = dbDataMap.get(String(pageId))
      if (!dbPage) {
        console.log(`No backup data found for page ID: ${pageId}`)
        continue
      }

      const modifiedFields: { [key:string]: any } = {}
      let isModified = false

      // Compare each dynamically mapped field
      for (const header in fieldsToCompare) {
        const dbField = fieldsToCompare[header];
        const sheetValue = sheetRow[header];
        const dbValue = (dbPage as any)[dbField];

        // The logic from the previous fix: if the DB has no value, don't flag it as a change.
        if (isEmptyOrNA(dbValue)) {
            continue;
        }

        let normalizedSheetValue = normalizeForComparison(sheetValue);
        let normalizedDbValue = normalizeForComparison(dbValue);

        // Special handling for HubSpot's inconsistent state values
        if (header === 'Current State' || header === 'State') {
            if (normalizedSheetValue.toUpperCase() === 'PUBLISHED_OR_SCHEDULED') {
                normalizedSheetValue = 'published';
            }
            if (normalizedDbValue.toUpperCase() === 'PUBLISHED_OR_SCHEDULED') {
                normalizedDbValue = 'published';
            }
        }
        
        // Compare the normalized values
        if (normalizedDbValue.toLowerCase() !== normalizedSheetValue.toLowerCase()) {
           isModified = true;
           modifiedFields[dbField] = {
             old: dbValue,
             new: sheetValue,
             header: header,
             dbField: dbField,
           };
           console.log(`Change detected for page ${pageId}, field ${header}: db="${dbValue}" -> sheet="${sheetValue}"`);
        }
      }

      if (isModified) {
        changes.push({
          pageId: pageId,
          name: sheetRow['Name'] || dbPage.name,
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