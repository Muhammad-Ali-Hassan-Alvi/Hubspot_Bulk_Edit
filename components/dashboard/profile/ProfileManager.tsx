'use client'

import React, { useEffect, useState, Suspense } from 'react'
import type { User } from '@supabase/supabase-js'
import { useToast } from '@/hooks/use-toast'
import ProfileInformation from './components/ProfileInformation'
import SignInMethods from './components/SignInMethods'
import { useSearchParams, useRouter } from 'next/navigation'

// No need to import createClient here anymore for the handler

function ProfileMessageHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // We only want this effect to run once when parameters are present
    if (
      searchParams.has('message') ||
      searchParams.has('code') ||
      searchParams.has('error_description')
    ) {
      const message = searchParams.get('message')
      const code = searchParams.get('code')
      const error = searchParams.get('error_description')

      // Handle the first confirmation step (from the OLD email)
      if (message) {
        if (message === 'account_linked') {
          const email = searchParams.get('email')
          toast({
            title: 'Account linked successfully!',
            description: `Your Google account (${email}) has been linked to your profile.`,
            duration: 10000,
          })
        } else {
          toast({
            title: 'Check your new email inbox',
            description:
              'A final verification link has been sent to your new email address to complete the change.',
            duration: 10000,
          })
        }
      }
      // Handle the final confirmation step (from the NEW email)
      else if (code) {
        // The Supabase client has already handled the code exchange automatically.
        // We just need to show a success message and refresh the UI.
        toast({
          title: 'Email successfully changed!',
          description: 'Your sign-in email has been updated.',
        })
      }
      // Handle any generic errors
      else if (error) {
        toast({
          title: 'An error occurred',
          description: error,
          variant: 'destructive',
        })
      }

      // Clean the URL and refresh server components to get the updated user info
      router.replace('/dashboard/profile', { scroll: false })
      router.refresh()
    }
  }, [searchParams, toast, router])

  return null
}

interface ProfileManagerProps {
  user: User
}

export default function ProfileManager({ user }: ProfileManagerProps) {
  const { toast } = useToast()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyDomain] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [, setUserSettings] = useState<any | null>(null)

  useEffect(() => {
    if (user?.user_metadata) {
      const meta = user.user_metadata
      if (meta.first_name || meta.last_name) {
        setFirstName(meta.first_name || '')
        setLastName(meta.last_name || '')
      } else if (meta.full_name) {
        const parts = meta.full_name.split(' ')
        setFirstName(parts[0] || '')
        setLastName(parts.slice(1).join(' ') || '')
      }
    }
    const fetchUserSettings = async () => {
      setIsLoadingSettings(true)
      const res = await fetch('/api/user/settings', { cache: 'no-store' })
      if (!res.ok) {
        toast({
          title: 'Error',
          description: 'Failed to load user settings',
          variant: 'destructive',
        })
        setIsLoadingSettings(false)
        return
      }
      const data = await res.json()
      if (data.success && data.settings) {
        setUserSettings(data.settings)
        setCompanyName(data.settings.company_name || '')
        setCompanyDomain(data.settings.company_address || '')
      }
      setIsLoadingSettings(false)
    }
    fetchUserSettings()
  }, [user, toast])

  return (
    <>
      <Suspense fallback={null}>
        <ProfileMessageHandler />
      </Suspense>

      <ProfileInformation
        firstName={firstName}
        lastName={lastName}
        companyName={companyName}
        companyAddress={companyAddress}
        setFirstName={setFirstName}
        setLastName={setLastName}
        setCompanyName={setCompanyName}
        setCompanyDomain={setCompanyDomain}
        user={user}
        isSavingProfile={isSavingProfile}
        isSavingSettings={isLoadingSettings}
        setIsSavingSettings={setIsLoadingSettings}
        setIsSavingProfile={setIsSavingProfile}
      />
      <SignInMethods user={user} isLoadingSettings={isLoadingSettings} />
    </>
  )
}
