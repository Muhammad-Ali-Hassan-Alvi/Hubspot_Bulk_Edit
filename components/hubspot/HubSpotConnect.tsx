'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Zap, CheckCircle } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
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
import Link from 'next/link'
import { ActivityTypes, logActivity } from '@/lib/audit-logger'

interface HubSpotConnectProps {
  user: User
  userSettings: any
  onConnectionUpdate?: (connected: boolean) => void
}

export default function HubSpotConnect({
  user,
  userSettings,
  onConnectionUpdate,
}: HubSpotConnectProps) {
  const [token, setToken] = useState('')
  const [, setDomain] = useState(userSettings?.website_domain || '')
  const [isConnected, setIsConnected] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [, setTestResults] = useState<any>(null)
  const [connectionType, setConnectionType] = useState<'paid' | 'free' | null>(
    userSettings?.hubspot_connection_type || null
  )
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const oauthResponse = searchParams.get('hubspot_oauth')

  const handleConnectionUpdate = useCallback((connected: boolean) => {
    if (connected) {
      setIsConnected(true)
      setConnectionType('paid')
    } else {
      setIsConnected(false)
      setConnectionType(null)
    }
  }, [])

  useEffect(() => {
    const isAnyTokenPresent =
      !!userSettings?.hubspot_access_token || !!userSettings?.hubspot_token_encrypted
    setIsConnected(isAnyTokenPresent)
    setConnectionType(userSettings?.hubspot_connection_type || null)
    setDomain(userSettings?.website_domain || '')
    
    // Clear local state if no connection
    if (!isAnyTokenPresent) {
      setToken('')
      setTestResults(null)
    }
  }, [userSettings])

  useEffect(() => {
    if (oauthResponse === 'success') {
      handleConnectionUpdate(true)
      onConnectionUpdate?.(true)
      const newParams = new URLSearchParams(searchParams.toString())
      newParams.delete('hubspot_oauth')
      router.replace(`?${newParams.toString()}`, { scroll: false })
    }
  }, [oauthResponse, router, searchParams, handleConnectionUpdate, onConnectionUpdate])

  const saveConnection = async (
    hubspotToken: string,
    connType: 'paid' | 'free',
    accountName?: string,
    portalId?: number
  ) => {
    setSaving(true)
    try {
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hubspot_token: hubspotToken,
          hubspot_connection_type: connType,
          hubspot_account_name: accountName || null,
          hubspot_portal_id: portalId || null,
        }),
      })

      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to save connection')

      // Log successful connection
      await logActivity({
        userId: user.id,
        actionType: ActivityTypes.HUBSPOT_CONNECT,
        resourceType: 'hubspot_integration',
        details: {
          connection_type: connType,
          account_name: accountName,
          portal_id: portalId,
        },
        status: 'success',
      })

      onConnectionUpdate?.(true)
      return true
    } catch (error) {
      // Log failed connection
      await logActivity({
        userId: user.id,
        actionType: ActivityTypes.HUBSPOT_CONNECT,
        resourceType: 'hubspot_integration',
        details: {
          connection_type: connType,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        status: 'failed',
      })

      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save connection',
        variant: 'destructive',
      })
      return false
    } finally {
      setSaving(false)
    }
  }

  const testPaidConnection = async () => {
    if (!token.trim()) {
      toast({
        title: 'Token Required',
        description: 'Please enter a HubSpot Private App Token to test the connection.',
        variant: 'destructive',
      })
      return
    }

    setTesting(true)
    setTestResults(null)
    try {
      const response = await fetch('/api/hubspot/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      })
      const data = await response.json()
      setTestResults(data)

      if (data.success) {
        const saved = await saveConnection(token.trim(), 'paid', data.portalName, data.portalId)
        if (saved) {
          setIsConnected(true)
          setConnectionType('paid')
          // Update local state to reflect connection
          setToken('')
          // Clear test results
          setTestResults(null)
          // Notify parent component to refresh data
          onConnectionUpdate?.(true)
          // Show success message
          toast({
            title: 'HubSpot Connected Successfully! 🎉',
            description: `Connected to ${data.portalName || 'HubSpot'} (Portal ID: ${data.portalId})`,
          })
        }
      } else {
        toast({
          title: 'Connection Failed',
          description: data.error || 'Failed to connect to HubSpot. Please check your token.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.log(error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while testing the connection.',
        variant: 'destructive',
      })
    }
    setTesting(false)
  }

  const disconnect = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hubspot_token: null,
          hubspot_connection_type: null,
          hubspot_account_name: null,
          hubspot_portal_id: null,
          hubspot_access_token: null,
          hubspot_refresh_token: null,
          hubspot_token_expires_at: null,
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Log successful disconnection
        await logActivity({
          userId: user.id,
          actionType: ActivityTypes.HUBSPOT_DISCONNECT,
          resourceType: 'hubspot_integration',
          details: {
            previous_account_name: userSettings?.hubspot_account_name,
            previous_portal_id: userSettings?.hubspot_portal_id,
            previous_connection_type: userSettings?.hubspot_connection_type,
          },
          status: 'success',
        })

        setToken('')
        setDomain('')
        setIsConnected(false)
        setTestResults(null)
        setConnectionType(null)
        onConnectionUpdate?.(false)
        toast({
          title: 'Disconnected',
          description: 'HubSpot connection has been removed',
        })
      } else {
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      // Log failed disconnection
      await logActivity({
        userId: user.id,
        actionType: ActivityTypes.HUBSPOT_DISCONNECT,
        resourceType: 'hubspot_integration',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        status: 'failed',
      })

      console.log(error)
      toast({
        title: 'Error',
        description: 'Failed to disconnect HubSpot',
        variant: 'destructive',
      })
    }
    setSaving(false)
  }

  const proceedWithOAuth = () => {
    const clientId = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/hubspot/callback`)
    const scope = 'oauth content'
    const optionalScope = 'hubdb'
    const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${encodeURIComponent(
      scope
    )}&optional_scope=${encodeURIComponent(optionalScope)}`
    window.location.href = authUrl
  }

  return (
    <div className="space-y-6">
      <Card className="bg-content">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {!isConnected ? ' HubSpot Integration' : 'HubSpot Connected'}
          </CardTitle>
          <CardDescription>
            {!isConnected ? (
              'Connect your HubSpot account using a Private App Token (recommended) or OAuth.'
            ) : (
              <>
                Ready to manage and sync your HubSpot content for bulk editin and more.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="hubspot-token-free">HubSpot Private App Token</Label>
                      <Badge variant="secondary">Recommended</Badge>
                    </div>
                    <Input
                      id="hubspot-token-free"
                      type="password"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>

                  <div className="flex items-center gap-2 md:hidden my-2">
                    <div className="flex-grow h-px bg-muted/50" />
                    <span className="text-xs text-muted-foreground">OR</span>
                    <div className="flex-grow h-px bg-muted/50" />
                  </div>

                  <div className="hidden md:flex flex-col items-center justify-center px-2">
                    <div className="h-full w-px bg-muted/50" />
                    <span className="absolute bg-background px-1 text-xs text-muted-foreground">
                      OR
                    </span>
                  </div>

                  <div className="w-full space-y-2">
                    <Label>Sign in with HubSpot (OAuth)</Label>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          className="w-full inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent transition h-10"
                        >
                          <Image
                            src="/hubspot.png"
                            className="h-5 w-5 mr-2"
                            alt="Hubspot Logo"
                            width={20}
                            height={20}
                          />
                          Continue with HubSpot
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Required HubSpot Permissions</AlertDialogTitle>
                          <AlertDialogDescription>
                            <p>
                              To connect your account, we require the following permissions. Please
                              ensure they are enabled in your HubSpot account for the integration to
                              work correctly.
                            </p>
                            <ul className="mt-4 list-disc list-inside space-y-2 text-sm">
                              <li>
                                <span className="font-semibold">Content:</span> For accessing CMS
                                pages, landing pages, and blogs.
                              </li>
                              <li>
                                <span className="font-semibold">HubDB:</span> For accessing HubSpot
                                database tables (optional but recommended).
                              </li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={proceedWithOAuth}>Proceed</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <Button
                  onClick={testPaidConnection}
                  disabled={testing || saving}
                  className="w-full bg-primary"
                >
                  {testing
                    ? 'Testing Connection...'
                    : saving
                      ? 'Saving...'
                      : 'Test & Save CMS Connection'}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">HubSpot Connected</span>
                  {connectionType === 'paid' ? (
                    <Badge variant="default">PAT</Badge>
                  ) : (
                    <Badge variant="default">OAuth</Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={disconnect} disabled={saving}>
                  {saving ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>

              {(userSettings?.hubspot_account_name || userSettings?.hubspot_portal_id) && (
                <div className="text-sm text-muted-foreground">
                  Account: <span className="font-medium">{userSettings?.hubspot_account_name}</span>
                  {userSettings?.hubspot_portal_id && ` (ID: ${userSettings?.hubspot_portal_id})`}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
