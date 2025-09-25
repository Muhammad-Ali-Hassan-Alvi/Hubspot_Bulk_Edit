import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(_request: NextRequest) {
  try {
    console.log('🧪 TEST: Testing audit_logs table')

    const supabase = createClient()

    // Try with service role to bypass RLS
    const supabaseService = createServiceClient()

    // First, let's check if the table exists and see its structure
    console.log('🧪 TEST: Checking table structure...')

    const { data: tableInfo, error: tableError } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(1)

    console.log('🧪 TEST: Table info:', { tableInfo, tableError })

    // Try to insert a test record
    const testLogData = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: '08512571-b8c7-41b0-a309-4010217296af',
      action_type: 'test_action',
      resource_type: 'test_resource',
      details: {
        test: true,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    }

    console.log('🧪 TEST: Attempting to insert test data:', testLogData)

    const { data: insertData, error: insertError } = await supabaseService
      .from('audit_logs')
      .insert(testLogData)
      .select()

    console.log('🧪 TEST: Insert result:', { insertData, insertError })

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to insert test record',
        details: insertError,
        tableInfo,
      })
    }

    // Now let's try to read it back
    const { data: readData, error: readError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', testLogData.id)

    console.log('🧪 TEST: Read back result:', { readData, readError })

    return NextResponse.json({
      success: true,
      message: 'Test completed successfully',
      insertData,
      readData,
      tableInfo,
    })
  } catch (error) {
    console.error('🧪 TEST: Error in test:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
