import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export async function POST(request: NextRequest) {
  try {
    const { contentType, exportType, sheetId, tabId, itemsCount, filename, tabName } =
      await request.json()

    console.log('Received export data:', {
      contentType,
      exportType,
      sheetId,
      tabId,
      itemsCount,
      filename,
      tabName,
    })

    // Validate required fields
    if (!contentType || !exportType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: contentType and exportType' },
        { status: 400 }
      )
    }

    // Validate export type
    if (!['csv', 'google-sheets'].includes(exportType)) {
      return NextResponse.json(
        { success: false, error: 'exportType must be either "csv" or "google-sheets"' },
        { status: 400 }
      )
    }

    // Get authenticated user
    console.log('Getting authenticated user...')
    const user = await getAuthenticatedUser()
    if (!user) {
      console.log('No authenticated user found')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    console.log('User authenticated:', user.id)

    console.log('Creating Supabase client...')
    let supabase
    try {
      supabase = createClient()
      console.log('Supabase client created successfully')
    } catch (clientError) {
      console.error('Failed to create Supabase client:', clientError)
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // Prepare the export record - start with minimal required fields
    const exportRecord: any = {
      user_id: user.id,
      content_type_id: parseInt(String(contentType), 10), // Ensure it's an integer
      export_type: exportType,
    }

    // Add optional fields that exist in the current schema
    if (sheetId) {
      exportRecord.sheet_id = sheetId
    }
    // Skip tab_id for now since it's causing type issues
    // We'll use tab_name instead which contains the same information
    // if (tabId) {
    //   exportRecord.tab_id = tabId
    // }
    // Skip tab_name for now since it's defined as INTEGER in the database
    // but we need to store string values like "Sheet1"
    // if (tabName) {
    //   exportRecord.tab_name = tabName
    // }
    // Skip filename for now since the column might not exist in the current schema
    // if (filename) {
    //   exportRecord.filename = filename
    // }

    // Add items_count if provided - ensure it's a number
    if (itemsCount !== undefined) {
      exportRecord.items_count = parseInt(String(itemsCount), 10)
    }

    // Insert the export record
    console.log('Preparing to insert export record:', exportRecord)
    console.log('Export record fields:', Object.keys(exportRecord))
    console.log('Export record values:', Object.values(exportRecord))

    const { data, error } = await supabase
      .from('user_exports')
      .insert(exportRecord)
      .select()
      .single()

    console.log('Database insert result:', { data, error })

    if (error) {
      console.error('Error inserting user export:', error)
      console.error('Export record that failed:', exportRecord)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to log export',
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      exportId: data.id,
      message: 'Export logged successfully',
    })
  } catch (error) {
    console.error('Export logging API error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'An internal server error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
