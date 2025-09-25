import { google } from 'googleapis'
import { cookies } from 'next/headers'

export async function getAuthenticatedClient() {
  const cookieStore = cookies()
  const accessToken = cookieStore.get('google_access_token')?.value
  const refreshToken = cookieStore.get('google_refresh_token')?.value

  if (!accessToken) {
    throw new Error('Not authenticated with Google')
  }

  // const url = new URL(request.url)
  // const origin = url.origin // dynamic origin (e.g., https://yourdomain.vercel.app)
  // const redirectUri = `${origin}/api/google/callback`

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI // use redirectUri here
  )

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return oauth2Client
}
