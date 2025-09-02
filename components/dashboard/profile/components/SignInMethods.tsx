'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import type { User, Provider, UserIdentity } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, MoreHorizontal, Eye, EyeOff, Plus, X } from 'lucide-react'
import GoogleIcon from '@/components/icons/GoogleIcon'
import { Badge } from '@/components/ui/badge'
import { InputWithIcon } from '@/components/ui/input-with-icon'
import PasswordChecklist from '@/components/auth/PasswordChecklist'
import { isPasswordValid } from '@/lib/validators/password'

interface SignInMethodsProps {
  user: User
  isLoadingSettings: boolean
}

type UpdateUserOptions = {
  emailRedirectTo?: string
}

export default function SignInMethods({
  user: initialUser,
  isLoadingSettings,
}: SignInMethodsProps) {
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState(initialUser)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLinkGoogleModalOpen, setIsLinkGoogleModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false)

  const loggedInProvider = user.app_metadata?.provider
  const googleIdentities = user.identities?.filter(i => i.provider === 'google') || []
  const emailIdentities = user.identities?.filter(i => i.provider === 'email') || []
  
  // Get linked emails from user metadata
  const linkedEmails = user.user_metadata?.linked_emails || []
  
  // Only show email accounts that are NOT connected via Google
  const googleEmails = googleIdentities.map(identity => identity.identity_data?.email).filter(Boolean)
  
  const allEmailAccounts = [
    // Only show primary email if it's not connected via Google
    ...(user.email && !googleEmails.includes(user.email) ? [{ email: user.email, isPrimary: true, type: 'primary' }] : []),
    // Show linked emails that are not connected via Google
    ...linkedEmails
      .filter((email: string) => !googleEmails.includes(email))
      .map((email: string) => ({ email, isPrimary: false, type: 'linked' }))
  ]

  const hasPassword = emailIdentities.length > 0
  const hasGoogleConnected = googleIdentities.length > 0

  const formatTimeAgo = (date?: string) =>
    date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : 'some time ago'

  const handleOAuthSignIn = async (provider: Provider) => {
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    const redirectTo = isLocal
      ? 'http://localhost:3000/auth/callback'
      : `${window.location.origin}/auth/callback`

    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  }

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true)
    try {
      const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const redirectTo = isLocal
        ? 'http://localhost:3000/auth/callback?link=true'
        : `${window.location.origin}/auth/callback?link=true`

      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
    } catch (error) {
      console.error('Error linking Google account:', error)
      toast({
        title: 'Error',
        description: 'Failed to link Google account',
        variant: 'destructive',
      })
      setIsLinkingGoogle(false)
    }
  }

  const handleAccountUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const updateData: { email?: string; password?: string } = {}

    const isEmailChanged = newEmail && newEmail !== user.email

    if (isEmailChanged && !newPassword) {
      toast({
        title: 'Password is required',
        description: 'Please set a new password when changing your email.',
        variant: 'destructive',
      })
      return
    }

    if (newPassword) {
      if (!isPasswordValid(newPassword)) {
        toast({
          title: 'Invalid Password',
          description: 'Password must meet all the requirements below.',
          variant: 'destructive',
        })
        return
      }
      if (newPassword !== confirmPassword) {
        toast({
          title: 'Passwords do not match',
          description: 'Please re-enter your new password.',
          variant: 'destructive',
        })
        return
      }
      updateData.password = newPassword
    }

    if (isEmailChanged) {
      updateData.email = newEmail
    }

    if (Object.keys(updateData).length === 0) {
      toast({
        title: 'No changes to save',
        description: 'You have not entered a new email or password.',
      })
      return
    }

    // If user is trying to link a new email (no linked emails yet)
    if (isEmailChanged && linkedEmails.length === 0 && newPassword) {
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/user/link-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            email: newEmail,
            password: newPassword,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          toast({
            title: 'Error linking email',
            description: result.error || 'Failed to link email account',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Email linked successfully',
            description: `Your email account (${newEmail}) has been linked to your profile.`,
          })
          setIsModalOpen(false)
          setNewEmail('')
          setNewPassword('')
          setConfirmPassword('')
          setShowNewPassword(false)
          setShowConfirmPassword(false)
          
          // Refresh user data to show the newly linked email
          const { data: { user: refreshedUser } } = await supabase.auth.getUser()
          if (refreshedUser) {
            setUser(refreshedUser)
          }
          router.refresh()
        }
      } catch (error) {
        console.error('Error linking email:', error)
        toast({
          title: 'Error',
          description: 'Failed to link email account',
          variant: 'destructive',
        })
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Regular account update flow
    const options: UpdateUserOptions = {}
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    if (updateData.email && isLocal) {
      options.emailRedirectTo = 'http://localhost:3000/profile'
    }

    setIsSubmitting(true)
    const { error } = await supabase.auth.updateUser(updateData, options)

    if (error) {
      toast({
        title: 'Error updating account',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      let successDescription = ''
      if (updateData.email && updateData.password) {
        successDescription =
          'Your password has been updated. Please check your new email to confirm the change.'
      } else if (updateData.password) {
        successDescription = 'Your password has been updated successfully.'
      } else if (updateData.email) {
        successDescription = 'Please check your new email inbox to confirm the change.'
      }
      toast({ title: 'Account Update Successful', description: successDescription })
      setIsModalOpen(false)
      if (updateData.email) router.refresh()
    }

    setNewEmail('')
    setNewPassword('')
    setConfirmPassword('')
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setIsSubmitting(false)
  }

  const handleUnlinkGoogle = async (identity: UserIdentity) => {
    if (user.email === identity.identity_data?.email && !hasPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email!)
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
      } else {
        toast({
          title: 'Action Required',
          description:
            'This is your only sign-in method. We sent a password creation link to your email. Please set a password before disconnecting.',
          duration: 10000,
        })
      }
      return
    }

    setIsUnlinking(true)
    const { error } = await supabase.auth.unlinkIdentity(identity)

    if (error) {
      toast({
        title: 'Error disconnecting Google',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Successfully disconnected Google',
        description: 'Your Google account has been unlinked.',
      })
      const { data, error: refreshError } = await supabase.auth.refreshSession()
      if (data.user && !refreshError) setUser(data.user)
      else router.refresh()
    }
    setIsUnlinking(false)
  }

  const handleUpdateLinkedEmail = (email: string) => {
    // Set the email to update and open the modal
    setNewEmail(email)
    setIsModalOpen(true)
  }

  const handleUnlinkEmail = async (email: string) => {
    // Check if this is the last sign-in method
    const remainingMethods = googleIdentities.length + allEmailAccounts.length - 1
    
    if (remainingMethods === 0) {
      toast({
        title: 'Cannot unlink',
        description: 'You must have at least one sign-in method.',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/user/link-email', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: email,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error unlinking email',
          description: result.error || 'Failed to unlink email account',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Email unlinked successfully',
          description: `Your email account (${email}) has been unlinked from your profile.`,
        })
        
        // Refresh user data to update the UI
        const { data: { user: refreshedUser } } = await supabase.auth.getUser()
        if (refreshedUser) {
          setUser(refreshedUser)
        }
        router.refresh()
      }
    } catch (error) {
      console.error('Error unlinking email:', error)
      toast({
        title: 'Error',
        description: 'Failed to unlink email account',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Sign-in Methods
            <div className="flex gap-2">
              {/* Only show Add Google if user doesn't have Google connected */}
              {!hasGoogleConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLinkGoogleModalOpen(true)}
                  disabled={isLinkingGoogle}
                >
                  {isLinkingGoogle ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add Google
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingSettings ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <>
              {/* Email Accounts Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Email Accounts</h3>
                {allEmailAccounts.map((account, index) => (
                  <div key={account.email} className="flex justify-between items-center border-b pb-3">
                    <div className="flex items-center gap-4">
                      <Mail />
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {account.email}
                          {account.isPrimary && (
                            <Badge variant="secondary">Primary</Badge>
                          )}
                          <Badge variant="outline">Email</Badge>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Last sign in: {formatTimeAgo(user.last_sign_in_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.isPrimary && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setIsModalOpen(true)}>
                              Update Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {!account.isPrimary && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleUpdateLinkedEmail(account.email)}>
                              Update Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                  Unlink Email
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Unlink Email Account?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to unlink <strong>{account.email}</strong> from your profile? 
                                    This will remove access to this email account and cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleUnlinkEmail(account.email)}
                                    disabled={isUnlinking}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {isUnlinking ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      'Unlink Email'
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
                
                {allEmailAccounts.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-3">No email accounts linked</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsModalOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Link Email Account
                    </Button>
                  </div>
                )}
              </div>

              {/* Google Accounts Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Google Accounts</h3>
                {googleIdentities.map((identity, index) => (
                  <div key={identity.id} className="flex justify-between items-center border-b pb-3">
                    <div className="flex items-center gap-4">
                      <GoogleIcon />
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {identity.identity_data?.email}
                          {index === 0 && loggedInProvider === 'google' && (
                            <Badge variant="secondary">Connected</Badge>
                          )}
                          <Badge variant="outline">Google</Badge>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Last sign in: {formatTimeAgo(user.last_sign_in_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOAuthSignIn('google')}>
                            Re-authenticate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                Disconnect
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Disconnect Google Account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to disconnect your Google account? This cannot be
                                  undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleUnlinkGoogle(identity)}
                                  disabled={isUnlinking}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {isUnlinking ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    'Disconnect'
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
                
                {googleIdentities.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No Google accounts linked</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Update Account Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={open => {
          setIsModalOpen(open)
          if (!open) {
            setNewEmail('')
            setNewPassword('')
            setConfirmPassword('')
            setShowNewPassword(false)
            setShowConfirmPassword(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Account</DialogTitle>
            <DialogDescription>
              {linkedEmails.length === 0 
                ? 'Update your email/password or link a new email account. Leave fields blank to keep them unchanged.'
                : 'Update your email or password. Leave fields blank to keep them unchanged.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAccountUpdate}>
            <div className="grid w-full gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder={user.email ?? 'your.email@example.com'}
                />
                {linkedEmails.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Enter a new email to link it to your account
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="newPassword">New Password</Label>
                <InputWithIcon
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  autoComplete="new-password"
                  icon={
                    showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 w-4" />
                  }
                  onIconClick={() => setShowNewPassword(prev => !prev)}
                />
              </div>
              {newPassword && <PasswordChecklist password={newPassword} />}
              {newPassword && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <InputWithIcon
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    icon={
                      showConfirmPassword ? (
                        <EyeOff className="w-4 w-4" />
                      ) : (
                        <Eye className="w-4 w-4" />
                      )
                    }
                    onIconClick={() => setShowConfirmPassword(prev => !prev)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {linkedEmails.length === 0 ? 'Link Email' : 'Update Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Google Modal */}
      <Dialog
        open={isLinkGoogleModalOpen}
        onOpenChange={setIsLinkGoogleModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Google Account</DialogTitle>
            <DialogDescription>
              Add a new Google account to your profile. You'll be redirected to Google to authorize the connection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>This will allow you to sign in with either your email or any of your linked Google accounts.</p>
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={handleLinkGoogle}
                disabled={isLinkingGoogle}
              >
                {isLinkingGoogle ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon className="mr-2 h-4 w-4" />
                )}
                Continue with Google
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
