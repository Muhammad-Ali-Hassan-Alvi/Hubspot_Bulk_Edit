import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { getAuthenticatedGoogleSheetsClient } from '@/lib/google-auth-refresh'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { sheetId: string } }) {
  try {
    const { sheetId } = params
    const { searchParams } = new URL(request.url)
    const tabId = searchParams.get('tabId')

    // Get authenticated user
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get authenticated Google Sheets client with automatic token refresh
    const sheets = await getAuthenticatedGoogleSheetsClient(user.id, request.url)

    // Get spreadsheet info to find the correct sheet/tab
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
    const existingSheets = spreadsheetInfo.data.sheets ?? []

    let targetSheet = existingSheets[0] // Default to first sheet

    if (tabId) {
      const matchedSheet = existingSheets.find(
        sheet => sheet.properties?.sheetId?.toString() === tabId
      )
      if (matchedSheet) {
        targetSheet = matchedSheet
      }
    }

    if (!targetSheet?.properties?.title) {
      return NextResponse.json({ success: false, error: 'Sheet or tab not found' }, { status: 404 })
    }

    const sheetName = targetSheet.properties.title

    // Get all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:ZZ`, // Get all columns up to ZZ
    })

    const values = response.data.values
    if (!values || values.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        headers: [],
        sheetName,
      })
    }

    // First row should be headers
    const headers = values[0]
    const dataRows = values.slice(1)

    // Convert rows to objects using headers as keys
    const data = dataRows.map((row: any[], index: number) => {
      const rowData: any = {}

      headers.forEach((header: string, colIndex: number) => {
        const value = row[colIndex] || ''

        // Try to parse JSON values (for complex fields)
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            rowData[header] = JSON.parse(value)
          } catch {
            rowData[header] = value
          }
        } else {
          rowData[header] = value
        }
      })

      // Add row index as fallback ID if no ID column exists
      if (!rowData.id && !rowData.ID) {
        rowData._rowIndex = index + 2 // +2 because we skip header and arrays are 0-indexed but sheets are 1-indexed
      }

      return rowData
    })

    return NextResponse.json({
      success: true,
      data,
      headers,
      sheetName,
      totalRows: data.length,
    })
  } catch (error) {
    console.error('Error fetching sheet data:', error)

    // Handle specific token-related errors (same pattern as HubSpot)
    if (error instanceof Error) {
      if (
        error.message.includes('Google Sheets not connected') ||
        error.message.includes('Token refresh failed')
      ) {
        return NextResponse.json({ success: false, error: error.message }, { status: 401 })
      }
    }

    return NextResponse.json(
      { success: false, error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
