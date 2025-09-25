import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    console.log('=== Sync History Debug ===')
    console.log('Requested userId:', userId)

    if (!userId) {
      console.log('❌ No userId provided')
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    console.log('Current authenticated user:', user?.id)
    console.log('User error:', userError)

    const { data: allSessions, error: allError } = await supabase
      .from('sync_sessions')
      .select('*')
      .limit(5)

    console.log('All sessions (first 5):', allSessions)
    console.log('All sessions error:', allError)

    const { data: sessions, error } = await supabase
      .from('sync_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(20)

    console.log('User sessions:', sessions)
    console.log('User sessions error:', error)

    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch sync history',
          details: error.message,
        },
        { status: 500 }
      )
    }

    console.log(`✅ Found ${sessions?.length || 0} sessions for user ${userId}`)

    return NextResponse.json({ success: true, sessions: sessions || [] })
  } catch (error) {
    console.error('❌ Sync history error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch sync history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
