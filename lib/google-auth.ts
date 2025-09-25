// lib/google-auth.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { getServerUserSettings } from '@/lib/store/serverUtils'

export async function getAuthenticatedGoogleClient(_supabase: SupabaseClient, userId: string) {
  // need to have requet here
  // 1. Fetch the user's securely stored refresh token
  const settings = await getServerUserSettings(userId)

  if (!settings?.google_refresh_token) {
    throw new Error('Google account not connected or refresh token missing.')
  }

  // const url = new URL(request.url)
  // const origin = url.origin // dynamic origin (e.g., https://yourdomain.vercel.app)
  // const redirectUri = `${origin}/api/google/callback`

  // 2. Create an OAuth2 client and set the refresh token
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI // use redirectUri here
  )

  oauth2Client.setCredentials({
    refresh_token: settings.google_refresh_token,
  })

  // 3. The library will automatically use the refresh token to get a new
  // access token when needed.
  return oauth2Client
}
