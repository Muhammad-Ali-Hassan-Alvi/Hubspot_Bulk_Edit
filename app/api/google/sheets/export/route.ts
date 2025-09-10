import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getServerUserSettings } from '@/lib/store/serverUtils'

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
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
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
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try { return JSON.parse(trimmed) } catch { return value }
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

async function refreshAccessTokenIfNeeded(userSettings: any, supabase: ReturnType<typeof createClient>, userId: string) {
  let accessToken = userSettings.google_access_token
  const refreshToken = userSettings.google_refresh_token
  const expiresAt = userSettings.google_token_expires_at ? new Date(userSettings.google_token_expires_at) : null
  const now = new Date()
  if (expiresAt && now >= expiresAt && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    oauth2Client.setCredentials({ refresh_token: refreshToken })
    try {
      // modern googleapis uses getAccessToken / refreshAccessToken depending on version. `refreshAccessToken` may be deprecated,
      // but here we call the method that returns credentials.
      // Use any available method and fall back gracefully.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const res = await oauth2Client.refreshAccessToken?.() ?? await oauth2Client.getAccessToken()
      // res may be a token string or an object with credentials depending on client version
      // normalize it
      const credentials = (res && (res as any).credentials) ? (res as any).credentials : oauth2Client.credentials
      accessToken = credentials.access_token ?? accessToken
      const expiry = credentials.expiry_date ?? credentials.expires_at ?? null
      await supabase.from('user_settings').update({
        google_access_token: accessToken,
        google_token_expires_at: expiry ? new Date(expiry).toISOString() : null,
      }).eq('user_id', userId)
    } catch (err) {
      console.error('Token refresh failed:', err)
      throw new Error('Token refresh failed')
    }
  }
  return accessToken
}

// chunk helper to avoid sending huge batch inserts at once
function chunkArray<T>(arr: T[], size = 500): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function POST(request: Request) {
  const supabase = createClient()
  const user = await getAuthenticatedUser()

  try {
    const { sheetId, data, columns, tabName } = await request.json()
    if (!sheetId || !data || !columns) {
      return NextResponse.json({ success: false, error: 'Missing required fields: sheetId, data, or columns' }, { status: 400 })
    }

    const userSettings = await getServerUserSettings(user.id)
    if (!userSettings?.google_access_token) {
      return NextResponse.json({ success: false, error: 'Google Sheets not connected' }, { status: 400 })
    }

    // Ensure access token is valid (refresh if expired)
    let accessToken = await refreshAccessTokenIfNeeded(userSettings, supabase, user.id)

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    const sheets = google.sheets({ version: 'v4', auth })

    const timestamp = new Date().toISOString()

    // Build columns + headers (keeps original behavior)
    const columnsWithKeys: ColumnDefinition[] = columns.map((label: string) => {
      const key = label.split(' ')
        .map((word, i) => (i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
        .join('')
      return { label, key }
    })
    const headers = ['Export Date', ...columnsWithKeys.map(c => c.label)]

    // Prepare rows for Google Sheets
    const rows = data.map((row: PageData) => [
      timestamp,
      ...columnsWithKeys.map(({ label, key }) => {
        const value = getFieldValue(row, label, key)
        return typeof value === 'object' && value !== null ? JSON.stringify(value) : (value ?? '')
      }),
    ])

    // Handle target sheet/tab
    let targetSheetId = 0
    let sheetRangePrefix = ''
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
    const existingSheets = spreadsheetInfo.data.sheets ?? []
    if (tabName) {
      const matchedSheet = existingSheets.find(
        s => s.properties?.title?.toLowerCase() === tabName.toLowerCase()
      )
      if (matchedSheet) {
        targetSheetId = matchedSheet.properties?.sheetId ?? 0
        sheetRangePrefix = `'${tabName}'!`
      } else {
        const addSheetRes = await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] },
        })
        const addedSheet = addSheetRes.data.replies?.[0]?.addSheet?.properties
        targetSheetId = addedSheet?.sheetId ?? 0
        sheetRangePrefix = `'${tabName}'!`
      }
    }

    // Clear and insert new data
    await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: `${sheetRangePrefix}A:Z` })
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetRangePrefix}A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers, ...rows] },
    })
    // Style header row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{
          repeatCell: {
            range: { sheetId: targetSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
            cell: { userEnteredFormat: { backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }, textFormat: { bold: true } } },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }
        }]
      }
    })

    // -------- Save structured backup (with history) --------
    if (Array.isArray(data) && data.length > 0) {
      const backupId = `${sheetId}_${tabName ?? 'default'}_${timestamp}`

      // Create snapshot rows that exactly match DB column names expected by detect-changes and the DB
      const snapshotRows = data.map((page: PageData) => {
        const row: Record<string, any> = {
          user_id: user.id,
          backup_id: backupId,
          sheet_id: sheetId,
          sheet_tab_name: tabName ?? 'default',
          exported_at: timestamp,
          created_at: timestamp,
        }

        for (const { header, dbKey } of SNAPSHOT_FIELD_MAP) {
          const value = getFieldValue(page, header, dbKey)
          // normalize published -> boolean
          if (dbKey === 'published') {
            if (typeof value === 'string') {
              row[dbKey] = value.toUpperCase() === 'TRUE' ? true : (value === '' || value.toUpperCase() === 'EMPTY' ? null : null)
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

    return NextResponse.json({
      success: true,
      message: `Exported ${Array.isArray(data) ? data.length : 0} rows to Google Sheets and saved backup`,
      rowsAdded: Array.isArray(data) ? data.length : 0,
    })
  } catch (error) {
    console.error('Google Sheets export error:', error)
    return NextResponse.json({ success: false, error: 'Failed to export to Google Sheets' }, { status: 500 })
  }
}
