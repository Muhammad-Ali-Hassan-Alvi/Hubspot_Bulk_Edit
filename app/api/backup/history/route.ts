import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const date = searchParams.get('date')
    const pageId = searchParams.get('pageId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    let query = supabase
      .from('change_history')
      .select(
        `
        *,
        changed_by_user:auth.users!changed_by(email)
      `
      )
      .eq('user_id', userId)
      .order('changed_at', { ascending: false })

    if (date) {
      const start = new Date(date)
      const end = new Date(date)
      end.setDate(end.getDate() + 1)
      query = query.gte('changed_at', start.toISOString()).lt('changed_at', end.toISOString())
    }

    if (pageId) query = query.eq('page_id', pageId)

    const { data: changes, error } = await query.limit(100)

    if (error) {
      console.error('Failed to fetch change history:', error)
      return NextResponse.json({ error: 'Failed to fetch change history' }, { status: 500 })
    }

    return NextResponse.json({ success: true, changes })
  } catch (err) {
    console.error('Change history error:', err)
    return NextResponse.json({ error: 'Failed to fetch change history' }, { status: 500 })
  }
}
