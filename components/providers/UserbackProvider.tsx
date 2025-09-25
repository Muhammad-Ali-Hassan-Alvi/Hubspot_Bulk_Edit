'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'

interface UserbackProviderProps {
  children: React.ReactNode
}

export default function UserbackProvider({ children }: UserbackProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase.auth])

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_USERBACK_TOKEN

    if (!token) return

    // Inject Userback script dynamically
    const script = document.createElement('script')
    script.src = 'https://static.userback.io/widget/v1.js'
    script.async = true
    script.onload = () => {
      // Configure once script is loaded
      // @ts-expect-error - Userback is a global object
      window.Userback = window.Userback || {}
      // @ts-expect-error - Userback is a global object
      window.Userback.access_token = token

      if (user) {
        // @ts-expect-error - Userback is a global object
        window.Userback.user = {
          id: user.id,
          name: user.user_metadata?.full_name || user.email || 'User',
          email: user.email || '',
        }
      }

      console.log('Userback initialized ✅')
    }

    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [user])

  return <>{children}</>
}
