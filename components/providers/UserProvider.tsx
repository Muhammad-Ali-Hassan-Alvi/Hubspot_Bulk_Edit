'use client'

import { useEffect } from 'react'
import { useAppDispatch } from '@/lib/store/hooks'
import { setUser } from '@/lib/store/slices/userSlice'
import type { User as ReduxUser } from '@/lib/store/slices/userSlice'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface UserProviderProps {
  children: React.ReactNode
  initialUser?: SupabaseUser | null
}

export function UserProvider({ children, initialUser }: UserProviderProps) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (initialUser) {
      // Convert Supabase user to Redux user format
      const reduxUser: ReduxUser = {
        id: initialUser.id,
        email: initialUser.email || '',
        user_metadata: initialUser.user_metadata,
        app_metadata: initialUser.app_metadata,
        created_at: initialUser.created_at,
        updated_at: initialUser.updated_at,
        aud: initialUser.aud || 'authenticated',
      }
      dispatch(setUser(reduxUser))
    }
  }, [dispatch, initialUser])

  return <>{children}</>
}
