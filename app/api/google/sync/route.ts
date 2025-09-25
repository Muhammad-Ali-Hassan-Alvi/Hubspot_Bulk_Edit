import { type NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('=== Google Sheets Sync API Called ===')

  try {
    const { sheetId, tabName, pages, userId, filters } = await request.json()

    console.log('Sync request:', {
      sheetId,
      tabName,
      pagesCount: pages?.length,
      userId,
      filters,
    })

    if (!sheetId || !pages || !Array.isArray(pages)) {
      return NextResponse.json({ success: false, error: 'Missing required data' }, { status: 400 })
    }

    if (pages.length === 0) {
      return NextResponse.json({ success: false, error: 'No pages to sync' }, { status: 400 })
    }

    // Check for required environment variables
    const requiredEnvVars = {
      GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
    }

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars)
      return NextResponse.json(
        {
          success: false,
          error: `Missing Google API credentials: ${missingVars.join(', ')}`,
          details: 'Please check your environment variables in Vercel dashboard',
        },
        { status: 500 }
      )
    }

    console.log('Setting up Google Sheets API...')

    // Set up Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    console.log('Google Sheets API initialized')

    // Test if we can access the sheet
    try {
      console.log(`Testing access to sheet: ${sheetId}`)
      const sheetInfo = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      })
      console.log('Sheet access successful:', sheetInfo.data.properties?.title)
    } catch (accessError) {
      console.error('Sheet access error:', accessError)
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot access Google Sheet',
          details:
            'Make sure the sheet is shared with your service account email, or check if the sheet ID is correct',
          serviceAccount: process.env.GOOGLE_CLIENT_EMAIL,
        },
        { status: 403 }
      )
    }

    // Prepare the data for Google Sheets
    const headers = ['ID', 'Name', 'Slug', 'URL', 'Language', 'Domain', 'Last Updated', 'Status']

    const rows = pages.map((page: any) => [
      page.id || '',
      page.name || '',
      page.slug || '',
      page.url || '',
      page.language || '',
      page.domain || '',
      page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : '',
      page.status || 'PUBLISHED',
    ])

    const allData = [headers, ...rows]

    console.log(`Preparing to write ${rows.length} rows to sheet`)

    // Clear existing data and write new data
    const finalTabName = tabName || 'HubSpot Pages'

    try {
      // Try to create the tab first (in case it doesn't exist)
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: finalTabName,
                  },
                },
              },
            ],
          },
        })
        console.log(`Created new tab: ${finalTabName}`)
      } catch (tabError) {
        // Tab might already exist, that's okay
        console.log('Tab might already exist, continuing...', tabError)
      }

      // Clear the sheet first
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `${finalTabName}!A:Z`,
      })

      console.log('Cleared existing data')

      // Write the new data
      const writeResult = await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${finalTabName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: allData,
        },
      })

      console.log('Write result:', writeResult.data)

      // Format the header row
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0, // This might need to be dynamic
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    textFormat: { bold: true },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
          ],
        },
      })

      console.log('Applied header formatting')
    } catch (writeError) {
      console.error('Write error:', writeError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to write to Google Sheets',
          details: writeError instanceof Error ? writeError.message : 'Unknown write error',
        },
        { status: 500 }
      )
    }

    // Save sync session to Supabase
    if (userId) {
      try {
        const supabase = createClient()
        const { error: supabaseError } = await supabase.from('sync_sessions').insert({
          user_id: userId,
          sheet_id: sheetId,
          tab_name: finalTabName,
          pages_synced: pages.length,
          filters_applied: filters,
          synced_at: new Date().toISOString(),
        })

        if (supabaseError) {
          console.error('Supabase error:', supabaseError)
        } else {
          console.log('Sync session saved to Supabase')
        }
      } catch (supabaseError) {
        console.error('Supabase save error:', supabaseError)
        // Don't fail the whole request if Supabase fails
      }
    }

    console.log(`✅ Successfully synced ${pages.length} pages to Google Sheets`)

    return NextResponse.json({
      success: true,
      rowsWritten: pages.length,
      sheetId,
      tabName: finalTabName,
      message: `Successfully synced ${pages.length} pages to Google Sheets`,
    })
  } catch (error) {
    console.error('Google Sheets sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync to Google Sheets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
