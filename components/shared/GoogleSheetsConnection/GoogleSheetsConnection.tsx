'use client'

/* I DON'T THINK THIS IS USED/NEEDED ANYMORE */

// import { useState, useEffect } from 'react'
// import { Button } from '@/components/ui/button'
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// import { Badge } from '@/components/ui/badge'

// import { Loader2, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
// import { useToast } from '@/hooks/use-toast'
// import { useSearchParams } from 'next/navigation'

interface GoogleSheetsConnectionProps {
  user: User
  userSettings?: any
  showTabName?: boolean
  onConnectionChange?: (connected: boolean) => void
  onConnectionUpdate?: (connected: boolean, sheetId?: string) => void
  title?: string
  description?: string
  className?: string
}

export default function GoogleSheetsConnection({
  // user,
  // userSettings,
  // onConnectionChange = () => {},
  // onConnectionUpdate = () => {},
  // title = 'Google Sheets Connection',
  // description = 'Connect your Google account to access sheets',
  className = '',
}: GoogleSheetsConnectionProps) {
  // const [isConnected, setIsConnected] = useState(!!userSettings?.google_access_token)
  // const [loading, setLoading] = useState(false)
  // const [checkingConnection, setCheckingConnection] = useState(!userSettings?.google_access_token)

  // const { toast } = useToast()
  // const searchParams = useSearchParams()

  // useEffect(() => {
  //   if (userSettings?.google_access_token) {
  //     setIsConnected(true)
  //   }
  // }, [userSettings])

  // useEffect(() => {
  //   if (searchParams.get('connected') === 'google') {
  //     toast({ title: 'Success', description: 'Successfully connected to Google!' })
  //     window.history.replaceState({}, '', window.location.pathname)
  //     setTimeout(() => {
  //       checkGoogleConnection()
  //     }, 1000)
  //   }
  //   const error = searchParams.get('error')
  //   if (error) {
  //     const errorMessage = 'Failed to connect to Google'
  //     toast({ title: 'Error', description: errorMessage, variant: 'destructive' })
  //     window.history.replaceState({}, '', window.location.pathname)
  //   }
  // }, [searchParams, toast])

  // const checkGoogleConnection = async () => {
  //   setCheckingConnection(true)
  //   try {
  //     const response = await fetch('/api/google/check-auth')
  //     console.log('response is:', response)
  //     const data = await response.json()
  //     if (data.connected) {
  //       setIsConnected(true)
  //       onConnectionChange(true)
  //       onConnectionUpdate(true, data.selectedSheetId)
  //       toast({ title: 'Success', description: 'Successfully connected to Google!' })
  //       setCheckingConnection(false)
  //     } else {
  //       setIsConnected(false)
  //       onConnectionChange(false)
  //       onConnectionUpdate(false)
  //       toast({ title: 'Error', description: 'Failed to connect to Google!' })
  //       setCheckingConnection(false)
  //     }
  //   } catch (error) {
  //     console.error('Connection check error:', error)
  //     setIsConnected(false)
  //     onConnectionChange(false)
  //     onConnectionUpdate(false)
  //   }
  // }

  // const connectGoogle = async () => {
  //   setLoading(true)
  //   try {
  //     const response = await fetch('/api/google/auth', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ userId: user.id }),
  //     })
  //     const data = await response.json()
  //     if (data.success && data.authUrl) {
  //       window.location.href = data.authUrl
  //     } else if (data.authUrl) {
  //       window.location.href = data.authUrl
  //     } else {
  //       throw new Error(data.error || 'No auth URL received')
  //     }
  //   } catch (error) {
  //     console.error('Google OAuth error:', error)
  //     toast({
  //       title: 'Error',
  //       description: error instanceof Error ? error.message : 'Failed to connect to Google',
  //       variant: 'destructive',
  //     })
  //     setLoading(false)
  //   }
  // }

  // const disconnect = async () => {
  //   try {
  //     const response = await fetch('/api/user/settings', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         google_access_token: null,
  //         google_refresh_token: null,
  //         google_token_expires_at: null,
  //         selected_sheet_id: null,
  //       }),
  //     })
  //     const data = await response.json()
  //     if (data.success) {
  //       setIsConnected(false)
  //       onConnectionChange(false)
  //       onConnectionUpdate(false)
  //       toast({ title: 'Disconnected from Google' })
  //     } else {
  //       throw new Error('Server disconnect failed')
  //     }
  //   } catch (error) {
  //     console.error('Error disconnecting:', error)
  //     toast({ title: 'Error disconnecting', variant: 'destructive' })
  //   }
  // }

  // if (checkingConnection) {
  //   return (
  //     <Card className={className}>
  //       <CardHeader>
  //         <CardTitle>{title}</CardTitle>
  //         <CardDescription>{description}</CardDescription>
  //       </CardHeader>
  //       <CardContent className="flex justify-center p-6">
  //         <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking connection...
  //       </CardContent>
  //     </Card>
  //   )
  // }

  // Detailed variant
  // if (!isConnected) {
  //   return (
  //     <Card className={`bg-content ${className}`}>
  //       <CardHeader>
  //         <CardTitle className="flex items-center gap-2">
  //           <FileSpreadsheet className="h-5 w-5" />
  //           {title}
  //         </CardTitle>
  //         <CardDescription>
  //           Link your Google account to automatically backup HubSpot data to Google Sheets
  //         </CardDescription>
  //       </CardHeader>
  //       <CardContent className="space-y-4">
  //         <Button onClick={connectGoogle} disabled={loading} className="w-full" size="lg">
  //           {loading ? (
  //             <>
  //               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  //               Connecting...
  //             </>
  //           ) : (
  //             <>
  //               <FileSpreadsheet className="mr-2 h-4 w-4" />
  //               Connect Google Sheets
  //             </>
  //           )}
  //         </Button>

  //         <p className="text-xs text-gray-500 text-center">
  //           You'll be redirected to Google to authorize access to your Google Sheets
  //         </p>
  //       </CardContent>
  //     </Card>
  //   )
  // }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-muted-foreground">
                  {isConnected
                    ? 'Ready to backup your HubSpot data.'
                    : 'Connect your account to get started.'}
                </p>
              </div>
            </div>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <Badge variant="default">Connected</Badge>
                <Button variant="outline" size="sm" onClick={disconnect}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={connectGoogle} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card> */}
    </div>
  )
}
