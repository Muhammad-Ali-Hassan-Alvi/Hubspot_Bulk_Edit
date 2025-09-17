import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { auditLogger } from '@/lib/services/audit-logger'
import { createExportService } from '@/lib/services/export-service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { data, columns, contentType = 'Landing Page' } = await request.json()
    console.log('CSV export request:', {
      dataLength: data?.length,
      columnsLength: columns?.length,
      contentType,
    })

    if (!data || !columns) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: data or columns' },
        { status: 400 }
      )
    }

    console.log('Getting authenticated user...')
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    console.log('User authenticated:', user.id)

    console.log('Creating export service...')
    const exportService = await createExportService()
    console.log('Export service created')

    // Export to CSV using unified service
    console.log('Starting CSV export...')
    // Extract content type name from object if it's an object
    const contentTypeName = typeof contentType === 'object' ? contentType.name : contentType
    console.log('Content type name:', contentTypeName)
    const result = await exportService.exportToCSV(data, columns, { contentType: contentTypeName })
    console.log('CSV export result:', { success: result.success, error: result.error })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    // Log the export activity
    console.log('Logging CSV export to audit...')
    try {
      await auditLogger.logCsvExport(
        user.id,
        contentTypeName,
        result.rowsAdded,
        columns,
        result.filename!,
        new Blob([result.csvContent!]).size
      )
      console.log('CSV export logged to audit successfully')
    } catch (auditError) {
      console.error('Audit logging failed:', auditError)
      // Don't fail the export if audit logging fails
    }

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
