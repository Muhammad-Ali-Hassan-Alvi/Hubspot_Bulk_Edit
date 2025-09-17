import { type NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { auditLogger } from '@/lib/services/audit-logger'

export async function POST(request: NextRequest, { params }: { params: { sheetId: string } }) {
  try {
    const { tabName } = await request.json()
    const { sheetId } = params

    if (!sheetId || !tabName) {
      return NextResponse.json(
        { success: false, error: 'Missing sheet ID or tab name' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const user = await getAuthenticatedUser()

    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('google_access_token')
      .eq('user_id', user.id)
      .single()

    if (!userSettings?.google_access_token) {
      return NextResponse.json(
        { success: false, error: 'Google Sheets not connected' },
        { status: 400 }
      )
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: userSettings.google_access_token })

    const sheets = google.sheets({ version: 'v4', auth })

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!A:AZ`,
    })

    const rows = response.data.values || []

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        rows: [],
      })
    }

    const headers = rows[0]
    const dataRows = rows.slice(1)

    const processedData = dataRows.map((row, index) => {
      const item: any = { id: `gsheet_${index}` }
      headers.forEach((header, i) => {
        item[header] = row[i] || ''
      })
      return item
    })

    await auditLogger.logGoogleSheetsImport(user.id, sheetId, tabName, processedData.length)

    return NextResponse.json({
      success: true,
      rows: processedData,
      headers: headers,
    })
  } catch (error) {
    console.error('Error fetching sheet data:', error)

    // Provide more specific error messages
    let errorMessage = 'Failed to fetch sheet data'
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorMessage = 'Google Sheets access expired. Please reconnect your Google account.'
      } else if (error.message.includes('403') || error.message.includes('forbidden')) {
        errorMessage = 'Access denied. Please check sheet permissions.'
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        errorMessage = 'Sheet or tab not found. Please check the sheet ID and tab name.'
      } else {
        errorMessage = `Failed to fetch sheet data: ${error.message}`
      }
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
