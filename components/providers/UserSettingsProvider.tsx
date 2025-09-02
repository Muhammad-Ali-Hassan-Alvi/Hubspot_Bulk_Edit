'use client'

import { useEffect } from 'react'
import { useAppDispatch } from '@/lib/store/hooks'
import { setUserSettings } from '@/lib/store/slices/userSettingsSlice'
import { UserSettings } from '@/lib/store/slices/userSettingsSlice'

interface UserSettingsProviderProps {
  children: React.ReactNode
  initialUserSettings?: UserSettings | null
}

export function UserSettingsProvider({ children, initialUserSettings }: UserSettingsProviderProps) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (initialUserSettings) {
      dispatch(setUserSettings(initialUserSettings))
    }
  }, [dispatch, initialUserSettings])

  return <>{children}</>
}
