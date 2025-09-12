import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export const dynamic = 'force-dynamic'

type ColumnDefinition = { label: string; key: string }
type PageData = Record<string, any>

// List of supported snapshot fields and how to extract them from incoming row
const SNAPSHOT_FIELD_MAP: { header: string; dbKey: string }[] = [
  { header: 'Id', dbKey: 'hubspot_page_id' },
  { header: 'Content Type', dbKey: 'content_type' },
  { header: 'Name', dbKey: 'name' },
  { header: 'Url', dbKey: 'url' },
  { header: 'Html Title', dbKey: 'html_title' },
  { header: 'Meta Description', dbKey: 'meta_description' },
  { header: 'Slug', dbKey: 'slug' },
  { header: 'State', dbKey: 'state' },
  { header: 'Layout Sections', dbKey: 'layout_sections' },
  { header: 'Widgets', dbKey: 'widgets' },
  { header: 'Translations', dbKey: 'translations' },
  { header: 'PublicAccessRules', dbKey: 'public_access_rules' },
  { header: 'Archived At', dbKey: 'archived_at' },
  { header: 'Author Name', dbKey: 'author_name' },
  { header: 'Category Id', dbKey: 'category_id' },
  { header: 'Created By Id', dbKey: 'created_by_id' },
  { header: 'Publish Date', dbKey: 'publish_date' },
  { header: 'Published', dbKey: 'published' },
  { header: 'Updated At', dbKey: 'updated_at' },
  { header: 'Updated By Id', dbKey: 'updated_by_id' },
  { header: 'Current State', dbKey: 'current_state' },
]

function toCamel(label: string) {
  return label
    .split(/[_\s]+/)
    .map((w, i) =>
      i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join('')
}

function toSnake(s: string) {
  return s
    .replace(/\s+/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .replace(/__+/g, '_')
    .toLowerCase()
    .replace(/^_/, '')
}

function tryParseJSON(value: any) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }
  return value
}

function normalizeCellValue(v: any) {
  if (v === undefined || v === null) return null
  if (typeof v === 'string') {
    const t = v.trim()
    if (t === '' || t.toUpperCase() === 'EMPTY') return null
    if (t.toUpperCase() === 'TRUE') return true
    if (t.toUpperCase() === 'FALSE') return false
    return tryParseJSON(t)
  }
  return v
}

function getFieldValue(page: PageData, label: string, key: string) {
  if (!page) return null
  const candidates = [
    key,
    label,
    label.trim(),
    label.trim().toLowerCase(),
    label.trim().replace(/\s+/g, ''),
    toCamel(label),
    toSnake(label),
  ]
  for (const c of candidates) {
    if (c && Object.prototype.hasOwnProperty.call(page, c) && page[c] !== undefined) {
      return normalizeCellValue(page[c])
    }
  }
  return null
}

// chunk helper to avoid sending huge batch inserts at once
function chunkArray<T>(arr: T[], size = 500): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// Helper function to generate CSV content
function generateCSVContent(data: any[], headers: string[]): string {
  // Escape CSV values (handle commas, quotes, newlines)
  const escapeCSVValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    const stringValue = String(value)
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  // Create CSV header row
  const headerRow = headers.map(escapeCSVValue).join(',')

  // Create CSV data rows
  const dataRows = data.map(row => headers.map(header => escapeCSVValue(row[header])).join(','))

  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n')
}

export async function POST(request: Request) {
  const supabase = createClient()
  const user = await getAuthenticatedUser()

  try {
    const { data, columns, contentType = 'Landing Page' } = await request.json()
    if (!data || !columns) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: data or columns' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()

    // Build columns + headers (keeps original behavior)
    const columnsWithKeys: ColumnDefinition[] = columns.map((label: string) => {
      const key = label
        .split(' ')
        .map((word, i) =>
          i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join('')
      return { label, key }
    })
    const headers = ['Export Date', ...columnsWithKeys.map(c => c.label)]

    // Prepare rows for CSV
    const rows = data.map((row: PageData) => [
      timestamp,
      ...columnsWithKeys.map(({ label, key }) => {
        const value = getFieldValue(row, label, key)
        return typeof value === 'object' && value !== null ? JSON.stringify(value) : (value ?? '')
      }),
    ])

    // Generate CSV content
    const csvData = rows.map((row: any[]) => {
      const rowObj: any = {}
      headers.forEach((header, index) => {
        rowObj[header] = row[index]
      })
      return rowObj
    })

    const csvContent = generateCSVContent(csvData, headers)

    // Generate filename
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const contentTypeLabel = contentType.replace(/-/g, '_').replace(/\s+/g, '_').toLowerCase()
    const filename = `hubspot_${contentTypeLabel}_${data.length}_items_${date}.csv`

    // -------- Save structured backup (with history) --------
    if (Array.isArray(data) && data.length > 0) {
      const backupId = `csv_${contentTypeLabel}_${timestamp}`

      // Create snapshot rows that exactly match DB column names expected by detect-changes and the DB
      const snapshotRows = data.map((page: PageData) => {
        const row: Record<string, any> = {
          user_id: user.id,
          backup_id: backupId,
          sheet_id: `csv_${contentTypeLabel}`, // Use CSV identifier instead of sheet ID
          sheet_tab_name: 'default', // CSV files don't have tabs
          exported_at: timestamp,
          created_at: timestamp,
        }

        for (const { header, dbKey } of SNAPSHOT_FIELD_MAP) {
          const value = getFieldValue(page, header, dbKey)
          // normalize published -> boolean
          if (dbKey === 'published') {
            if (typeof value === 'string') {
              row[dbKey] =
                value.toUpperCase() === 'TRUE'
                  ? true
                  : value === '' || value.toUpperCase() === 'EMPTY'
                    ? null
                    : null
            } else {
              row[dbKey] = value ?? null
            }
          } else {
            row[dbKey] = value ?? null
          }
        }

        return row
      })

      // Insert in chunks to avoid huge payloads
      const chunks = chunkArray(snapshotRows, 500)
      for (const chunk of chunks) {
        const { error } = await supabase.from('page_snapshots').insert(chunk)
        if (error) console.error('Failed to save page snapshots chunk:', error)
      }
    }

    // Log the export activity
    const logData = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: user.id,
      action_type: 'export_csv',
      resource_type: 'export',
      resource_id: null,
      details: {
        export_type: 'csv',
        content_type: contentType,
        items_count: data.length,
        columns_exported: columns,
        filename,
        file_size_bytes: new Blob([csvContent]).size,
        timestamp,
        status: 'success',
      },
      created_at: timestamp,
    }

    const { error: logError } = await supabase.from('audit_logs').insert(logData)
    if (logError) console.error('Failed to log export activity:', logError)

    return NextResponse.json({
      success: true,
      message: `Exported ${Array.isArray(data) ? data.length : 0} rows to CSV and saved backup`,
      rowsAdded: Array.isArray(data) ? data.length : 0,
      csvContent,
      filename,
      backupId: `csv_${contentTypeLabel}_${timestamp}`,
    })
  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json({ success: false, error: 'Failed to export to CSV' }, { status: 500 })
  }
}
