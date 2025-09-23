import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    // Check file type
    const fileExtension = file.name.toLowerCase().split('.').pop()
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type. Please upload CSV or Excel files.' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    let workbook: XLSX.WorkBook
    let sheets: { id: string; name: string }[] = []

    try {
      if (fileExtension === 'csv') {
        // For CSV files, create a single sheet
        const csvText = buffer.toString('utf-8')
        workbook = XLSX.read(csvText, { type: 'string' })
        sheets = [{ id: 'sheet1', name: 'CSV Data' }]
      } else {
        // For Excel files, read all sheets
        workbook = XLSX.read(buffer, { type: 'buffer' })
        sheets = workbook.SheetNames.map((name, index) => ({
          id: `sheet${index + 1}`,
          name: name,
        }))
      }

      console.log('Processed file:', {
        fileName: file.name,
        fileType: fileExtension,
        sheetsCount: sheets.length,
        sheetNames: sheets.map(s => s.name),
      })

      return NextResponse.json({
        success: true,
        fileName: file.name,
        fileType: fileExtension,
        sheets: sheets,
        message: `File processed successfully. Found ${sheets.length} sheet(s).`,
      })
    } catch (error) {
      console.error('Error processing file:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to process file. Please check the file format.' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('File processing API error:', error)
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred' },
      { status: 500 }
    )
  }
}
