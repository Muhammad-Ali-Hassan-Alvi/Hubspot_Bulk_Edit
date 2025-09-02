import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log('=== Debug Sync Sessions ===')
    console.log('Current user:', user?.id)
    console.log('User error:', userError)

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: allSessions, error: allError } = await supabase
      .from('sync_sessions')
      .select('*')
      .limit(5)

    console.log('All sessions test:', allSessions, allError)

    const { data: userSessions, error: userError2 } = await supabase
      .from('sync_sessions')
      .select('*')
      .eq('user_id', user.id)

    console.log('User sessions test:', userSessions, userError2)

    const testData = {
      user_id: user.id,
      sheet_id: 'debug_test_sheet',
      tab_name: 'Debug Test',
      content_type: 'pages',
      filters_used: { test: true },
      rows_synced: 1,
    }

    const { data: insertResult, error: insertError } = await supabase
      .from('sync_sessions')
      .insert(testData)
      .select()

    console.log('Insert test:', insertResult, insertError)

    if (insertResult && insertResult.length > 0) {
      await supabase.from('sync_sessions').delete().eq('id', insertResult[0].id)
    }

    return NextResponse.json({
      user: user.id,
      allSessionsCount: allSessions?.length || 0,
      userSessionsCount: userSessions?.length || 0,
      allError: allError?.message,
      userError: userError2?.message,
      insertError: insertError?.message,
      insertSuccess: !!insertResult,
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      {
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
