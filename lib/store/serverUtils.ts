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
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  return user
}
