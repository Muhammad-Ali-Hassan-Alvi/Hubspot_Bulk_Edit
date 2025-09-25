import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// import { getAuthenticatedUser } from '@/lib/store/serverUtils'
// Removed unused import

export async function POST(request: NextRequest) {
  console.log('=== Backup Schedule API Called ===')

  try {
    const { userId, schedule } = await request.json()

    if (!userId || !schedule) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // This part is fine, it updates the user's settings
    const { error: updateError } = await supabase.from('user_settings').upsert(
      {
        user_id: userId,
        backup_schedule: schedule,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (updateError) {
      throw updateError
    }

    // --- CHANGE IS ON THE NEXT LINE ---
    // Log the schedule setup to the new, correct table
    await supabase.from('smoos_logs').insert({
      user_id: userId,
      action_type: 'configure',
      resource_type: 'backup_schedule',
      resource_id: userId, // It's good practice to identify the resource
      details: { schedule, enabled: schedule.enabled },
    })
    // --- END OF CHANGE ---

    return NextResponse.json({
      success: true,
      message: schedule.enabled
        ? `Backup scheduled ${schedule.frequency} at ${schedule.time}`
        : 'Backup schedule disabled',
      nextRun: schedule.enabled ? calculateNextRun(schedule) : null,
    })
  } catch (error) {
    console.error('Schedule setup error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to set up backup schedule',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function calculateNextRun(schedule: any): string {
  const now = new Date()
  const [hours, minutes] = schedule.time.split(':').map(Number)
  const nextRun = new Date(now)
  nextRun.setHours(hours, minutes, 0, 0)

  if (nextRun <= now) {
    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1)
        break
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7)
        break
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1)
        break
    }
  }

  return nextRun.toISOString()
}
