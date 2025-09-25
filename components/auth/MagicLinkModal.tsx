'use client'

import type React from 'react'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Mail, Loader2, Clock } from 'lucide-react'

interface MagicLinkModalProps {
  children: React.ReactNode
}

function MagicLinkModal({ children }: MagicLinkModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const origin = window.location.origin
      const redirectTo = `${origin}/auth/callback`

      console.log('=== MAGIC LINK DEBUG ===')
      console.log('Email:', email)
      console.log('Origin:', origin)
      console.log('Redirect URL:', redirectTo)

      const { data, error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      })

      console.log('Magic link result:', { data, error })

      if (error) throw error

      setSent(true)
      toast({
        title: 'Magic Link Sent! ✨',
        description: `Check your email at ${email} for the magic link`,
      })
    } catch (error) {
      console.error('Magic link error:', error)
      toast({
        title: 'Error',
        description:
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: string }).message)
            : 'Failed to send magic link',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(() => {
      setEmail('')
      setSent(false)
      setLoading(false)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Magic Link
          </DialogTitle>
          <DialogDescription>
            Enter your email address and we&#39;ll send you a magic link to sign in instantly.
          </DialogDescription>
        </DialogHeader>

        {!sent ? (
          <form onSubmit={handleSendMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="magic-email">Email Address</Label>
              <Input
                id="magic-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address"
                autoComplete="email"
                required
                autoFocus
              />
            </div>

            {/* <div className="bg-accent border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Current redirect URL:</h4>
              <p className="text-xs text-blue-800 font-mono">
                {typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "Loading..."}
              </p>
            </div> */}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Magic Link
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-green-900">Magic Link Sent!</h3>
              <p className="text-sm text-muted-foreground">
                We&#39;ve sent a magic link to <strong>{email}</strong>
              </p>
              <div className="flex items-center justify-center gap-1 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                <Clock className="h-3 w-3" />
                <span>Link expires in 1 hour</span>
              </div>
            </div>

            <div className="bg-accent border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Important:</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Check your spam/junk folder if you don&#39;t see the email</li>
                <li>• Click the link within 1 hour</li>
                <li>• Each link can only be used once</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setSent(false)}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Send Another
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default MagicLinkModal
