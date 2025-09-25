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
import HubSpotConnect from '@/components/hubspot/HubSpotConnect'

export default function HubSpot({
  isHubSpotConnected,
  handleConnectionUpdate,
  user,
  hubspotModalOpen,
  setHubspotModalOpen,
  userSettings,
}: {
  isHubSpotConnected: boolean
  handleConnectionUpdate: (connected: boolean) => void
  user: User
  isDisconnecting: string | null
  handleDisconnect: (service: 'hubspot' | 'google') => Promise<void>
  hubspotModalOpen: boolean
  setHubspotModalOpen: (param: boolean) => void
  userSettings: any
}) {
  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground">HubSpot Connection</h3>
          {isHubSpotConnected && (
            <div className="flex items-center gap-1">
              <Dialog open={hubspotModalOpen} onOpenChange={setHubspotModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2">
                    <Settings className="h-3.5 w-3.5" />
                    Manage
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[850px]">
                  <DialogHeader>
                    <DialogTitle>Manage HubSpot Connection</DialogTitle>
                  </DialogHeader>
                  <HubSpotConnect
                    user={user}
                    userSettings={userSettings || {}}
                    onConnectionUpdate={handleConnectionUpdate}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
        <Badge variant={isHubSpotConnected ? 'default' : 'secondary'}>
          {isHubSpotConnected ? 'Connected' : 'Not Connected'}
        </Badge>
        <p className="text-sm text-muted-foreground mt-2 truncate">
          {isHubSpotConnected
            ? userSettings?.hubspot_portal_name
              ? `Connected to: ${userSettings.hubspot_portal_name}`
              : 'Ready to sync pages and content.'
            : 'Connect your account to get started.'}
        </p>
      </div>
      {!isHubSpotConnected && (
        <div className="mt-4">
          <Dialog open={hubspotModalOpen} onOpenChange={setHubspotModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <LinkIcon className="mr-2 h-4 w-4" />
                Connect HubSpot
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[850px]">
              <DialogHeader>
                <DialogTitle>Connect Your HubSpot Account</DialogTitle>
              </DialogHeader>
              <HubSpotConnect
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
