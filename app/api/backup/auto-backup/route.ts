import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

export async function POST(request: NextRequest) {
  console.log('=== Auto Backup API Called ===')

  try {
    const { userId, hubspotToken, sheetId } = await request.json()

    if (!userId || !hubspotToken || !sheetId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const tabName = `hubspot-backup-${today}`

    // Create backup session
    const { data: backupSession, error: sessionError } = await supabase
      .from('backup_sessions')
      .insert({
        user_id: userId,
        sheet_id: sheetId,
        tab_name: tabName,
        backup_date: today,
        status: 'pending',
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Failed to create backup session:', sessionError)
      return NextResponse.json(
        { success: false, error: 'Failed to create backup session' },
        { status: 500 }
      )
    }

    // Fetch current pages from HubSpot
    const hubspotResponse = await fetch(
      `${request.url.replace('/api/backup/auto-backup', '/api/hubspot/pages')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: hubspotToken }),
      }
    )

    const hubspotData = await hubspotResponse.json()
    if (!hubspotData.success) {
      throw new Error(hubspotData.error || 'Failed to fetch HubSpot pages')
    }

    const currentPages = hubspotData.pages
    let changesDetected = 0
    const changedPages = []
    interface Change {
      field_name: string
      old_value: any
      new_value: any
      change_type: 'create' | 'update'
      page_id: string
    }

    const changes: Change[] = [] // Declare the changes variable here

    // Compare with previous snapshots and detect changes
    for (const page of currentPages) {
      const { data: lastSnapshot } = await supabase
        .from('page_snapshots')
        .select('*')
        .eq('user_id', userId)
        .eq('page_id', page.id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single()

      let hasChanges = false

      if (!lastSnapshot) {
        // New page
        hasChanges = true
        changes.push({
          field_name: 'page_created',
          old_value: null,
          new_value: 'Page created',
          change_type: 'create',
          page_id: page.id,
        })
      } else {
        // Check for changes in each field
        const fieldsToCheck = ['name', 'slug', 'url', 'status', 'updatedAt']

        for (const field of fieldsToCheck) {
          const oldValue = lastSnapshot.page_content[field]
          const newValue = page[field]

          if (oldValue !== newValue) {
            hasChanges = true
            changes.push({
              field_name: field,
              old_value: oldValue,
              new_value: newValue,
              change_type: 'update',
              page_id: page.id,
            })
          }
        }
      }

      if (hasChanges) {
        changesDetected++
        changedPages.push(page)

        // Store change history
        for (const change of changes.filter(c => c.page_id === page.id)) {
          await supabase.from('change_history').insert({
            user_id: userId,
            page_id: page.id,
            field_name: change.field_name,
            old_value: change.old_value,
            new_value: change.new_value,
            change_type: change.change_type,
            changed_by: userId,
            backup_session_id: backupSession.id,
          })
        }

        // Create/update snapshot
        await supabase.from('page_snapshots').upsert({
          user_id: userId,
          page_id: page.id,
          page_name: page.name,
          page_slug: page.slug,
          page_url: page.url,
          page_content: page,
          snapshot_date: today,
        })
      }
    }

    // Only sync to Google Sheets if there are changes
    if (changesDetected > 0) {
      // Set up Google Sheets API
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })

      const sheets = google.sheets({ version: 'v4', auth })

      // Create new tab for today's backup
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: { title: tabName },
                },
              },
            ],
          },
        })
      } catch (error) {
        console.log(error)
        // Tab might already exist
        console.log('Tab might already exist, continuing...')
      }

      // Prepare data for sheets - only changed pages
      const headers = [
        'Page ID',
        'Name',
        'Slug',
        'URL',
        'Status',
        'Last Updated',
        'Changes',
        'Change Type',
        'Previous Value',
      ]

      const rows = changedPages.map(page => {
        const pageChanges = changes.filter(c => c.page_id === page.id)
        const changesSummary = pageChanges
          .map(c => `${c.field_name}: ${c.old_value} → ${c.new_value}`)
          .join('; ')

        return [
          page.id,
          page.name,
          page.slug,
          page.url,
          page.status,
          new Date(page.updatedAt).toLocaleDateString(),
          changesSummary,
          pageChanges[0]?.change_type || 'update',
          pageChanges[0]?.old_value || '',
        ]
      })

      const allData = [headers, ...rows]

      // Write to Google Sheets
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${tabName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: allData },
      })

      // Format header row
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
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
    }

    // Update backup session
    await supabase
      .from('backup_sessions')
      .update({
        pages_backed_up: currentPages.length,
        changes_detected: changesDetected,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', backupSession.id)

    return NextResponse.json({
      success: true,
      backupSessionId: backupSession.id,
      pagesBackedUp: currentPages.length,
      changesDetected,
      tabName,
      message:
        changesDetected > 0
          ? `Backup completed: ${changesDetected} changes detected and synced to ${tabName}`
          : 'Backup completed: No changes detected since last backup',
    })
  } catch (error) {
    console.error('Auto backup error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Auto backup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
