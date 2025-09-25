import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get the latest backup session
    const { data: lastBackup } = await supabase
      .from('backup_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // For now, auto-backup is always enabled if user has connections
    // In a real app, you'd store this preference in the database
    const autoBackupEnabled = true

    return NextResponse.json({
      success: true,
      autoBackupEnabled,
      lastBackup: lastBackup?.completed_at || null,
    })
  } catch (error) {
    console.error('Backup status error:', error)
    return NextResponse.json({ error: 'Failed to fetch backup status' }, { status: 500 })
  }
}
