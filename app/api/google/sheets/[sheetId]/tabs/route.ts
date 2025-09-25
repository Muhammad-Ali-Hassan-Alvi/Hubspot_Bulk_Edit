import { NextRequest, NextResponse } from 'next/server'
// import { createServerClient } from '@supabase/ssr'
// import { cookies } from 'next/headers'
import { google } from 'googleapis'
import { getServerUserSettings, getAuthenticatedUser } from '@/lib/store/serverUtils'

export async function GET(_request: NextRequest, { params }: { params: { sheetId: string } }) {
  try {
    // const cookieStore = await cookies()
    // const _supabase = createServerClient(
    //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    //   {
    //     cookies: {
    //       get(name: string) {
    //         return cookieStore.get(name)?.value
    //       },
    //     },
    //   }
    // )

    const user = await getAuthenticatedUser()

    // Get user settings to get Google tokens
    const userSettings = await getServerUserSettings(user.id)

    if (!userSettings?.google_access_token) {
      return NextResponse.json({ error: 'Google not connected' }, { status: 401 })
    }

    // Create Google Sheets API client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: userSettings.google_access_token,
      refresh_token: userSettings.google_refresh_token,
    })

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client })

    // Get sheet metadata to fetch tabs
    const response = await sheets.spreadsheets.get({
      spreadsheetId: params.sheetId,
      fields: 'sheets.properties',
    })

    const tabs =
      response.data.sheets?.map(sheet => ({
        id: sheet.properties?.sheetId?.toString() || '',
        name: sheet.properties?.title || '',
      })) || []

    return NextResponse.json({
      success: true,
      tabs,
    })
  } catch (error) {
    console.error('Error fetching sheet tabs:', error)
    return NextResponse.json({ error: 'Failed to fetch sheet tabs' }, { status: 500 })
  }
}
