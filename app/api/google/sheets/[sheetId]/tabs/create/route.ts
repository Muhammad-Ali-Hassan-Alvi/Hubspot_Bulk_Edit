import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { google } from 'googleapis'
import { getServerUserSettings } from '@/lib/store/serverUtils'

export async function POST(request: NextRequest, { params }: { params: { sheetId: string } }) {
  try {
    const { tabName } = await request.json()

    if (!tabName || !params.sheetId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const user = await getAuthenticatedUser()

    // Get user's Google tokens
    const userSettings = await getServerUserSettings(user.id)

    if (!userSettings?.google_access_token) {
      return NextResponse.json(
        { success: false, error: 'Google Sheets not connected' },
        { status: 400 }
      )
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: userSettings.google_access_token })

    const sheets = google.sheets({ version: 'v4', auth })

    // Create the new tab
    const createResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: params.sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: tabName,
              },
            },
          },
        ],
      },
    })

    const newSheet = createResponse.data.replies?.[0]?.addSheet?.properties
    if (!newSheet) {
      throw new Error('Failed to create tab')
    }

    // Log the tab creation
    await supabase.from('smoos_logs').insert({
      user_id: user.id,
      action_type: 'create',
      resource_type: 'google_sheet_tab',
      resource_id: params.sheetId,
      details: {
        tab_name: tabName,
        sheet_id: params.sheetId,
        tab_id: newSheet.sheetId,
      },
    })

    return NextResponse.json({
      success: true,
      tab: {
        id: newSheet.sheetId?.toString() || '',
        name: tabName,
      },
    })
  } catch (error) {
    console.error('Create Google Sheet Tab error:', error)

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { success: false, error: 'A tab with this name already exists' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
