'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Link as LinkIcon, Settings } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import GoogleSheetsConnect from '@/components/auth/GoogleSheetsConnect'

export default function GoogleSheet({
  isGoogleConnected,
  handleConnectionUpdate,
  user,
  googleModalOpen,
  setGoogleModalOpen,
  userSettings,
}: {
  isGoogleConnected: boolean
  handleConnectionUpdate: (connected: boolean) => void
  user: User
  isDisconnecting: string | null
  handleDisconnect: (service: 'hubspot' | 'google') => Promise<void>
  googleModalOpen: boolean
  setGoogleModalOpen: (param: boolean) => void
  userSettings: any
}) {
  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground">Google Sheets</h3>
          {isGoogleConnected && (
            <div className="flex items-center gap-1">
              <Dialog open={googleModalOpen} onOpenChange={setGoogleModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2">
                    <Settings className="h-3.5 w-3.5" />
                    Manage
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[850px]">
                  <DialogHeader>
                    <DialogTitle>Manage Google Sheets Connection</DialogTitle>
                  </DialogHeader>
                  <GoogleSheetsConnect
                    user={user}
                    userSettings={userSettings || {}}
                    onConnectionUpdate={handleConnectionUpdate}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
        <Badge variant={isGoogleConnected ? 'default' : 'secondary'}>
          {isGoogleConnected ? 'Connected' : 'Not Connected'}
        </Badge>
        <p className="text-sm text-muted-foreground mt-2 truncate">
          {isGoogleConnected
            ? userSettings?.google_account_email
              ? `Connected as: ${userSettings.google_account_email}`
              : 'Ready for bulk editing sheet selection.'
            : 'Connect to bulk edit your content.'}
        </p>
      </div>
      {!isGoogleConnected && (
        <div className="mt-4">
          <Dialog open={googleModalOpen} onOpenChange={setGoogleModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <LinkIcon className="mr-2 h-4 w-4" />
                Connect Google
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[850px]">
              <DialogHeader>
                <DialogTitle>Connect Your Google Sheets</DialogTitle>
              </DialogHeader>
              <GoogleSheetsConnect
                user={user}
                userSettings={userSettings || {}}
                onConnectionUpdate={handleConnectionUpdate}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </>
  )
}
