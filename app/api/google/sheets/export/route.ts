// FILE: /api/google/sheets/export/route.ts

import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { getServerUserSettings } from '@/lib/store/serverUtils'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  type ColumnDefinition = {
    label: string
    key: string
  }

  const supabase = createClient()
  const user = await getAuthenticatedUser()

  try {
    const { sheetId, data, columns, tabName } = await request.json()

    if (!sheetId || !data || !columns) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: sheetId, data, or columns' },
        { status: 400 }
      )
    }

    const userSettings = await getServerUserSettings(user.id)

    if (!userSettings?.google_access_token) {
      return NextResponse.json(
        { success: false, error: 'Google Sheets not connected' },
        { status: 400 }
      )
    }

    // --- Token refresh logic (unchanged) ---
    let accessToken = userSettings.google_access_token
    const refreshToken = userSettings.google_refresh_token
    const expiresAt = userSettings.google_token_expires_at
      ? new Date(userSettings.google_token_expires_at)
      : null

    const now = new Date()
    const url = new URL(request.url)
    const origin = url.origin
    const redirectUri = `${origin}/api/google/callback`

    if (expiresAt && now >= expiresAt && refreshToken) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      )
      oauth2Client.setCredentials({ refresh_token: refreshToken })

      try {
        const { credentials } = await oauth2Client.refreshAccessToken()
        accessToken = credentials.access_token!

        await supabase
          .from('user_settings')
          .update({
            google_access_token: accessToken,
            google_token_expires_at: credentials.expiry_date
              ? new Date(credentials.expiry_date).toISOString()
              : null,
          })
          .eq('user_id', user.id)
      } catch (err) {
        console.error('Token refresh failed:', err)
        return NextResponse.json({ success: false, error: 'Token refresh failed' }, { status: 401 })
      }
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    const sheets = google.sheets({ version: 'v4', auth })

    const timestamp = new Date().toISOString()

    // ---------------- Helper utilities for robust field extraction ----------------
    const toCamel = (label: string) =>
      label
        .split(/[\s_]+/)
        .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join('')

    const toSnake = (s: string) =>
      s
        .replace(/\s+/g, '_')
        .replace(/([A-Z])/g, '_$1')
        .replace(/__+/g, '_')
        .toLowerCase()
        .replace(/^_/, '')

    function tryParseJSON(value: any) {
      if (typeof value !== 'string') return value
      const trimmed = value.trim()
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          return JSON.parse(trimmed)
        } catch {
          return value
        }
      }
      return value
    }

    function normalizeCellValue(v: any) {
      // Normalize empty/EMPTY -> null, trim strings, hydrate booleans and JSON-ish strings
      if (v === undefined) return null
      if (v === null) return null
      if (typeof v === 'string') {
        const t = v.trim()
        if (t === '' || t.toUpperCase() === 'EMPTY') return null
        if (t.toUpperCase() === 'TRUE') return true
        if (t.toUpperCase() === 'FALSE') return false
        const parsed = tryParseJSON(t)
        return parsed
      }
      return v
    }

    function getFieldValue(page: any, label: string, key: string) {
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

      // Some common fallback keys
      if (page.id !== undefined) return normalizeCellValue(page.id)
      if (page.name !== undefined) return normalizeCellValue(page.name)

      return null
    }
    // -------------------------------------------------------------------------------

    // Build column keys (from labels)
    const columnsWithKeys: ColumnDefinition[] = columns.map((label: string) => {
      const key = label
        .split(' ')
        .map((word, index) =>
          index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join('')

      return { label, key }
    })

    const headers = ['Export Date', ...columnsWithKeys.map(c => c.label)]

    // Build rows to write to the sheet, using getFieldValue
    const rows = data.map((row: any) => [
      timestamp,
      ...columnsWithKeys.map(({ label, key }) => {
        const value = getFieldValue(row, label, key)
        return typeof value === 'object' && value !== null ? JSON.stringify(value) : (value ?? '')
      }),
    ])

    // ----- Sheet ID / Tab name handling -----
    let targetSheetId = 0 // Default to first sheet
    let sheetRangePrefix = '' // Will be set to tab name if provided

    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
    const existingSheets = spreadsheetInfo.data.sheets ?? []

    if (tabName) {
      const matchedSheet = existingSheets.find(
        sheet => sheet.properties?.title?.toLowerCase() === tabName.toLowerCase()
      )

      if (matchedSheet) {
        targetSheetId = matchedSheet.properties?.sheetId ?? 0
        sheetRangePrefix = `'${tabName}'!`
      } else {
        // Create the new tab
        const addSheetRes = await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: tabName } } }],
          },
        })

        const addedSheet = addSheetRes.data.replies?.[0]?.addSheet?.properties
        targetSheetId = addedSheet?.sheetId ?? 0
        sheetRangePrefix = `'${tabName}'!`
      }
    }

    // Clear existing data in the tab first
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${sheetRangePrefix}A:Z`, // Clear all columns
    })

    // Insert new data starting from the first row
    const valuesToInsert = [headers, ...rows]

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetRangePrefix}A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: valuesToInsert,
      },
    })

    // Format the header row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: targetSheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  textFormat: { bold: true },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      },
    })

    // ------- Build snapshot rows using getFieldValue (robust) -------
    if (data && data.length > 0) {
      const snapshotRows = data.map((page: any) => {
        const safe = (label: string, key: string) => {
          const v = getFieldValue(page, label, key)
          // Keep nulls consistent
          return v === undefined ? null : v
        }

        return {
          user_id: user.id,
          sheet_id: sheetId,
          sheet_tab_name: tabName,

          // Map from label -> snapshot column using safe extractor
          hubspot_page_id: safe('Id', 'id'),
          url: safe('Url', 'url'),
          name: safe('Name', 'name'),
          slug: safe('Slug', 'slug'),
          state: safe('State', 'state'),
          html_title: safe('Html Title', 'htmlTitle'),
          meta_description: safe('Meta Description', 'metaDescription'),
          published: safe('Published', 'published'),
          archived_at: safe('Archived At', 'archivedAt'),
          author_name: safe('Author Name', 'authorName'),
          category_id: safe('Category Id', 'categoryId'),
          content_type: safe('Content Type', 'contentType'),
          created_by_id: safe('Created By Id', 'createdById'),
          publish_date: safe('Publish Date', 'publishDate'),
          updated_at: safe('Updated At', 'updatedAt'),
          updated_by_id: safe('Updated By Id', 'updatedById'),
          current_state: safe('Current State', 'currentState'),
          widgets: safe('Widgets', 'widgets'),
          layout_sections: safe('Layout Sections', 'layoutSections'),
          translations: safe('Translations', 'translations'),
          public_access_rules: safe('Public Access Rules', 'publicAccessRules'),
          // Add any other fields you want to save...
        }
      })

      const { error: snapshotError } = await supabase.from('page_snapshots').upsert(snapshotRows, {
        onConflict: 'user_id,sheet_id,sheet_tab_name,hubspot_page_id',
      })

      if (snapshotError) {
        console.error('Failed to save structured page snapshots:', snapshotError)
        // Don't fail the export, but log the error.
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully exported ${data.length} rows to Google Sheets`,
      rowsAdded: data.length,
    })
  } catch (error) {
    console.error('Google Sheets export error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export to Google Sheets' },
      { status: 500 }
    )
  }
}
