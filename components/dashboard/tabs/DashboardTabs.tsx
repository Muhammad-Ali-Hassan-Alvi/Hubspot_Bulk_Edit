'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
// import type { User } from '@supabase/supabase-js'
import { useToast } from '@/hooks/use-toast'
import { useUserSettings, useUser } from '@/hooks/useUserSettings'
import HubSpot from './components/HubSpot'
import ConnectCardSkeleton from '@/components/ui/skeleton/ConnectCardSkeleton'
import GoogleSheet from './components/GoogleSheets'
import AccountPlan from './components/AccountPlan'
import SuccessAlert from '@/components/alerts/SuccessAlert'
import { ContentCountsCard } from '../reports/ContentCountsCard'

export default function DashboardOverviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { userSettings: reduxUserSettings, updateSettings } = useUserSettings()
  const { user } = useUser()
  const [userSettings, setUserSettings] = useState<any>(null)
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [hubspotModalOpen, setHubspotModalOpen] = useState(false)
  const [googleModalOpen, setGoogleModalOpen] = useState(false)
  const [contentRefreshKey, setContentRefreshKey] = useState(0)

  const fetchUserData = useCallback(async () => {
    if (!user) {
      router.push('/auth')
      return
    }
    // Use Redux user settings
    if (reduxUserSettings) {
      setUserSettings(reduxUserSettings)
    }
  }, [user, router, reduxUserSettings])

  useEffect(() => {
    fetchUserData()

    const hubspotSuccess = searchParams.get('hubspot_oauth') === 'success'
    const googleSuccess = searchParams.get('success') === 'google_connected'

    if (hubspotSuccess) {
      setSuccessMessage('HubSpot has been connected successfully! 🎉')
      setContentRefreshKey(prevKey => prevKey + 1)
      router.replace('/dashboard', { scroll: false })
    } else if (googleSuccess) {
      setSuccessMessage('Google Sheets has been connected successfully! 📊')
      router.replace('/dashboard', { scroll: false })
    }
  }, [searchParams, router, fetchUserData])

  const handleConnectionUpdate = (service: 'hubspot' | 'google', connected: boolean) => {
    if (connected) {
      if (service === 'hubspot') {
        setSuccessMessage('HubSpot has been connected successfully! 🎉')
        setHubspotModalOpen(false)
        setContentRefreshKey(prevKey => prevKey + 1)
      } else if (service === 'google') {
        setSuccessMessage('Google Sheets has been connected successfully! 📊')
        setGoogleModalOpen(false)
      }
    }
    fetchUserData()
  }

  const handleDisconnect = async (service: 'hubspot' | 'google') => {
    setIsDisconnecting(service)
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not found. Please refresh.',
        variant: 'destructive',
      })
      setIsDisconnecting(null)
      return
    }
    try {
      let updateData: any = {}
      if (service === 'hubspot') {
        updateData = {
          hubspot_token_encrypted: null,
          hubspot_access_token: null,
          hubspot_connection_type: null,
          hubspot_refresh_token: null,
          hubspot_token_expires_at: null,
        }
      } else if (service === 'google') {
        updateData = {
          google_access_token: null,
          google_refresh_token: null,
          backup_sheet_id: null,
        }
      }

      if (Object.keys(updateData).length === 0) throw new Error('Nothing to update')

      // Use Redux to update user settings
      await updateSettings(user.id, updateData)
      toast({
        title: 'Disconnected Successfully',
        description: `Your ${service} account has been disconnected.`,
      })

      if (service === 'hubspot') {
        setContentRefreshKey(prevKey => prevKey + 1)
      }

      await fetchUserData()
    } catch (error) {
      toast({
        title: 'Disconnection Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsDisconnecting(null)
    }
  }

  console.log('UMAR userSettings', userSettings)
  console.log('UMAR user', user)

  // Show loading only if user is not available
  if (!user) {
    return (
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your Hubspot Management Partner</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-background p-6 rounded-lg border flex flex-col justify-between">
            <ConnectCardSkeleton />
          </div>
          <div className="bg-background p-6 rounded-lg border flex flex-col justify-between">
            <ConnectCardSkeleton />
          </div>
          <div className="bg-background p-6 rounded-lg border flex flex-col justify-between">
            <ConnectCardSkeleton />
          </div>
        </div>
        <ContentCountsCard refreshKey={contentRefreshKey} />
      </div>
    )
  }

  // For new users, userSettings might be null - that's okay, show the connection options
  const isHubSpotConnected =
    !!userSettings?.hubspot_token_encrypted || !!userSettings?.hubspot_access_token
  const isGoogleConnected = !!userSettings?.google_refresh_token

  return (
    <div className="w-full space-y-6">
      {successMessage && (
        <SuccessAlert message={successMessage} onClose={() => setSuccessMessage(null)} />
      )}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your Hubspot Management Partner</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-background p-6 rounded-lg border flex flex-col justify-between">
          <HubSpot
            isHubSpotConnected={isHubSpotConnected}
            handleConnectionUpdate={connected => handleConnectionUpdate('hubspot', connected)}
            user={user}
            isDisconnecting={isDisconnecting}
            handleDisconnect={handleDisconnect}
            hubspotModalOpen={hubspotModalOpen}
            setHubspotModalOpen={setHubspotModalOpen}
            userSettings={userSettings}
          />
        </div>
        <div className="bg-background p-6 rounded-lg border flex flex-col justify-between">
          <GoogleSheet
            isGoogleConnected={isGoogleConnected}
            handleConnectionUpdate={connected => handleConnectionUpdate('google', connected)}
            user={user}
            isDisconnecting={isDisconnecting}
            handleDisconnect={handleDisconnect}
            googleModalOpen={googleModalOpen}
            setGoogleModalOpen={setGoogleModalOpen}
            userSettings={userSettings}
          />
        </div>
        <div className="bg-background p-6 rounded-lg border flex flex-col justify-between">
          <AccountPlan />
        </div>
      </div>
      <ContentCountsCard refreshKey={contentRefreshKey} />
    </div>
  )
}
