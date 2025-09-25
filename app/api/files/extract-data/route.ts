import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { createClient } from '@/lib/supabase/server'

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
    const sheetName = formData.get('sheetName') as string
    const sheetIndex = formData.get('sheetIndex') as string
    const contentType = formData.get('contentType') as string

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    if (!sheetName && !sheetIndex) {
      return NextResponse.json(
        { success: false, error: 'Either sheetName or sheetIndex must be provided' },
        { status: 400 }
      )
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
    let worksheet: XLSX.WorkSheet

    try {
      if (fileExtension === 'csv') {
        // For CSV files, there's only one sheet
        const csvText = buffer.toString('utf-8')
        workbook = XLSX.read(csvText, { type: 'string' })
        worksheet = workbook.Sheets[workbook.SheetNames[0]]
      } else {
        // For Excel files, get the specified sheet
        workbook = XLSX.read(buffer, { type: 'buffer' })

        let targetSheetName: string
        if (sheetName) {
          targetSheetName = sheetName
        } else {
          const index = parseInt(sheetIndex) - 1 // Convert to 0-based index
          if (index < 0 || index >= workbook.SheetNames.length) {
            return NextResponse.json(
              { success: false, error: 'Invalid sheet index' },
              { status: 400 }
            )
          }
          targetSheetName = workbook.SheetNames[index]
        }

        worksheet = workbook.Sheets[targetSheetName]
        if (!worksheet) {
          return NextResponse.json(
            { success: false, error: `Sheet "${targetSheetName}" not found` },
            { status: 400 }
          )
        }
      }

      // Convert worksheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Use array format first to get raw data
        defval: '', // Default value for empty cells
      }) as any[][]

      if (jsonData.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No data found in the selected sheet' },
          { status: 400 }
        )
      }

      // Get headers from first row
      const headers = jsonData[0] as string[]
      const dataRows = jsonData.slice(1)

      // Convert to object format with proper headers
      const transformedData = dataRows
        .map((row, index) => {
          const rowData: any = {
            id: `row-${index + 1}`, // Generate unique ID for each row
          }

          headers.forEach((header, colIndex) => {
            if (header && typeof header === 'string') {
              // Convert header to camelCase
              const camelCaseHeader = convertToCamelCase(header.toString())
              rowData[camelCaseHeader] = row[colIndex] || ''
            }
          })

          return rowData
        })
        .filter(row => {
          // Filter out completely empty rows
          const values = Object.values(row).filter(val => val !== '' && val !== 'id')
          return values.length > 0
        })

      console.log('Extracted data:', {
        fileName: file.name,
        sheetName: sheetName || workbook.SheetNames[parseInt(sheetIndex) - 1],
        rowCount: transformedData.length,
        columnCount: headers.length,
        headers: headers,
        sampleData: transformedData.slice(0, 2),
      })

      // Get header configurations for the content type if provided
      let headerConfigurations: any[] = []
      if (contentType) {
        try {
          const supabase = createClient()

          // Get content type ID
          const { data: contentTypeData } = await supabase
            .from('content_types')
            .select('id')
            .eq('slug', contentType)
            .single()

          if (contentTypeData) {
            // Get header configurations for this content type
            const { data: configs } = await supabase
              .from('header_configurations')
              .select(
                `
                *,
                header_definitions!inner(
                  id,
                  api_name,
                  display_name
                )
              `
              )
              .eq('content_type_id', contentTypeData.id)

            headerConfigurations = configs || []
            console.log('Header configurations loaded:', headerConfigurations.length)
          }
        } catch (error) {
          console.error('Error loading header configurations:', error)
          // Continue without header configurations
        }
      }

      // Transform data to include header information similar to Google Sheets
      const processedData = transformedData.map(row => {
        const inAppEditHeaders: { [key: string]: any } = {}
        const readOnlyHeaders: { [key: string]: any } = {}
        const headerInfo: { [key: string]: any } = {}

        // Process each field in the row
        Object.keys(row).forEach(key => {
          const value = row[key]

          // Find header configuration for this field
          const headerConfig = headerConfigurations.find(
            config => config.header_definitions?.api_name === key
          )

          if (headerConfig) {
            // Add header info
            headerInfo[key] = {
              category: headerConfig.category || 'Additional',
              isReadOnly: headerConfig.read_only || false,
              dataType: headerConfig.data_type || 'string',
              inAppEdit: headerConfig.in_app_edit || false,
            }

            // Categorize the field based on configuration
            if (headerConfig.in_app_edit) {
              inAppEditHeaders[key] = value
            } else if (headerConfig.read_only) {
              readOnlyHeaders[key] = value
            }
          }
        })

        // Create the same structure as Google Sheets data
        return {
          ...row,
          // Add these fields for compatibility with existing sync logic
          allHeaders: row,
          exportHeaders: row,
          inAppEditHeaders,
          readOnlyHeaders,
          headerInfo,
        }
      })

      return NextResponse.json({
        success: true,
        data: processedData,
        headers: headers,
        fileName: file.name,
        sheetName: sheetName || workbook.SheetNames[parseInt(sheetIndex) - 1],
        rowCount: processedData.length,
        columnCount: headers.length,
      })
    } catch (error) {
      console.error('Error extracting data from file:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to extract data from file. Please check the file format.',
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('File data extraction API error:', error)
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred' },
      { status: 500 }
    )
  }
}

// Helper function to convert strings to camelCase
function convertToCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^[^a-zA-Z]/, '') // Remove leading non-letters
    .replace(/[^a-zA-Z0-9]/g, '') // Remove any remaining special characters
}
