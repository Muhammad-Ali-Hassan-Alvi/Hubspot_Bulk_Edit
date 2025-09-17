// lib/google-auth.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { getServerUserSettings } from '@/lib/store/serverUtils'

export interface GoogleAuthResult {
  accessToken: string
  oauth2Client: any
}

/**
 * Get authenticated Google OAuth2 client with automatic token refresh
 */
export async function getAuthenticatedGoogleClient(
  supabase: SupabaseClient,
  userId: string,
  redirectUri?: string
): Promise<GoogleAuthResult> {
  // 1. Fetch the user's securely stored tokens
  const settings = await getServerUserSettings(userId)

  if (!settings?.google_refresh_token) {
    throw new Error('Google account not connected or refresh token missing.')
  }

  // 2. Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri || process.env.GOOGLE_REDIRECT_URI
  )

  // 3. Check if access token needs refresh
  let accessToken = settings.google_access_token
  const refreshToken = settings.google_refresh_token
  const expiresAt = settings.google_token_expires_at
    ? new Date(settings.google_token_expires_at)
    : null
  const now = new Date()

  // 4. Refresh token if expired
  if (expiresAt && now >= expiresAt && refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken })

    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      accessToken = credentials.access_token!

      // Update new access token in database
      await supabase
        .from('user_settings')
        .update({
          google_access_token: accessToken,
          google_token_expires_at: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null,
        })
        .eq('user_id', userId)
    } catch (err) {
      console.error('Google token refresh failed:', err)
      throw new Error('Failed to refresh Google access token')
    }
  }

  // 5. Set credentials and return
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return {
    accessToken: accessToken!,
    oauth2Client,
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getAuthenticatedGoogleClient instead
 */
export async function getAuthenticatedGoogleClientLegacy(
  _supabase: SupabaseClient,
  userId: string
) {
  const { oauth2Client } = await getAuthenticatedGoogleClient(_supabase, userId)
  return oauth2Client
}
