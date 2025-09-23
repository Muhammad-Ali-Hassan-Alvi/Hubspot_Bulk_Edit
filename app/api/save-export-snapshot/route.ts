import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { UserExportStatusEnum } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const { userExportId, snapshotData, versionNumber, status } = await request.json()

    // Validate required fields
    if (!userExportId || !snapshotData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userExportId and snapshotData' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = Object.values(UserExportStatusEnum)
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Get authenticated user
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Prepare the snapshot record
    const snapshotRecord = {
      user_export_id: userExportId,
      version_number: versionNumber || 1,
      snapshot_json: snapshotData,
      created_by: user.id,
      status: status || UserExportStatusEnum.ACTIVE,
    }

    // Insert the snapshot record
    const { data, error } = await supabase
      .from('user_export_snaphots')
      .insert(snapshotRecord)
      .select()
      .single()

    if (error) {
      console.error('Error inserting export snapshot:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to save export snapshot' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      snapshotId: data.id,
      message: 'Export snapshot saved successfully',
    })
  } catch (error) {
    console.error('Export snapshot API error:', error)
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred' },
      { status: 500 }
    )
  }
}
