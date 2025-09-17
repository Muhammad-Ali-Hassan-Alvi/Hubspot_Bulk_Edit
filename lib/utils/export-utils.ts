import { createClient } from '@/lib/supabase/server'

export type PageData = Record<string, any>

export function toCamel(label: string): string {
  return label
    .split(/[_\s]+/)
    .map((w, i) =>
      i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join('')
}

export function toSnake(s: string): string {
  return s
    .replace(/\s+/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .replace(/__+/g, '_')
    .toLowerCase()
    .replace(/^_/, '')
}

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

export function chunkArray<T>(arr: T[], size = 500): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

let headerDefinitionsCache: Record<string, string> | null = null

async function getHeaderDefinitions(supabase: any): Promise<Record<string, string>> {
  if (headerDefinitionsCache) {
    return headerDefinitionsCache
  }

  const { data: headerDefs, error } = await supabase
    .from('header_definitions')
    .select('api_name, display_name')

  if (error) {
    return {}
  }

  // Get actual table schema dynamically - use raw SQL query
  const { data: tableColumns, error: columnError } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'page_snapshots')
    .eq('table_schema', 'public')

  let availableColumns: Set<string>

  if (columnError || !tableColumns) {
    // Fallback to hardcoded columns if query fails
    availableColumns = new Set([
      'user_id',
      'backup_id',
      'exported_at',
      'created_at',
      'sheet_id',
      'sheet_tab_name',
      'hubspot_page_id',
      'url',
      'name',
      'slug',
      'state',
      'html_title',
      'meta_description',
      'published',
      'archived_at',
      'author_name',
      'category_id',
      'content_type',
      'created_by_id',
      'publish_date',
      'updated_at',
      'updated_by_id',
      'current_state',
      'widgets',
      'layout_sections',
      'translations',
      'public_access_rules',
      'archived_in_dashboard',
      'attached_stylesheets',
      'content_type_category',
      'featured_image',
      'featured_image_alt_text',
      'link_rel_canonical_url',
      'page_redirected',
      'public_access_rules_enabled',
      'publish_immediately',
      'subcategory',
      'template_path',
      'use_featured_image',
      'widget_containers',
      'domain',
      'campaign',
      'page_expiry_enabled',
    ])
  } else {
    // Extract column names from the table info
    availableColumns = new Set(tableColumns.map((col: any) => col.column_name))
  }

  const mapping: Record<string, string> = {}
  for (const def of headerDefs || []) {
    const columnName = def.display_name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')

    if (availableColumns.has(columnName)) {
      mapping[def.api_name] = columnName
    }
  }

  // Add manual mappings for fields that don't exist in header_definitions
  mapping['id'] = 'hubspot_page_id'
  mapping['Id'] = 'hubspot_page_id'
  mapping['contentType'] = 'content_type'
  mapping['Content Type'] = 'content_type'
  mapping['pageExpiryEnabled'] = 'page_expiry_enabled'
  mapping['Page Expiry Enabled'] = 'page_expiry_enabled'

  // Add mappings for CSV display names (with spaces) to snake_case columns
  const csvFieldMappings: Record<string, string> = {
    'Archived At': 'archived_at',
    'Archived In Dashboard': 'archived_in_dashboard',
    'Attached Stylesheets': 'attached_stylesheets',
    'Author Name': 'author_name',
    Campaign: 'campaign',
    'Category Id': 'category_id',
    'Content Type Category': 'content_type_category',
    'Created At': 'created_at',
    'Created By Id': 'created_by_id',
    'Current State': 'current_state',
    Domain: 'domain',
    'Featured Image': 'featured_image',
    'Featured Image Alt Text': 'featured_image_alt_text',
    'Html Title': 'html_title',
    'Layout Sections': 'layout_sections',
    'Link Rel Canonical Url': 'link_rel_canonical_url',
    'Meta Description': 'meta_description',
    Name: 'name',
    'Page Redirected': 'page_redirected',
    'Public Access Rules': 'public_access_rules',
    'Public Access Rules Enabled': 'public_access_rules_enabled',
    'Publish Date': 'publish_date',
    'Publish Immediately': 'publish_immediately',
    Published: 'published',
    Slug: 'slug',
    State: 'state',
    Subcategory: 'subcategory',
    'Template Path': 'template_path',
    Translations: 'translations',
    'Updated At': 'updated_at',
    'Updated By Id': 'updated_by_id',
    Url: 'url',
    'Use Featured Image': 'use_featured_image',
    'Widget Containers': 'widget_containers',
    Widgets: 'widgets',
  }

  // Add CSV field mappings to the main mapping
  for (const [displayName, columnName] of Object.entries(csvFieldMappings)) {
    if (availableColumns.has(columnName)) {
      mapping[displayName] = columnName
    }
  }

  headerDefinitionsCache = mapping
  return mapping
}

export async function saveStructuredBackup(
  data: PageData[],
  userId: string,
  backupId: string,
  sheetId?: string,
  tabName?: string
): Promise<void> {
  if (!Array.isArray(data) || data.length === 0) {
    return
  }

  const supabase = createClient()
  const timestamp = new Date().toISOString()

  const mapping = await getHeaderDefinitions(supabase)

  const snapshotRows = data.map((page: PageData) => {
    const row: Record<string, any> = {
      user_id: userId,
      backup_id: `${backupId}_${Date.now()}`,
      exported_at: timestamp,
      created_at: timestamp,
    }

    for (const [header, value] of Object.entries(page)) {
      const columnName = mapping[header]

      if (columnName) {
        // Handle boolean fields that might be empty strings
        const booleanFields = [
          'published',
          'archived_in_dashboard',
          'page_redirected',
          'public_access_rules_enabled',
          'publish_immediately',
          'use_featured_image',
          'page_expiry_enabled',
        ]

        if (booleanFields.includes(columnName)) {
          if (typeof value === 'string') {
            const trimmed = value.trim().toUpperCase()
            if (trimmed === 'TRUE' || trimmed === '1') {
              row[columnName] = true
            } else if (trimmed === 'FALSE' || trimmed === '0') {
              row[columnName] = false
            } else if (trimmed === '' || trimmed === 'EMPTY') {
              row[columnName] = null
            } else {
              row[columnName] = null
            }
          } else if (typeof value === 'boolean') {
            row[columnName] = value
          } else {
            row[columnName] = null
          }
        } else {
          row[columnName] = value ?? null
        }
      }
    }

    if (sheetId) {
      row.sheet_id = sheetId
      row.sheet_tab_name = tabName ?? 'default'
    }

    return row
  })

  const chunks = chunkArray(snapshotRows, 500)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]

    // For each row, first delete any existing record with the same hubspot_page_id
    // then insert the new record
    for (const row of chunk) {
      // Only delete if this is an existing page + sheet + tab combination
      // Check if a record already exists for this hubspot_page_id + sheet_id + sheet_tab_name
      const { data: existingRecord } = await supabase
        .from('page_snapshots')
        .select('id')
        .eq('hubspot_page_id', row.hubspot_page_id)
        .eq('sheet_id', row.sheet_id)
        .eq('sheet_tab_name', row.sheet_tab_name)
        .eq('user_id', row.user_id)
        .single()

      // If record exists, delete it first
      if (existingRecord) {
        await supabase.from('page_snapshots').delete().eq('id', existingRecord.id)
      }

      // Insert the new record
      const { error } = await supabase.from('page_snapshots').insert([row])

      if (error) {
        console.error('Failed to save page snapshot:', error)
        throw error
      }
    }
  }
}
