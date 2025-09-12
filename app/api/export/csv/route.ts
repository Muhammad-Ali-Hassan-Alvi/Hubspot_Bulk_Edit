import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { normalizeContentType } from '@/lib/utils'
import { auditLogger } from '@/lib/services/audit-logger'
import { createExportService } from '@/lib/services/export-service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { data, columns, contentType = 'Landing Page' } = await request.json()
    if (!data || !columns) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: data or columns' },
        { status: 400 }
      )
    }

    const user = await getAuthenticatedUser()
    const exportService = await createExportService()

    // Export to CSV using unified service
    const result = await exportService.exportToCSV(data, columns, { contentType })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    // Log the export activity
    await auditLogger.logCsvExport(
      user.id,
      contentType,
      result.rowsAdded,
      columns,
      result.filename!,
      new Blob([result.csvContent!]).size
    )

    return NextResponse.json({
      success: true,
      message: result.message,
      rowsAdded: result.rowsAdded,
      csvContent: result.csvContent,
      filename: result.filename,
      backupId: result.backupId,
    })
  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json({ success: false, error: 'Failed to export to CSV' }, { status: 500 })
  }
}