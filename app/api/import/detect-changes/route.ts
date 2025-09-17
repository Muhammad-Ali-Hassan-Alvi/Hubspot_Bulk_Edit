// FILE: /api/import/detect-changes/route.ts (Database Backup Comparison)

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

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

const normalizeForComparison = (value: any): string => {
  if (isEmptyOrNA(value)) {
    return ''
  }
  if (typeof value === 'object') {
    if (Array.isArray(value) && value.length === 0) return '[]'
    if (Object.keys(value).length === 0) return '{}'
    return JSON.stringify(value)
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
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

    if (importType === 'sheets' && !contentType) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: contentType for sheets import.' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const user = await getAuthenticatedUser()
    if (user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let latestBackupRun: any = null
    let backupIdError: any = null

    if (importType === 'csv') {
      // Make the query specific to the content type
      // Try both underscore and hyphen versions to handle different content type formats
      const normalizedContentTypeUnderscore =
        contentType?.toLowerCase().replace(/\s+/g, '_') || 'landing_page'
      const normalizedContentTypeHyphen =
        contentType?.toLowerCase().replace(/\s+/g, '-') || 'landing-page'

      // First try underscore version (most common)
      let query = supabase
        .from('page_snapshots')
        .select('backup_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .like('backup_id', `csv_${normalizedContentTypeUnderscore}_%`)

      let result = await query.single()
      latestBackupRun = result.data
      backupIdError = result.error

      // If not found, try hyphen version
      if (backupIdError || !latestBackupRun) {
        query = supabase
          .from('page_snapshots')
          .select('backup_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .like('backup_id', `csv_${normalizedContentTypeHyphen}_%`)

        result = await query.single()
        latestBackupRun = result.data
        backupIdError = result.error
      }

      // If still not found, try any CSV backup for this user
      if (backupIdError || !latestBackupRun) {
        query = supabase
          .from('page_snapshots')
          .select('backup_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .like('backup_id', 'csv_%')

        result = await query.single()
        latestBackupRun = result.data
        backupIdError = result.error
      }
    } else {
      // For sheets, look for non-CSV backups
      const query = supabase
        .from('page_snapshots')
        .select('backup_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .not('backup_id', 'like', 'csv_%')

      const result = await query.single()
      latestBackupRun = result.data
      backupIdError = result.error
    }

    if (backupIdError || !latestBackupRun) {
      return NextResponse.json(
        {
          success: false,
          error: `No database backup found for content type "${contentType}". Please export your data first.`,
        },
        { status: 404 }
      )
    }

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
    console.log('Field mapping:', fieldsToCompare)
    console.log('Available headers:', headers)
    console.log(
      `Processing ${importData.length} import records against ${dbBackupData.length} snapshot records (${importType})`
    )

    // Note: importPageIds and dbPageIds calculations removed as they were unused

    const changes = []

    for (const importRow of importData) {
      const pageId = importRow['Id']
      if (!pageId) {
        continue
      }

      const dbPage = dbDataMap.get(String(pageId))
      if (!dbPage) {
        const newPageChanges: { [key: string]: any } = {}
        let hasChanges = false

        for (const header in fieldsToCompare) {
          const dbField = fieldsToCompare[header]
          const importValue = importRow[header]

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

      const modifiedFields: { [key: string]: any } = {}
      let isModified = false

      for (const header in fieldsToCompare) {
        const dbField = fieldsToCompare[header]
        const importValue = importRow[header]

        const dbValue = (dbPage as any)[dbField]

        // Debug domain, campaign, and slug fields specifically
        if (
          header.toLowerCase().includes('domain') ||
          header.toLowerCase().includes('campaign') ||
          header.toLowerCase().includes('slug')
        ) {
          console.log(`Comparing ${header}:`, {
            importValue,
            dbValue,
            dbField,
            pageId,
            allDbFields: Object.keys(dbPage || {}),
          })
        }

        // Handle missing fields - treat as new field if import has value
        if (dbValue === undefined || dbValue === null) {
          if (!isEmptyOrNA(importValue)) {
            console.log(`New field detected: ${header} with value: ${importValue}`)
            modifiedFields[dbField] = {
              oldValue: null,
              newValue: importValue,
            }
            isModified = true
          }
          continue
        }

        if (isEmptyOrNA(dbValue) && isEmptyOrNA(importValue)) {
          continue
        }

        let normalizedImportValue = normalizeForComparison(importValue)
        let normalizedDbValue = normalizeForComparison(dbValue)

        if (header === 'Archived At' || header === 'Publish Date') {
          normalizedImportValue = normalizedImportValue.replace(/Z$/, '+00:00')
          normalizedDbValue = normalizedDbValue.replace(/Z$/, '+00:00')
        }

        if (header === 'Current State' || header === 'State') {
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

        if (normalizedDbValue.toLowerCase() !== normalizedImportValue.toLowerCase()) {
          isModified = true
          modifiedFields[dbField] = {
            old: dbValue,
            new: importValue,
            header: header,
            dbField: dbField,
          }
        }
      }

      if (isModified) {
        changes.push({
          pageId: pageId,
          name: importRow['Name'] || (dbPage as any).name || `Page ${pageId}`,
          type: 'modified',
          fields: modifiedFields,
        })
      }
    }

    const totalChanges = changes.reduce((acc, item) => acc + Object.keys(item.fields).length, 0)
    console.log(
      `Change detection complete: ${changes.length}/${importData.length} items have changes (${totalChanges} total field changes)`
    )

    return NextResponse.json({
      success: true,
      changes,
      summary: {
        totalItems: importData.length,
        itemsWithChanges: changes.length,
        totalChanges,
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
