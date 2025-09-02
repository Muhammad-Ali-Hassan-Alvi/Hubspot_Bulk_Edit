// app/actions/reportActions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getHubSpotPageCounts } from '@/lib/hubspot/api'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export async function refreshPageCountsAction() {
  const supabase = createClient()
  const user = await getAuthenticatedUser()

  // Fetch the HubSpot token from the new user_integrations table
  const { data: hubspotIntegration } = await supabase
    .from('user_integrations')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('platform_id', 1) // Assuming 1 is the ID for 'hubspot'
    .single()

  if (!hubspotIntegration?.access_token) {
    return { success: false, error: 'HubSpot token not found.' }
  }

  // This function will fetch the new data, but we don't need to return it.
  // The `revalidatePath` call is the magic that tells Next.js to update the page.
  await getHubSpotPageCounts(hubspotIntegration.access_token)

  // Invalidate the cache for the reports page, forcing Next.js to re-fetch the data.
  revalidatePath('/reports')

  return { success: true, message: 'Data refreshed successfully.' }
}
