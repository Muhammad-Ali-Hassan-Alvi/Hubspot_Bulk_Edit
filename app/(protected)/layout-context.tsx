// app/dashboard/layout-context.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUserSettings'
import { useAppDispatch } from '@/lib/store/hooks'
import { setUser } from '@/lib/store/slices/userSlice'
import type { User } from '@/lib/store/slices/userSlice'

interface UserSettings {
  hubspot_token_encrypted?: string
  hubspot_access_token?: string
  google_refresh_token?: string
}

// Defines the complete shape of your context data
interface LayoutContextType {
  user: User | null
  isSidebarCollapsed: boolean
  isMobileOpen: boolean // CORRECTED NAME
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
  connectionStatus: {
    hubspot: boolean
    google: boolean
    loading: boolean
  }
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export function LayoutProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const dispatch = useAppDispatch()
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobileOpen, setMobileOpen] = useState(false) // CORRECTED NAME
  const [connectionStatus, setConnectionStatus] = useState({
    hubspot: false,
    google: false,
    loading: true,
  })

  // Initialize Redux user state from Supabase auth
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user: authUser },
          error,
        } = await supabase.auth.getUser()

        if (!error && authUser) {
          // Convert Supabase user to Redux user format
          const reduxUser: User = {
            id: authUser.id,
            email: authUser.email || '',
            user_metadata: authUser.user_metadata,
            app_metadata: authUser.app_metadata,
            created_at: authUser.created_at,
            updated_at: authUser.updated_at,
            aud: authUser.aud || 'authenticated',
          }
          dispatch(setUser(reduxUser))
        }
      } catch (error) {
        console.error('Error initializing user:', error)
      }
    }

    // Only initialize if user is not already in Redux
    if (!user) {
      initializeUser()
    }
  }, [user, dispatch])

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/user/settings')
        if (!response.ok) throw new Error('Failed to fetch settings')

        const data: { success: boolean; settings?: UserSettings } = await response.json()

        if (data.success && data.settings) {
          setConnectionStatus({
            hubspot: !!(
              data.settings.hubspot_token_encrypted || data.settings.hubspot_access_token
            ),
            google: !!data.settings.google_refresh_token,
            loading: false,
          })
        } else {
          setConnectionStatus({ hubspot: false, google: false, loading: false })
        }
      } catch (error) {
        console.error('Error fetching connection status:', error)
        setConnectionStatus({ hubspot: false, google: false, loading: false })
      }
    }

    fetchSettings()
  }, [])

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev)
  const toggleMobileSidebar = () => setMobileOpen(prev => !prev) // CORRECTED NAME
  const closeMobileSidebar = () => setMobileOpen(false) // CORRECTED NAME

  const value = {
    user,
    isSidebarCollapsed,
    isMobileOpen, // CORRECTED NAME
    toggleSidebar,
    toggleMobileSidebar,
    closeMobileSidebar,
    connectionStatus,
  }

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}
