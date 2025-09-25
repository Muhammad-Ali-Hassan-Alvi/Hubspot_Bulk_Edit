import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const user = await getAuthenticatedUser()

    console.log('=== Sync Sessions Test ===')
    console.log('Current user:', user?.id)

    const { data: existingSessions, error: readError } = await supabase
      .from('sync_sessions')
      .select('*')
      .eq('user_id', user.id)
      .limit(5)

    console.log('Existing sessions:', existingSessions)
    console.log('Read error:', readError)

    const testData = {
      user_id: user.id,
      sheet_id: `test_sheet_${Date.now()}`,
      tab_name: 'API Test Tab',
      content_type: 'pages',
      filters_used: { test: true, language: 'en' },
      rows_synced: 3,
    }

    console.log('Inserting test data:', testData)

    const { data: insertResult, error: insertError } = await supabase
      .from('sync_sessions')
      .insert(testData)
      .select()

    console.log('Insert result:', insertResult)
    console.log('Insert error:', insertError)

    const { data: afterInsert, error: afterInsertError } = await supabase
      .from('sync_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(5)

    console.log('After insert:', afterInsert)
    console.log('After insert error:', afterInsertError)

    return NextResponse.json({
      success: true,
      user_id: user.id,
      tests: {
        read: {
          success: !readError,
          error: readError?.message,
          count: existingSessions?.length || 0,
        },
        insert: {
          success: !insertError,
          error: insertError?.message,
          inserted: !!insertResult,
        },
        afterInsert: {
          success: !afterInsertError,
          error: afterInsertError?.message,
          count: afterInsert?.length || 0,
        },
      },
      data: {
        existingSessions,
        insertResult,
        afterInsert,
      },
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
