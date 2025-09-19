import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

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
    const logData = {
      id: `bulk_edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      action_type: action,
      resource_type: 'bulk_editing',
      details: {
        changes_count: changes,
        successful_updates: successful,
        failed_updates: failed,
        content_type: contentType,
        was_successful: wasSuccessful,
        error_message: errorMessage,
        updates_applied: updatesApplied || {},
        fields_changed: updatesApplied ? Object.keys(updatesApplied) : [],
        selected_page_ids: selectedPageIds || [],
        page_changes: pageChanges || [], // Store the detailed page changes
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    }

    const { error: insertError } = await supabase.from('audit_logs').insert(logData)

    if (insertError) {
      console.error('Error logging bulk editing activity:', insertError)

      // Don't fail the entire operation if logging fails
      return NextResponse.json({
        success: true,
        message: 'Bulk editing successful, but logging failed',
      })
    }

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
