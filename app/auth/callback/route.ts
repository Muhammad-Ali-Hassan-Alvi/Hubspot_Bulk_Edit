// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getServerUserSettings } from '@/lib/store/serverUtils'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const linkAccount = searchParams.get('link') === 'true'

  if (code) {
    const supabase = createClient()
    
    // Check if user is already logged in (for account linking)
    const { data: { user: existingUser } } = await supabase.auth.getUser()
    
    if (linkAccount && existingUser) {
      // This is an account linking scenario
      console.log('🔗 Account linking detected for user:', existingUser.id)
      
      try {
        // Exchange the code for a session to get the new identity
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (error) {
          console.error('❌ Failed to exchange code for linking:', error)
          return NextResponse.redirect(`${origin}/auth/auth-code-error?error=link_failed`)
        }

        if (data.user) {
          console.log('✅ New identity linked successfully:', data.user.email)
          
          // Redirect back to profile with success message
          return NextResponse.redirect(`${origin}/dashboard/profile?message=account_linked&email=${data.user.email}`)
        }
      } catch (error) {
        console.error('❌ Error during account linking:', error)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=link_failed`)
      }
    } else {
      // Normal OAuth sign-in flow
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      // Check if the exchange was successful and a user session exists
      if (!error && data.user) {
        console.log('✅ Server-side code exchange successful for:', data.user.email)

        // --- This is where we robustly create the user_settings ---
        // This solves the original race condition because it's awaited on the server.
        console.log('Verifying user settings on the server for user:', data.user.id)
        const userSettings = await getServerUserSettings(data.user.id)

        // If no settings exist, create them
        if (!userSettings) {
          console.log('...No settings found. Creating new user_settings row on server...')
          const { error: insertError } = await supabase
            .from('user_settings')
            .insert([{ user_id: data.user.id }])

          if (insertError) {
            console.error('❌ CRITICAL: Failed to create user_settings on server:', insertError)
            // This is a critical failure, redirect to error page
            return NextResponse.redirect(`${origin}/auth/auth-code-error`)
          }
          console.log('✅ user_settings created successfully on the server.')
        } else {
          console.log('✅ user_settings already exist on the server.')
        }
        // --- End of user_settings logic ---

        // URL to redirect to after sign in process completes
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  console.error('❌ Server-side callback error: No code or exchange failed.')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
