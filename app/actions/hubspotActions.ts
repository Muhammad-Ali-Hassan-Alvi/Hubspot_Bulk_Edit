// app/actions/hubspotActions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

interface SaveConnectionPayload {
  accessToken: string
  connectionType: 'paid' | 'free'
  websiteDomain?: string | null
}

export async function saveHubspotConnection({ accessToken }: SaveConnectionPayload) {
  const supabase = createClient()
  const user = await getAuthenticatedUser()

  // Upsert the HubSpot integration. 'Upsert' means it will UPDATE the record
  // if one exists for this user and platform, or INSERT a new one if it doesn't.
  const { error } = await supabase.from('user_integrations').upsert({
    user_id: user.id,
    platform_id: 1, // Assuming '1' is the ID for HubSpot in your 'platforms' table
    access_token: accessToken,
    // We can store the connection type in user_metadata or another column if needed.
    // For now, let's keep it simple and just save the token.
    // If you add a 'meta' jsonb column to user_integrations, you could store it there.
  })

  if (error) {
    console.error('Error saving HubSpot connection:', error)
    throw new Error('Failed to save HubSpot connection.')
  }

  // Revalidate the connect page to ensure the UI updates with the new connection status.
  revalidatePath('/dashboard/connect')

  return { success: true }
}

export async function disconnectHubspot() {
  const supabase = createClient()
  const user = await getAuthenticatedUser()

  // Delete the HubSpot integration record for this user.
  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('platform_id', 1)

  if (error) {
    console.error('Error disconnecting HubSpot:', error)
    throw new Error('Failed to disconnect HubSpot.')
  }

  revalidatePath('/dashboard/connect')

  return { success: true }
}
