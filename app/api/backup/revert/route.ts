// FILE: /api/history/revert/route.ts (Corrected to ALWAYS Create a New File)

import { createClient } from '@/lib/supabase/server'
// import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { type NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getServerUserSettings } from '@/lib/store/serverUtils'

interface HubspotPageBackup {
  backup_date?: string
  hubspot_page_id: string
  name: string
  url: string
  html_title: string
  meta_description: string
  slug: string
  state: string
  created_at: string
  updated_at: string
  page_type: string
  body_content: string
}

// This helper function gets an authenticated Google API client. It no longer needs to read any sheet IDs.
async function getAuthenticatedGoogleClient(
  userId: string,
  supabase: SupabaseClient,
  request: NextRequest
) {
  const userSettings = await getServerUserSettings(userId)

  if (!userSettings?.google_refresh_token) {
    throw new Error('Google connection not found or refresh token is missing.')
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
      .upsert({ user_id: userId, google_access_token: newAccessToken }, { onConflict: 'user_id' })
      .eq('user_id', userId)
  }

  oauth2Client.setCredentials({
    access_token: newAccessToken,
    refresh_token: userSettings.google_refresh_token,
  })

  return google.sheets({ version: 'v4', auth: oauth2Client })
}

const hubspotFieldMapping: { [key: string]: string } = {
  name: 'name',
  html_title: 'htmlTitle',
  meta_description: 'metaDescription',
  slug: 'slug',
  state: 'currentState',
  body_content: 'body',
}

export async function POST(request: NextRequest) {
  let newSheetUrl = ''

  try {
    const { userId, hubspotToken, versionId } = await request.json()

    if (!userId || !hubspotToken || !versionId) {
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

    const { data: targetVersionData, error: versionError } = await supabase
      .from('hubspot_page_backups')
      .select('*')
      .eq('backup_id', versionId)

    if (versionError || !targetVersionData || targetVersionData.length === 0) {
      throw new Error(`Could not find version with ID: ${versionId}`)
    }

    // --- START: MODIFIED LOGIC TO ALWAYS CREATE A NEW SPREADSHEET FILE ---
    try {
      const sheets = await getAuthenticatedGoogleClient(user.id, supabase, request)
      const revertTimestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
      const newSpreadsheetTitle = `HubSpot_Reverted_Data - ${revertTimestamp}` // Use the name you requested
      const mainSheetTitle = 'Reverted Data'

      // 1. Create a brand new spreadsheet file
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: newSpreadsheetTitle,
          },
          sheets: [
            {
              properties: {
                title: mainSheetTitle,
              },
            },
          ],
        },
      })

      const newSpreadsheetId = createResponse.data.spreadsheetId
      newSheetUrl =
        createResponse.data.spreadsheetUrl ||
        `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit`

      if (!newSpreadsheetId) {
        throw new Error('Failed to create new spreadsheet file.')
      }

      // 2. Prepare data and write to the new file
      const headers = [
        'Backup Date',
        'ID',
        'Name',
        'URL',
        'HTML Title',
        'Meta Description',
        'Slug',
        'State',
        'Created/Published At',
        'Updated At',
        'Content Type',
        'Body Content',
      ]

      const sheetRows = targetVersionData.map((page: HubspotPageBackup) => [
        page.backup_date || new Date(page.created_at).toISOString(),
        page.hubspot_page_id,
        page.name,
        page.url,
        page.html_title,
        page.meta_description,
        page.slug,
        page.state,
        page.created_at,
        page.updated_at,
        page.page_type,
        page.body_content,
      ])

      await sheets.spreadsheets.values.update({
        spreadsheetId: newSpreadsheetId,
        range: `'${mainSheetTitle}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers, ...sheetRows] },
      })
    } catch (sheetError) {
      console.error('Failed to create or write to revert log sheet:', sheetError)
      newSheetUrl = ''
    }
    // --- END: MODIFIED LOGIC ---

    // The rest of the function (syncing and creating a snapshot) is unchanged.
    const succeeded: { pageId: string; name: string; published: boolean }[] = []
    interface FailedRevert {
      pageId: string
      name: string
      error: string
    }
    const failed: FailedRevert[] = []
    for (const pageToRevert of targetVersionData) {
      const pageId = pageToRevert.hubspot_page_id
      const pageType = pageToRevert.page_type
      const contentPayload: Record<string, string | number | boolean | null | undefined> = {}
      for (const key in hubspotFieldMapping) {
        if (key !== 'state' && pageToRevert[key as keyof typeof pageToRevert] !== undefined) {
          contentPayload[hubspotFieldMapping[key]] = pageToRevert[key as keyof typeof pageToRevert]
        }
      }
      const needsPublishing = pageToRevert.state === 'PUBLISHED'
      let pageWasPublished = false
      try {
        if (Object.keys(contentPayload).length > 0) {
          const updateUrl = `https://api.hubapi.com/cms/v3/pages/${
            pageType === 'Site Page' ? 'site-pages' : 'landing-pages'
          }/${pageId}`
          const res = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${hubspotToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(contentPayload),
          })
          if (!res.ok) {
            const err = await res.json()
            throw new Error(`Content update failed: ${err.message}`)
          }
        }
        if (needsPublishing) {
          const publishUrl = `https://api.hubapi.com/cms/v3/pages/${
            pageType === 'Site Page' ? 'site-pages' : 'landing-pages'
          }/${pageId}/publish-action`
          const res = await fetch(publishUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${hubspotToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'schedule-publish' }),
          })
          if (res.status !== 204) {
            let errText = `HTTP ${res.status}`
            try {
              const err = await res.json()
              errText = err.message
            } catch {}
            throw new Error(`Publish failed: ${errText}`)
          }
          pageWasPublished = true
        }
        succeeded.push({
          pageId,
          name: pageToRevert.name,
          published: pageWasPublished,
        })
      } catch (error) {
        failed.push({
          pageId,
          name: pageToRevert.name,
          error: error instanceof Error ? error.message : 'Revert action failed',
        })
      }
    }
    if (succeeded.length > 0) {
      const newRevertSnapshotId = `revert_${Date.now()}`
      const newSnapshotData = targetVersionData.map(page => ({
        ...page,
        backup_id: newRevertSnapshotId,
        created_at: new Date().toISOString(),
      }))
      newSnapshotData.forEach(p => {
        // Remove the 'id' property if present
        delete (p as Partial<HubspotPageBackup> & { id?: string }).id
      })
      await supabase.from('hubspot_page_backups').insert(newSnapshotData)
    }

    return NextResponse.json({
      success: true,
      message: 'Revert process completed.',
      succeeded,
      failed,
      revertSheetUrl: newSheetUrl,
    })
  } catch (error) {
    console.error('Revert to version error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
    return NextResponse.json(
      { success: false, error: `Failed to revert to version: ${errorMessage}` },
      { status: 500 }
    )
  }
}
