import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { getServerUserSettings } from '@/lib/store/serverUtils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const user = await getAuthenticatedUser()

  // Fetch user's Google tokens from Supabase
  const userSettings = await getServerUserSettings(user.id)

  if (!userSettings?.google_access_token) {
    return NextResponse.json(
      { success: false, error: 'Google Sheets not connected' },
      { status: 409 }
    )
  }

  let accessToken = userSettings.google_access_token
  const refreshToken = userSettings.google_refresh_token
  const expiresAt = userSettings.google_token_expires_at
    ? new Date(userSettings.google_token_expires_at)
    : null

  const now = new Date()

  const url = new URL(request.url)
  const origin = url.origin // dynamic origin (e.g., https://yourdomain.vercel.app)
  const redirectUri = `${origin}/api/google/callback`

  // Check if access token is expired
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

      // Update new access token in Supabase
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

  try {
    // Use Google API with access token
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })

    const drive = google.drive({ version: 'v3', auth })

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'files(id, name, webViewLink, createdTime, modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 100, // increased to be safe
    })

    // console.log('Drive API Response Files:', response.data.files)

    const spreadsheets =
      response.data.files?.map(file => ({
        id: file.id!,
        name: file.name!,
        url: file.webViewLink!,
        createdTime: file.createdTime!,
        modifiedTime: file.modifiedTime!,
      })) || []

    return NextResponse.json({ success: true, sheets: spreadsheets })
  } catch (error) {
    console.error('Google Sheets API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Google Sheets' },
      { status: 500 }
    )
  }
}
