// FILE: /api/sync/preview-changes/route.ts

import { createClient } from '@/lib/supabase/server'
// import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { type NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { diff_match_patch } from 'diff-match-patch'
import { getServerUserSettings } from '@/lib/store/serverUtils'

// ... (getRefreshedGoogleClient and getColumnIndex functions are unchanged) ...
async function getRefreshedGoogleClient(userId: string, supabase: any, request: NextRequest) {
  const userSettings = await getServerUserSettings(userId)

  if (!userSettings?.google_refresh_token) {
    throw new Error(
      'Google connection not found or refresh token is missing. Please reconnect your Google account.'
    )
  }

  const url = new URL(request.url)
  const origin = url.origin // dynamic origin (e.g., https://yourdomain.vercel.app)
  const redirectUri = `${origin}/api/google/callback`

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  )

  oauth2Client.setCredentials({
    refresh_token: userSettings.google_refresh_token,
  })

  const { token: newAccessToken } = await oauth2Client.getAccessToken()

  if (newAccessToken && newAccessToken !== userSettings.google_access_token) {
    await supabase
      .from('user_settings')
      .update({ google_access_token: newAccessToken })
      .eq('user_id', userId)
  }

  oauth2Client.setCredentials({
    access_token: newAccessToken,
    refresh_token: userSettings.google_refresh_token,
  })

  return google.sheets({ version: 'v4', auth: oauth2Client })
}
function getColumnIndex(headers: string[], name: string): number {
  return headers.findIndex(h => h.toLowerCase().trim() === name.toLowerCase().trim())
}

export async function POST(request: NextRequest) {
  try {
    const { userId, sheetId, sheetName } = await request.json()

    if (!userId || !sheetId || !sheetName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const sheets = await getRefreshedGoogleClient(user.id, supabase, request)

    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${sheetName}'`,
    })

    const sheetRows = sheetResponse.data.values
    if (!sheetRows || sheetRows.length <= 1) {
      return NextResponse.json({
        success: true,
        changes: [],
        message: 'No data in sheet to compare.',
      })
    }

    const headers = sheetRows.shift()!.map(h => String(h))

    const columnsToCompare = {
      ID: 'hubspot_page_id',
      Name: 'name',
      URL: 'url',
      'HTML Title': 'html_title',
      'Meta Description': 'meta_description',
      Slug: 'slug',
      'Body Content': 'body_content',
    }

    const columnIndexes: { [key: string]: number } = {}
    for (const header in columnsToCompare) {
      const propName = columnsToCompare[header as keyof typeof columnsToCompare]
      columnIndexes[propName] = getColumnIndex(headers, header)
    }

    if (columnIndexes.hubspot_page_id === -1) {
      throw new Error("Could not find required column 'ID' in the sheet.")
    }

    const latestSheetDataMap = new Map()
    for (let i = 0; i < sheetRows.length; i++) {
      const row = sheetRows[i]
      const pageId = row[columnIndexes.hubspot_page_id]
      if (!pageId) continue
      const sheetRowNumber = i + 2

      const pageData: { [key: string]: any } = {}
      for (const propName in columnIndexes) {
        const index = columnIndexes[propName]
        if (index !== -1) {
          pageData[propName] = row[index] || ''
        }
      }
      latestSheetDataMap.set(pageId, {
        values: pageData,
        originalRow: sheetRowNumber,
      })
    }

    const { data: latestBackupRun, error: backupIdError } = await supabase
      .from('hubspot_page_backups')
      .select('backup_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (backupIdError || !latestBackupRun) {
      return NextResponse.json({
        success: true,
        changes: [],
        message: 'No database backup found to compare against.',
      })
    }

    const { data: dbBackupData, error: dbError } = await supabase
      .from('hubspot_page_backups')
      .select('*')
      .eq('user_id', user.id)
      .eq('backup_id', latestBackupRun.backup_id)

    if (dbError) throw dbError

    const supabaseDataMap = new Map(dbBackupData.map(row => [row.hubspot_page_id, row]))

    const changes: any[] = []
    const dmp = new diff_match_patch()

    for (const [pageId, sheetEntry] of latestSheetDataMap.entries()) {
      const dbPage = supabaseDataMap.get(pageId)
      if (!dbPage) continue

      const sheetPage = sheetEntry.values
      const sheetRowNumber = sheetEntry.originalRow

      const modifiedFields: any = {}
      let isModified = false

      for (const propName in sheetPage) {
        // *** START MODIFICATION ***
        // Exclude body_content from this generic loop; handle it separately.
        if (propName === 'hubspot_page_id' || propName === 'body_content') {
          continue
        }
        // *** END MODIFICATION ***

        if (sheetPage[propName] !== dbPage[propName]) {
          isModified = true
          modifiedFields[propName] = {
            old: dbPage[propName] || '',
            new: sheetPage[propName],
            location: {
              row: sheetRowNumber,
              column: columnIndexes[propName] + 1,
            },
          }
        }
      }

      // Special handling for body_content
      if (
        sheetPage.hasOwnProperty('body_content') &&
        sheetPage.body_content !== dbPage.body_content
      ) {
        isModified = true
        const diff = dmp.diff_main(dbPage.body_content || '', sheetPage.body_content || '')
        dmp.diff_cleanupSemantic(diff)

        // *** CRITICAL CHANGE HERE ***
        // We add BOTH the data for syncing (body_content) AND the visual diff for display.
        modifiedFields.body_content = {
          old: dbPage.body_content || '',
          new: sheetPage.body_content,
        }
        modifiedFields.body_content_diff = {
          diffHtml: dmp.diff_prettyHtml(diff),
          location: {
            row: sheetRowNumber,
            column: columnIndexes.body_content + 1,
          },
        }
      }

      if (isModified) {
        changes.push({
          pageId: pageId,
          name: sheetPage.name || dbPage.name,
          type: 'modified',
          fields: modifiedFields,
        })
      }
    }

    return NextResponse.json({ success: true, changes })
  } catch (error) {
    console.error('Preview changes error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
    return NextResponse.json(
      { success: false, error: `Failed to preview changes: ${errorMessage}` },
      { status: 500 }
    )
  }
}
