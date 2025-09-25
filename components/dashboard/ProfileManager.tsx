'use client'

import React, { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { useUserSettings } from '@/hooks/useUserSettings'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, UserCircle, KeyRound, Mail } from 'lucide-react'

// (Icons are here, no changes)
const GoogleIcon = () => (
  <svg role="img" viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

interface ProfileManagerProps {
  user: User
}

export default function ProfileManager({ user }: ProfileManagerProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const { userSettings, loading: isLoadingSettings, updateSettings } = useUserSettings()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  // Find each specific identity from the user object
  const emailIdentity = user.identities?.find(i => i.provider === 'email')
  const googleIdentity = user.identities?.find(i => i.provider === 'google')

  // An email/password user is one who has an 'email' identity
  const isEmailPasswordUser = !!emailIdentity
  const lastUsedProvider = user.app_metadata.provider

  const formatTimeAgo = (date?: string) =>
    date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : 'some time ago'

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
  }, [user])

  // Set company info from Redux user settings
  useEffect(() => {
    if (userSettings) {
      setCompanyName(userSettings.company_name || '')
      setCompanyAddress(userSettings.company_address || '')
    }
  }, [userSettings])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim()) {
      toast({ title: 'First name required', variant: 'destructive' })
      return
    }
    setIsSavingProfile(true)
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()

    try {
      const [authRes] = await Promise.all([
        supabase.auth.updateUser({
          data: { first_name: firstName, last_name: lastName, full_name: fullName },
        }),
        updateSettings(user.id, { company_name: companyName, company_address: companyAddress }),
      ])

      if (authRes.error) {
        toast({
          title: 'Error saving profile',
          description: authRes.error?.message,
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Profile Updated', description: 'Your info was saved successfully.' })
      }
    } catch {
      toast({
        title: 'Error saving profile',
        description: 'Failed to update settings',
        variant: 'destructive',
      })
    }
    setIsSavingProfile(false)
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    if (newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Must be at least 6 characters.',
        variant: 'destructive',
      })
      return
    }
    setIsSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast({ title: 'Password Error', description: error.message, variant: 'destructive' })
    } else {
      toast({
        title: 'Password Set',
        description: 'You can now sign in with your email and new password.',
      })
      setNewPassword('')
      setConfirmPassword('')
      // You might want to refresh the page or user state to update the UI
      window.location.reload()
    }
    setIsSavingPassword(false)
  }

  // const handleOAuthSignIn = async (provider: Provider) => {
  //   await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.href } })
  // }

  // const handleOAuthUnlink = async (identity: any) => {
  //   const { error } = await supabase.auth.unlinkIdentity(identity)
  //   if (error) {
  //     toast({
  //       title: `Error disconnecting from ${identity.provider}`,
  //       description: error.message,
  //       variant: 'destructive',
  //     })
  //   } else {
  //     toast({ title: 'Disconnected', description: `You have disconnected ${identity.provider}` })
  //     window.location.reload()
  //   }
  // }

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleProfileUpdate}>
          <CardHeader>
            <CardTitle>
              <UserCircle className="h-5 w-5 mr-2 inline" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Company Name</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </div>
            <div>
              <Label>Company Address</Label>
              <Input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Profile
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sign-in Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingSettings ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-4">
                  <Mail />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Always show last login time */}
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(user.last_sign_in_at)}
                  </p>
                  {isEmailPasswordUser && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => document.getElementById('newPassword')?.focus()}
                    >
                      Change Password
                    </Button>
                  )}
                </div>
              </div>

              {googleIdentity && (
                <div className="flex justify-between items-center border-b pb-3">
                  <div className="flex items-center gap-4">
                    <GoogleIcon />
                    <div>
                      <p className="font-medium">Google</p>
                      <p className="text-sm text-muted-foreground">Connected</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* FIX: Show timestamp, using the freshest one if Google was last used */}
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(
                        lastUsedProvider === 'google'
                          ? user.last_sign_in_at
                          : googleIdentity.last_sign_in_at
                      )}
                    </p>
                    {/* <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleOAuthSignIn('google')}>
                          Re-authenticate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOAuthUnlink(googleIdentity)}
                          className="text-red-500"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Disconnect
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu> */}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <form onSubmit={handlePasswordUpdate}>
          <CardHeader>
            <CardTitle>
              <KeyRound className="h-5 w-5 mr-2 inline" />
              {isEmailPasswordUser ? 'Change Password' : 'Add a Password'}
            </CardTitle>
            <CardDescription>
              {isEmailPasswordUser
                ? 'Choose a new password. It must be at least 6 characters long.'
                : 'Add a password to your account for an alternative sign-in method.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSavingPassword}>
              {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEmailPasswordUser ? 'Update Password' : 'Set Password'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
