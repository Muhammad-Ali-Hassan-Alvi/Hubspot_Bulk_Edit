import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔐 Auth Status API: Starting authentication check...')
    
    const supabase = createClient()
    console.log('✅ Auth Status API: Supabase client created successfully')
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log('🔐 Auth Status API: Auth response received:', {
      hasUser: !!user,
      hasError: !!authError,
      errorMessage: authError?.message,
      userId: user?.id,
      userEmail: user?.email
    })

    if (authError) {
      console.error('❌ Auth Status API: Auth error:', authError)
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: authError.message,
        details: 'Authentication failed'
      }, { status: 401 })
    }

    if (!user) {
      console.error('❌ Auth Status API: No user found')
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: 'No authenticated user found',
        details: 'User session may have expired'
      }, { status: 401 })
    }

    console.log('✅ Auth Status API: User authenticated successfully:', user.id)
    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at
      }
    })
  } catch (error) {
    console.error('❌ Auth Status API: Unexpected error:', error)
    return NextResponse.json({
      success: false,
      authenticated: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
