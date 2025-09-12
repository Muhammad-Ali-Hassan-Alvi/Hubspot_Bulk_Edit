import { createClient } from '@/lib/supabase/server'

/**
 * Convert header label to camelCase database key
 * This replaces the hardcoded SNAPSHOT_FIELD_MAP with dynamic mapping
 */
function headerToDbKey(header: string): string {
  return header
    .split(' ')
    .map((word, i) =>
      i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('')
}

export type PageData = Record<string, any>

/**
 * Convert label to camelCase
 */
export function toCamel(label: string): string {
  return label
    .split(/[_\s]+/)
    .map((w, i) =>
      i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join('')
}

/**
 * Convert string to snake_case
 */
export function toSnake(s: string): string {
  return s
    .replace(/\s+/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .replace(/__+/g, '_')
    .toLowerCase()
    .replace(/^_/, '')
}

/**
 * Try to parse JSON from string value
 */
export function tryParseJSON(value: any): any {
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

/**
 * Normalize cell value for export
 */
export function normalizeCellValue(v: any): any {
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

/**
 * Get field value from page data with multiple fallback strategies
 */
export function getFieldValue(page: PageData, label: string, key: string): any {
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

/**
 * Chunk array into smaller arrays to avoid huge batch inserts
 */
export function chunkArray<T>(arr: T[], size = 500): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Save structured backup to page_snapshots table
 */
export async function saveStructuredBackup(
  data: PageData[],
  userId: string,
  backupId: string,
  sheetId?: string,
  tabName?: string
): Promise<void> {
  if (!Array.isArray(data) || data.length === 0) return

  const supabase = createClient()
  const timestamp = new Date().toISOString()

  // Create snapshot rows that store data in page_content JSONB field
  const snapshotRows = data.map((page: PageData) => {
    const pageContent: Record<string, any> = {}
    
    // Extract data dynamically from all available fields in the page data
    for (const [header, value] of Object.entries(page)) {
      const dbKey = headerToDbKey(header)
      
      // normalize published -> boolean
      if (dbKey === 'published') {
        if (typeof value === 'string') {
          pageContent[dbKey] =
            value.toUpperCase() === 'TRUE'
              ? true
              : value === '' || value.toUpperCase() === 'EMPTY'
                ? null
                : null
        } else {
          pageContent[dbKey] = value ?? null
        }
      } else {
        pageContent[dbKey] = value ?? null
      }
    }

    // Create the database row with proper structure
    const row: Record<string, any> = {
      user_id: userId,
      backup_id: backupId,
      exported_at: timestamp,
      created_at: timestamp,
      page_content: pageContent, // Store all field data in JSONB field
    }

    // Add sheet-specific fields if provided
    if (sheetId) {
      row.sheet_id = sheetId
      row.sheet_tab_name = tabName ?? 'default'
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
