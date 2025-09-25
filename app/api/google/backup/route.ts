import { type NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('=== Google Backup API Called ===')

  try {
    const { sheetId, tabName, pages, userId, backupSessionId } = await request.json()

    console.log('Backup request:', {
      sheetId,
      tabName,
      pagesCount: pages?.length,
      userId,
      backupSessionId,
    })

    if (!sheetId || !pages || !Array.isArray(pages)) {
      return NextResponse.json({ success: false, error: 'Missing required data' }, { status: 400 })
    }

    // Set up Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    // Prepare backup data with timestamp
    const headers = [
      'Backup Date',
      'ID',
      'Name',
      'Slug',
      'URL',
      'Language',
      'Domain',
      'Last Updated',
      'Status',
      'HTML Title',
      'Meta Description',
    ]

    const backupDate = new Date().toISOString()
    const rows = pages.map((page: any) => [
      backupDate,
      page.id || '',
      page.name || '',
      page.slug || '',
      page.url || '',
      page.language || '',
      page.domain || '',
      page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : '',
      page.status || 'PUBLISHED',
      page.htmlTitle || '',
      page.metaDescription || '',
    ])

    const allData = [headers, ...rows]

    // Create new tab for backup
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: tabName,
                },
              },
            },
          ],
        },
      })
      console.log(`Created backup tab: ${tabName}`)
    } catch (tabError) {
      console.log(tabError)
      console.log('Tab might already exist, continuing...')
    }

    // Write backup data
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${tabName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: allData,
      },
    })

    // Format the backup sheet
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

    console.log('Applied backup sheet formatting')

    // Save page snapshots to Supabase for change tracking
    if (userId) {
      try {
        const supabase = createClient()
        const snapshots = pages.map((page: any) => ({
          user_id: userId,
          page_id: page.id,
          page_name: page.name,
          page_slug: page.slug,
          page_url: page.url,
          page_content: page,
          snapshot_date: new Date().toISOString().split('T')[0],
        }))

        const { error: snapshotError } = await supabase
          .from('page_snapshots')
          .upsert(snapshots, { onConflict: 'user_id,page_id,snapshot_date' })

        if (snapshotError) {
          console.error('Snapshot error:', snapshotError)
        } else {
          console.log('Page snapshots saved to Supabase')
        }
      } catch (supabaseError) {
        console.error('Supabase snapshot error:', supabaseError)
      }
    }

    console.log(`✅ Successfully created backup with ${pages.length} pages`)

    return NextResponse.json({
      success: true,
      rowsWritten: pages.length,
      sheetId,
      tabName,
      backupDate,
      message: `Successfully created backup with ${pages.length} pages`,
    })
  } catch (error) {
    console.error('Google backup error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create backup',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
