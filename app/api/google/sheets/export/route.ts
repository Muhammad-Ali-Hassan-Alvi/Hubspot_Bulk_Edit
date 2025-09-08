// File: /api/google/sheets/export/route.ts

import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { getServerUserSettings } from '@/lib/store/serverUtils'
import { snapshot } from 'node:test'

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

    const columnsWithKeys: ColumnDefinition[] = columns.map((label: string) => {
      // A simple way to create a JS-friendly key from a label
      // "First Name" -> "firstName"
      const key = label
        .split(' ')
        .map((word, index) =>
          index === 0
            ? word.toLowerCase()
            : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join('')

      return { label, key }
    })

    // Now TypeScript knows exactly what `columnsWithKeys` is, and the following lines will work without errors.
    const headers = ['Export Date', ...columnsWithKeys.map(c => c.label)]

    const rows = data.map((row: any) => [
      timestamp,
      ...columnsWithKeys.map(({ key }) => {
        const value = row[key]
        // This safely handles values that are objects, null, or undefined.
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
    // const { error: snapshotError } = await supabase.from('export_snapshots').upsert(
    //   {
    //     user_id: user.id,
    //     sheet_id: sheetId,
    //     sheet_tab_name: tabName,
    //     snapshot_data: data,
    //   },
    //   { onConflict: 'user_id,sheet_id,sheet_tab_name' }
    // )

    if (data && data.length > 0) {
      const snapshotRows = data.map((page: any) => ({
        user_id: user.id,
        sheet_id: sheetId,
        sheet_tab_name: tabName,

        // Map from camelCase data to snake_case DB columns
        hubspot_page_id: page.id,
        url: page.url,
        name: page.name,
        slug: page.slug,
        state: page.state,
        html_title: page.htmlTitle,
        meta_description: page.metaDescription,
        published: page.published,
        archived_at: page.archivedAt,
        author_name: page.authorName,
        category_id: page.categoryId,
        content_type: page.contentType,
        created_by_id: page.createdById,
        publish_date: page.publishDate,
        updated_at: page.updatedAt,
        updated_by_id: page.updatedById,
        current_state: page.currentState,
        widgets: page.widgets,
        layout_sections: page.layoutSections,
        translations: page.translations,
        public_access_rules: page.publicAccessRules,
        // Add any other fields you want to save...
      }))

      const { error: snapshotError } = await supabase.from('page_snapshots').upsert(snapshotRows, {
        onConflict: 'user_id,sheet_id,sheet_tab_name,hubspot_page_id',
      })

      if (snapshotError) {
        console.error('Failed to save structured page snapshots:', snapshotError)
        // Don't fail the export, but log the error.
      }
    }

    // if (snapshotError) {
    //   console.error('Failed to save export snapshot:', snapshotError)
    // }

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
