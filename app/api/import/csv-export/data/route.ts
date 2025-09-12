import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export async function POST(request: NextRequest) {
  try {
    const { fileName, csvContent } = await request.json()

    if (!fileName || !csvContent) {
      return NextResponse.json(
        { success: false, error: 'Missing fileName or csvContent' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const user = await getAuthenticatedUser()

    // Parse CSV content
    const lines = csvContent.split('\n').filter((line: string) => line.trim())
    if (lines.length === 0) {
      return NextResponse.json({
        success: true,
        rows: [],
      })
    }

    // Parse headers (first line)
    const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''))

    // Parse data rows
    const dataRows = lines.slice(1).map((line: string, index: number) => {
      const values = line.split(',').map((v: string) => v.trim().replace(/"/g, ''))
      const item: any = { id: `csv_${index}` }
      headers.forEach((header: string, i: number) => {
        item[header] = values[i] || ''
      })
      return item
    })

    // Log the data access activity
    const logData = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: user.id,
      action_type: 'read_csv_data',
      resource_type: 'csv',
      resource_id: fileName,
      details: {
        filename: fileName,
        rows_count: dataRows.length,
        headers: headers,
        timestamp: new Date().toISOString(),
        status: 'success',
      },
      created_at: new Date().toISOString(),
    }

    const { error: logError } = await supabase.from('audit_logs').insert(logData)
    if (logError) console.error('Failed to log CSV data access:', logError)

    return NextResponse.json({
      success: true,
      rows: dataRows,
      headers,
      totalRows: dataRows.length,
    })
  } catch (error) {
    console.error('CSV data read error:', error)
    return NextResponse.json({ success: false, error: 'Failed to read CSV data' }, { status: 500 })
  }
}
