import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables on server:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
    })
    throw new Error(
      'Missing Supabase environment variables. Please check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    )
  }

  const cookieStore = cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          // Only set cookies in Server Actions or Route Handlers
          if (typeof window === 'undefined') {
            cookieStore.set({ name, value, ...options })
          }
        } catch {
          // Silently ignore cookie setting errors in non-server contexts
          // This prevents the console spam you're seeing
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          // Only remove cookies in Server Actions or Route Handlers
          if (typeof window === 'undefined') {
            cookieStore.set({ name, value: '', ...options })
          }
        } catch {
          // Silently ignore cookie removal errors in non-server contexts
        }
      },
    },
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      autoRefreshToken: false, // Disable auto refresh to prevent cookie issues
      persistSession: false, // Disable session persistence on server
    },
  })
}
