// lib/hubspot-auth.ts
import { createClient } from '@/lib/supabase/server'
import { getServerUserSettings } from '@/lib/store/serverUtils'

export interface HubSpotTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date | null
}

export async function getRefreshedHubSpotToken(userId: string): Promise<HubSpotTokens> {
  const userSettings = await getServerUserSettings(userId)

  if (!userSettings) {
    throw new Error('User settings not found')
  }

  // For Private App Tokens (PAT), they don't expire, so return as-is
  if (
    userSettings.hubspot_token_encrypted &&
    (userSettings.hubspot_connection_type === 'paid' ||
      userSettings.hubspot_connection_type === 'pat')
  ) {
    return {
      accessToken: userSettings.hubspot_token_encrypted,
    }
  }

  // For OAuth tokens, check expiration and refresh if needed
  const accessToken = userSettings.hubspot_access_token
  const refreshToken = userSettings.hubspot_refresh_token
  const expiresAt = userSettings.hubspot_token_expires_at
    ? new Date(userSettings.hubspot_token_expires_at)
    : null

  if (!accessToken) {
    throw new Error('HubSpot not connected')
  }

  const now = new Date()

  // Check if access token is expired and we have a refresh token
  if (expiresAt && now >= expiresAt && refreshToken) {
    console.log('🔄 HubSpot access token expired, refreshing...')

    try {
      const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID!,
          client_secret: process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_SECRET!,
          refresh_token: refreshToken,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ HubSpot token refresh failed:', response.status, errorText)
        throw new Error(`HubSpot token refresh failed: ${response.status}`)
      }

      const tokenData = await response.json()
      const newAccessToken = tokenData.access_token
      const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

      // Update tokens in database
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({
          hubspot_access_token: newAccessToken,
          hubspot_token_expires_at: newExpiresAt.toISOString(),
          // Note: HubSpot may or may not return a new refresh token
          ...(tokenData.refresh_token && { hubspot_refresh_token: tokenData.refresh_token }),
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('❌ Failed to update HubSpot tokens in database:', updateError)
        throw new Error('Failed to update tokens in database')
      }

      console.log('✅ HubSpot token refreshed successfully')

      return {
        accessToken: newAccessToken,
        refreshToken: tokenData.refresh_token || refreshToken,
        expiresAt: newExpiresAt,
      }
    } catch (error) {
      console.error('❌ HubSpot token refresh error:', error)
      throw new Error(
        `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Token is still valid or no refresh token available
  return {
    accessToken,
    refreshToken: refreshToken || undefined,
    expiresAt,
  }
}

export async function getHubSpotAuthHeaders(userId: string): Promise<HeadersInit> {
  const tokens = await getRefreshedHubSpotToken(userId)
  return {
    Authorization: `Bearer ${tokens.accessToken}`,
    'Content-Type': 'application/json',
  }
}
