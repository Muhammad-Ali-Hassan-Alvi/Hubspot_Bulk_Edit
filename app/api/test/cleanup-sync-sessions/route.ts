import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// import { getAuthenticatedUser } from '@/lib/store/serverUtils'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Delete test records
    const { data, error } = await supabase
      .from('sync_sessions')
      .delete()
      .eq('user_id', user.id)
      .like('sheet_id', 'test_%')
      .select()

    return NextResponse.json({
      success: !error,
      error: error?.message,
      deletedCount: data?.length || 0,
      deletedRecords: data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
