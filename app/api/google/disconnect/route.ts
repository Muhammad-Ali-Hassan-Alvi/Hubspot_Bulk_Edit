import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST() {
  try {
    const cookieStore = await cookies()

    // Clear Google OAuth cookies
    cookieStore.delete('google_access_token')
    cookieStore.delete('google_refresh_token')

    console.log('Google tokens cleared')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
