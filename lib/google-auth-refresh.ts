import { google } from 'googleapis'
import { getServerUserSettings } from '@/lib/store/serverUtils'
import { createClient } from '@/lib/supabase/server'

export interface GoogleTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date | null
}

export async function getRefreshedGoogleToken(
  userId: string,
  requestUrl: string
): Promise<GoogleTokens> {
  const userSettings = await getServerUserSettings(userId)

  if (!userSettings) {
    throw new Error('User settings not found')
  }

  if (!userSettings.google_access_token) {
    throw new Error('Google Sheets not connected')
  }

  const accessToken = userSettings.google_access_token
  const refreshToken = userSettings.google_refresh_token
  const expiresAt = userSettings.google_token_expires_at
    ? new Date(userSettings.google_token_expires_at)
    : null

  const now = new Date()

  // Check if access token is expired and we have a refresh token
  if (expiresAt && now >= expiresAt && refreshToken) {
    console.log('🔄 Google access token expired, refreshing...')

    const url = new URL(requestUrl)
    const origin = url.origin
    const redirectUri = `${origin}/api/google/callback`

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    )

    oauth2Client.setCredentials({ refresh_token: refreshToken })

    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      const newAccessToken = credentials.access_token!
      const newExpiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : null

      // Update tokens in database
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({
          google_access_token: newAccessToken,
          google_token_expires_at: newExpiresAt?.toISOString() || null,
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('❌ Failed to update Google tokens in database:', updateError)
        throw new Error('Failed to update tokens in database')
      }

      console.log('✅ Google token refreshed successfully')

      return {
        accessToken: newAccessToken,
        refreshToken: refreshToken,
        expiresAt: newExpiresAt,
      }
    } catch (error) {
      console.error('❌ Google token refresh error:', error)
      throw new Error(
        `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  return {
    accessToken: accessToken,
    refreshToken: refreshToken,
    expiresAt: expiresAt,
  }
}

export async function getGoogleAuthHeaders(
  userId: string,
  requestUrl: string
): Promise<HeadersInit> {
  const tokens = await getRefreshedGoogleToken(userId, requestUrl)

  return {
    Authorization: `Bearer ${tokens.accessToken}`,
  }
}

export async function getAuthenticatedGoogleSheetsClient(userId: string, requestUrl: string) {
  const tokens = await getRefreshedGoogleToken(userId, requestUrl)

  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: tokens.accessToken })

  return google.sheets({ version: 'v4', auth })
}
