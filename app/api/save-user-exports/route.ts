import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export async function POST(request: NextRequest) {
  try {
    const { contentType, exportType, sheetId, tabId } = await request.json()

    // Validate required fields
    if (!contentType || !exportType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: contentType and exportType' },
        { status: 400 }
      )
    }

    // Validate export type
    if (!['csv', 'google-sheets'].includes(exportType)) {
      return NextResponse.json(
        { success: false, error: 'exportType must be either "csv" or "sheets"' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    if (!contentType) {
      return NextResponse.json(
        { success: false, error: `Unknown content type: ${contentType}` },
        { status: 400 }
      )
    }

    // Prepare the export record
    const exportRecord: any = {
      user_id: user.id,
      content_type_id: contentType,
      export_type: exportType,
      sheet_id: sheetId,
      tab_id: tabId,
    }

    // Add sheet and tab info for Google Sheets exports
    if (exportType === 'sheets') {
      if (sheetId) {
        exportRecord.sheet_id = parseInt(sheetId, 10) || null
      }
      if (tabId) {
        exportRecord.tab_id = parseInt(tabId, 10) || null
      }
    }

    // Insert the export record
    const { data, error } = await supabase
      .from('user_exports')
      .insert(exportRecord)
      .select()
      .single()

    if (error) {
      console.error('Error inserting user export:', error)
      return NextResponse.json({ success: false, error: 'Failed to log export' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      exportId: data.id,
      message: 'Export logged successfully',
    })
  } catch (error) {
    console.error('Export logging API error:', error)
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred' },
      { status: 500 }
    )
  }
}
