'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle, FileSpreadsheet, Zap } from 'lucide-react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

interface GoogleSheetsConnectProps {
  user: User
  userSettings: any
  onConnectionUpdate?: (connected: boolean, sheetId?: string) => void
  onSettingsUpdate?: (settings: any) => void
}

export default function GoogleSheetsConnect({
  user,
  userSettings,
  onConnectionUpdate,
}: GoogleSheetsConnectProps) {
  const [isConnected, setIsConnected] = useState(!!userSettings?.google_access_token)
  const [selectedSheetId, setSelectedSheetId] = useState(userSettings?.selected_sheet_id || '')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Ensure connection status and selectedSheetId are always in sync with userSettings
  useEffect(() => {
    const hasGoogleToken =
      !!userSettings?.google_access_token || !!userSettings?.google_refresh_token
    setIsConnected(hasGoogleToken)

    if (userSettings?.selected_sheet_id !== selectedSheetId) {
      setSelectedSheetId(userSettings?.selected_sheet_id || '')
    }
  }, [
    userSettings?.google_access_token,
    userSettings?.google_refresh_token,
    userSettings?.selected_sheet_id,
    selectedSheetId,
  ])

  const connectGoogleSheets = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/google/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()
      if (data.success && data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else {
        throw new Error(data.error || 'Failed to initiate Google OAuth')
      }
    } catch (error) {
      console.error('Google OAuth error:', error)
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to Google Sheets',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const disconnect = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
          selected_sheet_id: null,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setIsConnected(false)
        setSelectedSheetId('')
        onConnectionUpdate?.(false)
        toast({
          title: 'Disconnected',
          description: 'Google Sheets connection has been removed',
        })
      } else {
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('Error disconnecting Google Sheets:', error)
      toast({
        title: 'Error',
        description: 'Failed to disconnect Google Sheets',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  if (!isConnected) {
    return (
      <Card className="bg-content">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Google Sheets Integration
          </CardTitle>
          <CardDescription>
            Link your Google account to bulk edit HubSpot content on Google Sheets and much more
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={connectGoogleSheets} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Connect Google Sheets
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            You'll be redirected to Google to authorize access to your Google Sheets
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-content">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {!isConnected ? 'Google Sheets Connected Integration' : 'Google Sheets Connected'}
          </CardTitle>
          <CardDescription>
            {!isConnected ? (
              'Connect your Google Sheet account using OAuth.'
            ) : (
              <>
                Export your HubSpot content to Google Sheets for{' '}
                <Link href="/backup" className="text-blue-600 hover:text-blue-800 underline">
                  bulk editing
                </Link>{' '}
                and much more
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Google Sheets Connected</span>
                <Badge variant="default">OAuth</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={disconnect} disabled={loading}>
                {loading ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>

            {userSettings?.hubspot_account_name && (
              <div className="text-sm text-muted-foreground">
                Account: <span className="font-medium">{userSettings.hubspot_account_name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
