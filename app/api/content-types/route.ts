import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()

    // Fetch content types from the database
    const { data, error } = await supabase.from('content_types').select('*')

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch content types',
        details: error,
      })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Error in content-types route:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
