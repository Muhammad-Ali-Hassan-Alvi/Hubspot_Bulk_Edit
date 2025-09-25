import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// Removed unused import

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const origin = url.origin
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard?error=missing_code`)
  }

  const client_id = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID!
  const client_secret = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_SECRET!
  const redirect_uri = `${origin}/auth/hubspot/callback`

  try {
    const tokenRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id,
        client_secret,
        redirect_uri,
        code,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      const desc = tokenData.message ?? 'unknown'
      return NextResponse.redirect(`${origin}/dashboard?error=hubspot_oauth_failed&desc=${desc}`)
    }

    const accountInfoRes = await fetch('https://api.hubapi.com/account-info/v3/details', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!accountInfoRes.ok) {
      return NextResponse.redirect(`${origin}/dashboard?error=hubspot_account_info_failed`)
    }
    const accountInfoData = await accountInfoRes.json()

    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!user || authError) {
      console.error('Supabase user fetch error:', authError)
      return NextResponse.redirect(`${origin}/dashboard?error=user_fetch_failed`)
    }

    const { error: dbError } = await supabase.from('user_settings').upsert(
      {
        user_id: user.id,
        hubspot_access_token: tokenData.access_token,
        hubspot_refresh_token: tokenData.refresh_token,
        hubspot_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
        hubspot_connection_type: 'free',
        hubspot_portal_id: accountInfoData.portalId,
        hubspot_account_name: accountInfoData.companyName,
      },
      { onConflict: 'user_id' }
    )

    if (dbError) {
      console.error('Supabase DB error:', dbError)
      return NextResponse.redirect(`${origin}/dashboard?error=db_save_failed`)
    }

    return NextResponse.redirect(`${origin}/dashboard?hubspot_oauth=success`)
  } catch (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(`${origin}/dashboard?error=oauth_exception`)
  }
}
