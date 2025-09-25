import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()

    // First, let's check if the table exists and see its structure
    const { data, error } = await supabase.from('content_types').select('*')
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch content types',
        details: error,
      })
    }

    // Try to insert a test record
    return NextResponse.json({
      success: true,
      message: 'Test completed successfully',
      data,
    })
  } catch (error) {
    console.error('🧪 TEST: Error in test:', error)
    return NextResponse.json({
      success: false,
      error,
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
