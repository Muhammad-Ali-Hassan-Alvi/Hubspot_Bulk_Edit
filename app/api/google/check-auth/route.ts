import { NextResponse } from 'next/server'

export async function GET() {
  console.log('=== Google Auth Check API Called ===')

  try {
    // Check if Google credentials are configured
    const hasCredentials = !!(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)

    return NextResponse.json({
      connected: hasCredentials,
      message: hasCredentials
        ? 'Google service account configured'
        : 'Google credentials not found',
    })
  } catch (error) {
    console.error('Google auth check error:', error)
    return NextResponse.json({
      connected: false,
      error: 'Failed to check Google authentication',
    })
  }
}
