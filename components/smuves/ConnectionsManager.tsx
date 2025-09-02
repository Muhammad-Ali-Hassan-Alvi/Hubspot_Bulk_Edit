'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
// Removed unused import
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { useUserSettings } from '@/hooks/useUserSettings'

interface ConnectionsManagerProps {
  user: User
  onConnectionChange: (type: string, connected: boolean, data?: any) => void
  userSettings: any
  onSettingsUpdate: (settings: any) => void
}

export default function ConnectionsManager({
  user,
  onConnectionChange,
  userSettings,
  onSettingsUpdate,
}: ConnectionsManagerProps) {
  const [googleConnected, setGoogleConnected] = useState(false)
  const [hubspotConnected, setHubspotConnected] = useState(false)
  const [hubspotToken, setHubspotToken] = useState('')
  const [sheets, setSheets] = useState<any[]>([])
  const [selectedBackupSheet, setSelectedBackupSheet] = useState('')
  const [testing, setTesting] = useState(false)
  const { toast } = useToast()
  const { updateSettings } = useUserSettings()
  // Removed unused supabase variable

  const checkConnections = useCallback(async () => {
    // Check Google connection
    try {
      const response = await fetch('/api/google/check-auth')
      const data = await response.json()
      setGoogleConnected(data.connected)
      onConnectionChange('google', data.connected)

      if (data.connected) {
        fetchSheets()
      }
    } catch (error) {
      console.error('Error checking Google connection:', error)
    }
  }, [onConnectionChange])

  useEffect(() => {
    checkConnections()
    if (userSettings.backup_sheet_id) {
      setSelectedBackupSheet(userSettings.backup_sheet_id)
    }
  }, [userSettings, checkConnections])

  const fetchSheets = async () => {
    try {
      const response = await fetch('/api/google/sheets')
      const data = await response.json()
      if (data.sheets) {
        setSheets(data.sheets)
      }
    } catch (error) {
      console.error('Error fetching sheets:', error)
    }
  }

  const connectGoogle = async () => {
    try {
      const response = await fetch('/api/google/auth')
      const data = await response.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.log(error)
      toast({
        title: 'Error',
        description: 'Failed to connect to Google',
        variant: 'destructive',
      })
    }
  }

  const testHubSpotConnection = async () => {
    if (!hubspotToken.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a HubSpot token',
        variant: 'destructive',
      })
      return
    }

    // Validate token format
    if (!hubspotToken.startsWith('pat-')) {
      toast({
        title: 'Invalid Token Format',
        description: "HubSpot private app tokens should start with 'pat-'",
        variant: 'destructive',
      })
      return
    }

    setTesting(true)
    try {
      const response = await fetch('/api/hubspot/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: hubspotToken }),
      })

      const data = await response.json()
      if (data.success) {
        setHubspotConnected(true)
        onConnectionChange('hubspot', true, { token: hubspotToken })
        toast({
          title: 'Success! 🎉',
          description: data.message + (data.accountName ? ` - ${data.accountName}` : ''),
        })
      } else {
        toast({
          title: 'Connection Failed',
          description: data.error || 'Failed to connect to HubSpot',
          variant: 'destructive',
        })

        // Show suggestions if available
        if (data.suggestions && data.suggestions.length > 0) {
          console.log('HubSpot connection suggestions:', data.suggestions)
        }
      }
    } catch (error) {
      console.log(error)

      toast({
        title: 'Error',
        description: 'Failed to test HubSpot connection',
        variant: 'destructive',
      })
    }
    setTesting(false)
  }

  const saveBackupSheet = async () => {
    if (!selectedBackupSheet) {
      toast({
        title: 'Error',
        description: 'Please select a backup sheet',
        variant: 'destructive',
      })
      return
    }

    try {
      // Use Redux to update user settings
      await updateSettings(user.id, {
        backup_sheet_id: selectedBackupSheet,
        updated_at: new Date().toISOString(),
      })

      onSettingsUpdate({
        ...userSettings,
        backup_sheet_id: selectedBackupSheet,
      })
      toast({
        title: 'Success',
        description: 'Backup sheet saved successfully!',
      })
    } catch (error) {
      console.log(error)
      toast({
        title: 'Error',
        description: 'Failed to save backup sheet',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Google Sheets Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {googleConnected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-muted-foreground/70" />
            )}
            Google Sheets Integration
          </CardTitle>
          <CardDescription>
            Connect your Google account to access and manage spreadsheets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!googleConnected ? (
            <Button onClick={connectGoogle} className="w-full">
              Connect Google Account
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="default">Connected</Badge>
                <span className="text-sm text-green-600">Google Sheets access enabled</span>
              </div>

              {/* Backup Sheet Selection */}
              <div className="space-y-2">
                <Label>Select Backup Sheet</Label>
                <div className="flex gap-2">
                  <Select value={selectedBackupSheet} onValueChange={setSelectedBackupSheet}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choose a sheet for backups..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sheets.map(sheet => (
                        <SelectItem key={sheet.id} value={sheet.id}>
                          {sheet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={saveBackupSheet} disabled={!selectedBackupSheet}>
                    Save
                  </Button>
                </div>
                {userSettings.backup_sheet_id && (
                  <p className="text-sm text-green-600">✓ Backup sheet configured</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* HubSpot Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hubspotConnected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-muted-foreground/70" />
            )}
            HubSpot Integration
          </CardTitle>
          <CardDescription>Connect your HubSpot account using a private app token</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hubspotConnected ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hubspot-token">Private App Token</Label>
                <Input
                  id="hubspot-token"
                  type="password"
                  value={hubspotToken}
                  onChange={e => setHubspotToken(e.target.value)}
                  placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>

              <Button onClick={testHubSpotConnection} disabled={testing} className="w-full">
                {testing ? 'Testing Connection...' : 'Test & Connect'}
              </Button>

              <div className="bg-accent border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-blue-900 mb-1">How to get your token:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Go to HubSpot Settings → Integrations → Private Apps</li>
                  <li>Create a new private app or select existing one</li>
                  <li>Enable these scopes: "CMS Pages", "Website Pages"</li>
                  <li>Copy the token (starts with "pat-") and paste above</li>
                </ol>
                <div className="mt-2 p-2 bg-background rounded border">
                  <p className="text-xs text-blue-700 font-mono">
                    Example: pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                  </p>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-blue-600 mt-1"
                  onClick={() =>
                    window.open('https://developers.hubspot.com/docs/api/private-apps', '_blank')
                  }
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View HubSpot Private Apps Guide
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Badge variant="default">Connected</Badge>
              <p className="text-sm text-green-600">HubSpot API access enabled</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHubspotConnected(false)
                  setHubspotToken('')
                  onConnectionChange('hubspot', false)
                }}
              >
                Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Summary */}
      {googleConnected && hubspotConnected && userSettings.backup_sheet_id && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-900">All systems connected!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              You can now sync pages, create backups, and manage your HubSpot content through Google
              Sheets.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
