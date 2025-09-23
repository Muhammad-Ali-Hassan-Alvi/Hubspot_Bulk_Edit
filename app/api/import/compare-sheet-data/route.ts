import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { UserExportStatusEnum } from '@/lib/constants'

interface FieldChange {
  id: string
  field: string
  originalValue: any
  newValue: any
  hasChanged: boolean
}

interface ComparisonResult {
  totalRows: number
  changedRows: number
  fieldChanges: FieldChange[]
  summary: {
    [fieldName: string]: {
      totalChanges: number
      sampleChanges: Array<{
        id: string
        from: any
        to: any
      }>
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { contentTypeId, sheetId, tabId } = await request.json()

    // Validate required fields
    if (!contentTypeId || !sheetId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: contentTypeId and sheetId' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Get content type info to fetch headers configuration
    const { data: contentType, error: contentTypeError } = await supabase
      .from('content_types')
      .select('slug')
      .eq('id', contentTypeId)
      .single()

    if (contentTypeError || !contentType) {
      return NextResponse.json({ success: false, error: 'Invalid content type' }, { status: 400 })
    }

    // Fetch headers configuration to get editable fields only
    const headersBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`
    const headersResponse = await fetch(
      `${headersBaseUrl}/api/hubspot/headers?contentType=${contentType.slug}&readOnly=false`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      }
    )

    if (!headersResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch headers configuration' },
        { status: 500 }
      )
    }

    const headersResult = await headersResponse.json()
    if (!headersResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to get headers: ' + headersResult.error },
        { status: 500 }
      )
    }

    // Get list of editable field names (non-read-only)
    const editableFields = new Set<string>(headersResult.headers.map((header: any) => header.key))
    console.log('Editable fields (non-read-only):', Array.from(editableFields))

    // Find the most recent export for this content type, sheet, and tab
    // Supabase/PostgREST automatically looks at the foreign key relationship.
    // If user_export_snapshots.user_export_id → user_exports.id exists, then Supabase knows how to fetch child rows (snapshots) for each user_export.
    // You don’t need to manually add a .eq('user_export_snapshots.user_export_id',

    let query = supabase
      .from('user_exports')
      .select(
        `
        id,
        created_at,
        user_export_snaphots (
          id,
          snapshot_json,
          version_number
        )
      `
      )
      .eq('user_id', user.id)
      .eq('content_type_id', contentTypeId)
      .eq('sheet_id', sheetId)
      .eq('status', UserExportStatusEnum.ACTIVE)
      .order('created_at', { ascending: false })
      .limit(1)

    // Add tab filter if provided
    if (tabId) {
      query = query.eq('tab_id', tabId)
    }

    const { data: exportData, error: exportError } = await query

    if (exportError) {
      console.error('Error fetching export data:', exportError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch export data' },
        { status: 500 }
      )
    }

    if (!exportData || exportData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No previous export found for this sheet and content type' },
        { status: 404 }
      )
    }

    const exportRecord = exportData[0]
    const snapshots = exportRecord.user_export_snaphots

    if (!snapshots || snapshots.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No snapshot data found for this export' },
        { status: 404 }
      )
    }

    // Get the latest snapshot
    const latestSnapshot = snapshots.sort((a, b) => b.version_number - a.version_number)[0]
    const originalData = latestSnapshot.snapshot_json as any[]

    // Fetch current sheet data
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`
    const sheetDataResponse = await fetch(
      `${baseUrl}/api/google/sheets/${sheetId}/data${tabId ? `?tabId=${tabId}` : ''}`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      }
    )

    if (!sheetDataResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch current sheet data' },
        { status: 500 }
      )
    }

    const sheetDataResult = await sheetDataResponse.json()

    if (!sheetDataResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to get sheet data: ' + sheetDataResult.error },
        { status: 500 }
      )
    }

    const currentSheetData = sheetDataResult.data as any[]

    // Map sheet field names to DB field names
    const mappedSheetData = currentSheetData.map(mapSheetFieldsToDbFields)

    // Compare the data and find changes (only for editable fields)
    const comparison = compareDataSets(originalData, mappedSheetData, editableFields)

    return NextResponse.json({
      success: true,
      comparison,
      exportInfo: {
        exportId: exportRecord.id,
        exportDate: exportRecord.created_at,
        snapshotId: latestSnapshot.id,
        versionNumber: latestSnapshot.version_number,
      },
      debug: {
        originalDataSample: originalData.slice(0, 2), // First 2 records for debugging
        currentDataSample: currentSheetData.slice(0, 2), // First 2 records for debugging
        originalDataCount: originalData.length,
        currentDataCount: currentSheetData.length,
      },
    })
  } catch (error) {
    console.error('Import comparison API error:', error)
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred' },
      { status: 500 }
    )
  }
}

// Reverse the export logic: convert readable sheet headers back to camelCase
function convertReadableHeaderToCamelCase(readableHeader: string): string {
  // Reverse the logic from export: "Html Title" -> "htmlTitle"
  return readableHeader
    .split(' ')
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('')
}

function mapSheetFieldsToDbFields(sheetRow: any): any {
  const mappedRow: any = {}

  for (const [sheetField, value] of Object.entries(sheetRow)) {
    // Skip internal fields like _rowIndex
    if (sheetField.startsWith('_')) continue

    // Convert readable header back to camelCase
    const dbField = convertReadableHeaderToCamelCase(sheetField)

    // Skip export metadata fields
    if (dbField.startsWith('_')) continue

    // Convert string boolean values to actual booleans
    if (typeof value === 'string') {
      if (value === 'TRUE') {
        mappedRow[dbField] = true
      } else if (value === 'FALSE') {
        mappedRow[dbField] = false
      } else if (value === '') {
        // Empty strings become empty strings (not null) to match export format
        mappedRow[dbField] = ''
      } else {
        mappedRow[dbField] = value
      }
    } else {
      mappedRow[dbField] = value
    }
  }

  return mappedRow
}

function compareDataSets(
  originalData: any[],
  currentData: any[],
  editableFields: Set<string>
): ComparisonResult {
  const fieldChanges: FieldChange[] = []
  const summary: ComparisonResult['summary'] = {}

  // Create a map of original data by ID for efficient lookup
  const originalMap = new Map(originalData.map(item => [item.id || item.ID, item]))

  let changedRows = 0

  for (const currentItem of currentData) {
    const id = currentItem.id || currentItem.ID
    if (!id) {
      console.log('Skipping item without ID:', currentItem)
      continue
    }

    const originalItem = originalMap.get(id)
    if (!originalItem) {
      console.log('No original item found for ID:', id)
      continue
    }

    let rowHasChanges = false

    // Compare each field (only editable fields)
    for (const [field, currentValue] of Object.entries(currentItem)) {
      if (field === 'id' || field === 'ID') continue

      // Skip read-only fields - only compare editable fields
      if (!editableFields.has(field)) {
        console.log(`Skipping read-only field: ${field}`)
        continue
      }

      const originalValue = originalItem[field]

      // Normalize values for comparison (handle empty strings, null, undefined)
      const normalizedOriginal = normalizeValue(originalValue)
      const normalizedCurrent = normalizeValue(currentValue)

      const hasChanged = normalizedOriginal !== normalizedCurrent

      if (hasChanged) {
        rowHasChanges = true

        fieldChanges.push({
          id: id.toString(),
          field,
          originalValue: originalValue,
          newValue: currentValue,
          hasChanged: true,
        })

        // Update summary
        if (!summary[field]) {
          summary[field] = {
            totalChanges: 0,
            sampleChanges: [],
          }
        }

        summary[field].totalChanges++

        // Add to sample changes (limit to 5 samples per field)
        if (summary[field].sampleChanges.length < 5) {
          summary[field].sampleChanges.push({
            id: id.toString(),
            from: originalValue,
            to: currentValue,
          })
        }
      }
    }

    if (rowHasChanges) {
      changedRows++
    }
  }

  console.log('Total field changes found:', fieldChanges.length)
  console.log('Changed rows:', changedRows)

  return {
    totalRows: currentData.length,
    changedRows,
    fieldChanges,
    summary,
  }
}

function normalizeValue(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value).trim()
}
