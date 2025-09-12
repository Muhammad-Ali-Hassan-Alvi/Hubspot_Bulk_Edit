import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { auditLogger } from '@/lib/services/audit-logger'

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      action,
      changes,
      successful,
      failed,
      contentType,
      errorMessage,
      wasSuccessful,
      updatesApplied,
      selectedPageIds,
      pageChanges,
    } = await request.json()

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Verify user authentication
    const user = await getAuthenticatedUser()
    if (user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Log the bulk editing activity
    await auditLogger.logBulkEditing(
      userId,
      action,
      changes,
      successful,
      failed,
      contentType,
      wasSuccessful,
      errorMessage,
      updatesApplied,
      selectedPageIds,
      pageChanges
    )

    return NextResponse.json({
      success: true,
      message: 'Bulk editing activity logged successfully',
    })
  } catch (error) {
    console.error('Bulk editing audit error:', error)
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
