import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { createExportService } from '@/lib/services/export-service'

export const dynamic = 'force-dynamic'




export async function POST(request: Request) {
  try {
    const { sheetId, data, columns, tabName } = await request.json()
    if (!sheetId || !data || !columns) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: sheetId, data, or columns' },
        { status: 400 }
      )
    }

    const user = await getAuthenticatedUser()
    const exportService = await createExportService()

    // Export to Google Sheets using unified service
    const result = await exportService.exportToGoogleSheets(data, columns, {
      contentType: 'Google Sheets',
      sheetId,
      tabName,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      rowsAdded: result.rowsAdded,
    })
  } catch (error) {
    console.error('Google Sheets export error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export to Google Sheets' },
      { status: 500 }
    )
  }
}
