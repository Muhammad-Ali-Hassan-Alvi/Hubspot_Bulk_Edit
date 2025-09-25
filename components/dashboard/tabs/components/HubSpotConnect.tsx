'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useUserSettings } from '@/hooks/useUserSettings'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
// Removed unused import
import { Loader2 } from 'lucide-react'

interface HubSpotConnectProps {
  user: User
  userSettings: any
  onConnectionUpdate: (connected: boolean) => void
}

export default function HubSpotConnect({ user, onConnectionUpdate }: HubSpotConnectProps) {
  const [pat, setPat] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { updateSettings } = useUserSettings()
  // Removed unused supabase variable

  const handlePatConnect = async () => {
    if (!pat.trim()) {
      toast({ title: 'Token is required', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/hubspot/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: pat }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Invalid token')

      // Use Redux to update user settings
      await updateSettings(user.id, {
        hubspot_token_encrypted: pat,
        hubspot_connection_type: 'pat',
        hubspot_portal_name: result.portalName,
      })

      onConnectionUpdate(true)
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthConnect = () => {
    // This is where you would redirect the user to the HubSpot OAuth URL
    // The URL should be constructed on your server or here with the correct client_id and scopes
    toast({
      title: 'Redirecting to HubSpot...',
      description: 'Please complete the authentication in the new tab.',
    })
    // Example: window.location.href = 'YOUR_HUBSPOT_OAUTH_URL';
    console.log('Proceeding with HubSpot OAuth flow...')
  }

  return (
    <div className="pt-4">
      <Tabs defaultValue="pat" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pat">
            <div className="flex items-center">
              Private App Token
              <Badge variant="outline" className="ml-2 text-green-700 border-green-300">
                Recommended
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="oauth">OAuth 2.0</TabsTrigger>
        </TabsList>
        <TabsContent value="pat" className="pt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter a Private App token from your HubSpot developer account. This is the most secure
            and reliable method.
          </p>
          <Input
            type="password"
            placeholder="pat-na1-xxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={pat}
            onChange={e => setPat(e.target.value)}
          />
          <Button onClick={handlePatConnect} disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect with Private App Token
          </Button>
        </TabsContent>
        <TabsContent value="oauth" className="pt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect using OAuth to grant specific permissions to your account without sharing
            credentials.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Continue with HubSpot OAuth
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>HubSpot App Permissions</AlertDialogTitle>
                <AlertDialogDescription>
                  Please note that this method needs the following scopes to be enabled for your
                  Private App:
                  <ul className="list-disc pl-5 mt-2 text-left text-foreground space-y-1">
                    <li>
                      <b>Content:</b> To read and write your website pages, landing pages, and blog
                      posts.
                    </li>
                    <li>
                      <b>HubDB:</b> To read data from your HubDB tables (for advanced analytics).
                    </li>
                    <li>
                      <b>OAuth:</b> To securely manage the connection and refresh tokens.
                    </li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleOAuthConnect}>Proceed</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
      </Tabs>
    </div>
  )
}
