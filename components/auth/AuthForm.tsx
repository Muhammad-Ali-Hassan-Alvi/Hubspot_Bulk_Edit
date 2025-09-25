'use client'

import type React from 'react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUserSettings } from '@/hooks/useUserSettings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Zap,
  CheckCircle,
  AlertTriangle,
  EyeOff,
  Eye,
} from 'lucide-react'
import GoogleAuthButton from './GoogleAuthButton'
import { InputWithIcon } from '../ui/input-with-icon'
import PasswordChecklist from './PasswordChecklist'
import { EMAIL_REGEX } from '@/lib/regex'

export const Divider = () => (
  <div className="flex items-center w-full my-4">
    <div className="flex-grow h-px bg-muted/50 dark:bg-gray-700" />
    <span className="mx-4 px-3 font-medium text-gray-900 bg-background dark:text-foreground dark:bg-gray-900">
      or
    </span>
    <div className="flex-grow h-px bg-muted/50 dark:bg-gray-700" />
  </div>
)

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const { toast } = useToast()
  const { createSettings } = useUserSettings()
  const supabase = createClient()

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail(email)) {
      toast({
        title: 'Failed to Send Magic Link',
        description: 'Please enter a valid email',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    try {
      await supabase.auth.signOut()
      const redirectTo = `${window.location.origin}/auth/callback`
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          data: name ? { full_name: name } : undefined,
        },
      })
      if (error) throw error
      setMagicLinkSent(true)
      toast({
        title: 'Magic Link Sent! ✨',
        description: `Check your email at ${email} for a secure login link`,
      })
    } catch (error) {
      toast({
        title: 'Failed to Send Magic Link',
        description:
          error instanceof Error ? error.message : 'Please check your email and try again',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) {
      toast({
        title: 'Sign Up Failed',
        description: 'Full Name is required',
        variant: 'destructive',
      })
      return
    }
    if (!validateEmail(email)) {
      toast({
        title: 'Sign Up Failed',
        description: 'Please enter a valid email',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: signUpPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: name },
        },
      })
      if (error) throw error
      if (data.user) {
        await createSettings({ user_id: data.user.id })
      }
      if (data.user && !data.user.email_confirmed_at) {
        toast({
          title: 'Check your email! 📧',
          description: `We sent a confirmation link to ${email}. Click it to activate your account.`,
        })
      } else if (data.user && data.session) {
        toast({
          title: 'Welcome to Smuves! 🎉',
          description: 'Your account has been created successfully.',
        })
        window.location.href = '/dashboard'
      }
    } catch (error) {
      toast({
        title: 'Sign Up Failed',
        description: error instanceof Error ? error.message : 'An error occurred during sign up',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail(email)) {
      toast({
        title: 'Sign In Failed',
        description: 'Please enter a valid email',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: signInPassword })
      if (error) throw error
      toast({ title: 'Welcome back! 👋', description: "You've been signed in successfully." })
      window.location.href = '/dashboard'
    } catch (error) {
      toast({
        title: 'Sign In Failed',
        description: error instanceof Error ? error.message : 'Invalid email or password',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const resendMagicLink = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: name ? { full_name: name } : undefined,
        },
      })
      if (error) throw error
      toast({
        title: 'Magic Link Resent! ✨',
        description: 'Check your email again for the new login link',
      })
    } catch (error) {
      console.log(error)
      toast({
        title: 'Failed to Resend',
        description: 'Please try again in a moment',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  if (magicLinkSent) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription>We sent a magic link to {email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-accent border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What&#39;s next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Check your email inbox (and spam folder)</li>
              <li>• Click the secure login link</li>
              <li>• You&#39;ll be automatically signed in</li>
            </ul>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setMagicLinkSent(false)
                setEmail('')
                setName('')
              }}
              className="flex-1"
            >
              Use Different Email
            </Button>
            <Button
              variant="outline"
              onClick={resendMagicLink}
              disabled={loading}
              className="flex-1 bg-transparent"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resend Link'}
            </Button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-amber-800 font-medium mb-1">Important:</p>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• Only click the most recent magic link</li>
                  <li>• Don&#39;t reuse old email links (they expire)</li>
                  <li>• Close other login tabs to avoid conflicts</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex justify-center items-center w-full min-h-[100dvh] bg-background overflow-auto px-2 sm:px-4">
      <Card
        className="w-full max-w-lg sm:max-w-xl mx-auto"
        style={{ maxHeight: 'calc(100dvh - 32px)' }}
      >
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Get Started Free</CardTitle>
          <CardDescription>Create your account or sign in to continue</CardDescription>
        </CardHeader>
        <CardContent
          className="space-y-6 pb-10 overflow-y-auto"
          style={{ maxHeight: 'calc(100dvh - 160px)' }}
        >
          <Tabs defaultValue="magic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="magic" className="text-xs">
                Magic Link
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-xs">
                Sign Up
              </TabsTrigger>
              <TabsTrigger value="signin" className="text-xs">
                Sign In
              </TabsTrigger>
            </TabsList>
            <TabsContent value="magic" className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-900">Recommended</span>
                </div>
                <p className="text-sm text-purple-800">
                  No password needed! We&#39;ll send you a secure login link via email.
                </p>
              </div>
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="magic-name">Full Name (Optional)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 h-4 w-4" />
                    <Input
                      id="magic-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="magic-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 h-4 w-4" />
                    <Input
                      id="magic-email"
                      type="text"
                      placeholder="Enter your email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Magic Link...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Send Magic Link
                    </>
                  )}
                </Button>
              </form>
              <Divider />
              <GoogleAuthButton />
            </TabsContent>
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 h-4 w-4" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 h-4 w-4" />
                    <Input
                      id="signup-email"
                      type="text"
                      placeholder="Enter your email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 h-4 w-4" />
                    <InputWithIcon
                      id="signup-password"
                      placeholder="Create a strong password"
                      type={showSignUpPassword ? 'text' : 'password'}
                      value={signUpPassword}
                      onChange={e => setSignUpPassword(e.target.value)}
                      icon={
                        showSignInPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )
                      }
                      onIconClick={() => setShowSignUpPassword(prev => !prev)}
                      className="peer"
                    />
                    <div className="absolute top-full mt-2 left-0 z-10 hidden w-max rounded-lg border bg-white p-4 shadow-md dark:bg-gray-900 group-hover:block peer-focus:block">
                      <PasswordChecklist password={signUpPassword} />
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Free Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
              <Divider />
              <GoogleAuthButton />
            </TabsContent>
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 h-4 w-4" />
                    <Input
                      id="signin-email"
                      type="text"
                      placeholder="Enter your email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 h-4 w-4" />
                    <InputWithIcon
                      id="signin-password"
                      placeholder="Enter your password"
                      type={showSignInPassword ? 'text' : 'password'}
                      value={signInPassword}
                      onChange={e => setSignInPassword(e.target.value)}
                      icon={
                        showSignInPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )
                      }
                      onIconClick={() => setShowSignInPassword(prev => !prev)}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
              <Divider />
              <GoogleAuthButton />
            </TabsContent>
          </Tabs>
          <div className="mt-6 text-center text-xs text-gray-500">
            By creating an account, you agree to our{' '}
            <a
              href="https://www.smuves.com/terms-of-use"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold hover:text-primary"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="https://www.smuves.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold hover:text-primary"
            >
              Privacy Policy
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
