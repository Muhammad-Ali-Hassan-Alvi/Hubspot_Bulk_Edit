import { createClient } from '@/lib/supabase/server'
import { UserSettings } from './slices/userSettingsSlice'

export async function getServerUserSettings(userId: string): Promise<UserSettings | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching user settings:', error)
    return null
  }

  return data
}

export async function getServerUserSettingsWithUser() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, userSettings: null }
  }

  const userSettings = await getServerUserSettings(user.id)

  return { user, userSettings }
}

// New function to get user from Redux state (for client-side components)
export function getClientUser() {
  // This function should be used in client components where Redux is available
  // The actual implementation will be in a custom hook
  throw new Error('getClientUser should be used with useAppSelector in client components')
}

// Utility function for API routes to get authenticated user
export async function getAuthenticatedUser() {
  try {
    console.log('🔐 getAuthenticatedUser: Creating Supabase client...')
    const supabase = createClient()

    console.log('🔐 getAuthenticatedUser: Attempting to get user...')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log('🔐 getAuthenticatedUser: Auth response received:', {
      hasUser: !!user,
      hasError: !!authError,
      errorMessage: authError?.message,
      userId: user?.id,
    })

    if (authError) {
      console.error('❌ getAuthenticatedUser: Auth error:', authError)
      throw new Error(`Authentication error: ${authError.message}`)
    }

    if (!user) {
      console.error('❌ getAuthenticatedUser: No user found')
      throw new Error('No authenticated user found')
    }

    console.log('✅ getAuthenticatedUser: User authenticated successfully:', user.id)
    return user
  } catch (error) {
    console.error('❌ getAuthenticatedUser: Unexpected error:', error)
    throw error
  }
}
