'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  const [isLoading, setIsLoading] = useState(true)
  const isRefreshingRef = useRef(false)
  const googleOAuthSuccessRef = useRef(false)

  const fetchUserData = useCallback(async () => {
    if (!user) {
      router.push('/auth')
      return
    }
    
    // Don't fetch if we already have userSettings
    if (userSettings) {
      return
    }
    
    setIsLoading(true)
    
    try {
      // Fetch fresh user settings from the API
      const response = await fetch('/api/user/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.settings) {
          setUserSettings(data.settings)
          // Also update Redux store
          if (updateSettings) {
            await updateSettings(user.id, data.settings)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      // Fallback to Redux user settings
      if (reduxUserSettings) {
        setUserSettings(reduxUserSettings)
      }
    } finally {
      setIsLoading(false)
    }
  }, [user, router, updateSettings, reduxUserSettings]) // Removed userSettings from dependencies

  // Manual refresh function for when we need fresh data
  const refreshUserData = useCallback(async () => {
    if (!user) return
    
    // Prevent multiple simultaneous refresh calls
    if (isRefreshingRef.current) {
      return
    }
    
    isRefreshingRef.current = true
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/user/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.settings) {
          setUserSettings(data.settings)
          if (updateSettings) {
            await updateSettings(user.id, data.settings)
          }
        }
      }
    } catch (error) {
      console.error('Error manually refreshing user data:', error)
    } finally {
      isRefreshingRef.current = false
      setIsLoading(false)
    }
  }, [user, updateSettings])



  useEffect(() => {
    fetchUserData()

    const hubspotSuccess = searchParams.get('hubspot_oauth') === 'success'
    const googleSuccess = searchParams.get('success') === 'google_connected'

    if (hubspotSuccess) {
      setSuccessMessage('HubSpot has been connected successfully! 🎉')
      setContentRefreshKey(prevKey => prevKey + 1)
      router.replace('/dashboard', { scroll: false })
    } else if (googleSuccess && !googleOAuthSuccessRef.current) {
      googleOAuthSuccessRef.current = true
      setSuccessMessage('Google Sheets has been connected successfully! 📊')
      // Clear the success parameter immediately to prevent multiple triggers
      router.replace('/dashboard', { scroll: false })
      // Refresh data once for Google connection
      setTimeout(() => {
        refreshUserData()
        // Reset the flag after a delay
        setTimeout(() => {
          googleOAuthSuccessRef.current = false
        }, 2000)
      }, 100)
    }
  }, [searchParams, router, fetchUserData, refreshUserData])

  // Only refresh data when userSettings changes or when explicitly needed
  useEffect(() => {
    if (user && !userSettings) {
      fetchUserData()
    }
  }, [user, userSettings]) // Removed fetchUserData from dependencies to prevent infinite loop

  // Cleanup effect to reset flags
  useEffect(() => {
    return () => {
      googleOAuthSuccessRef.current = false
      isRefreshingRef.current = false
    }
  }, [])

  const handleConnectionUpdate = async (service: 'hubspot' | 'google', connected: boolean) => {
    if (connected) {
      if (service === 'hubspot') {
        setSuccessMessage('HubSpot has been connected successfully! 🎉')
        setHubspotModalOpen(false)
        setContentRefreshKey(prevKey => prevKey + 1)
      } else if (service === 'google') {
        setSuccessMessage('Google Sheets has been connected successfully! 📊')
        setGoogleModalOpen(false)
      }
      
      // Show loading state while refreshing data
      setIsLoading(true)
      
      // Force refresh user data to update connection status
      await refreshUserData()
      
      // Loading state will be cleared by refreshUserData
    }
  }

  const handleDisconnect = async (service: 'hubspot' | 'google') => {
    setIsDisconnecting(service)
    setIsLoading(true)
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not found. Please refresh.',
        variant: 'destructive',
      })
      setIsDisconnecting(null)
      setIsLoading(false)
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
      setIsLoading(false)
    }
  }



  // Show loading only if user is not available or data is loading
  if (!user || isLoading) {
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
  const isHubSpotConnected = userSettings ? (
    !!userSettings.hubspot_token_encrypted || 
    !!userSettings.hubspot_access_token || 
    !!userSettings.hubspot_connection_type
  ) : false
  
  const isGoogleConnected = userSettings ? (
    !!userSettings.google_refresh_token || 
    !!userSettings.google_access_token
  ) : false

  return (
    <div className="w-full space-y-6">
      {successMessage && (
        <SuccessAlert message={successMessage} onClose={() => setSuccessMessage(null)} />
      )}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your Hubspot Management Partner</p>
      </div>
      
      {/* Show loading overlay when refreshing data */}
      {isRefreshingRef.current && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-background border rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-sm font-medium">Refreshing connection data...</span>
          </div>
        </div>
      )}
      
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
