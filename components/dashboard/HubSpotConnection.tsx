'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface HubSpotConnectionProps {
  onConnectionChange: (connected: boolean) => void
  onTokenChange: (token: string) => void
}

export default function HubSpotConnection({
  onConnectionChange,
  onTokenChange,
}: HubSpotConnectionProps) {
  const [token, setToken] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [testing, setTesting] = useState(false)
  const { toast } = useToast()

  const testConnection = async () => {
    if (!token.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a HubSpot token',
        variant: 'destructive',
      })
      return
    }

    setTesting(true)
    try {
      const response = await fetch('/api/hubspot/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (data.success) {
        setIsConnected(true)
        onConnectionChange(true)
        onTokenChange(token)
        toast({
          title: 'Success',
          description: 'HubSpot connection successful!',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to connect to HubSpot',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('HubSpot connection error:', error)
      toast({
        title: 'Error',
        description: 'Failed to test HubSpot connection',
        variant: 'destructive',
      })
    }
    setTesting(false)
  }

  const disconnect = () => {
    setToken('')
    setIsConnected(false)
    onConnectionChange(false)
    onTokenChange('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>HubSpot</CardTitle>
        <CardDescription>Enter your HubSpot private app token</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <form
            onSubmit={e => {
              e.preventDefault()
              testConnection()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="hubspot-token">Private App Token</Label>
              <Input
                id="hubspot-token"
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" disabled={testing} className="w-full">
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600">✓ Connected to HubSpot</span>
              <Button variant="outline" size="sm" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
