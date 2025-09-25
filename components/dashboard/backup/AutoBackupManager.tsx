'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Clock, Play, Settings } from 'lucide-react'
import { DateDisplay } from '@/components/shared/DateDisplay'

interface AutoBackupManagerProps {
  userId: string
  hubspotToken: string
  sheetId: string
}

export default function AutoBackupManager({
  userId,
  hubspotToken,
  sheetId,
}: AutoBackupManagerProps) {
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false)
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const { toast } = useToast()

  const fetchBackupStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/backup/status?userId=${userId}`)
      const data = await response.json()
      if (data.success) {
        setAutoBackupEnabled(data.autoBackupEnabled)
        setLastBackup(data.lastBackup)
      }
    } catch (error) {
      console.error('Failed to fetch backup status:', error)
    }
  }, [userId])

  useEffect(() => {
    // Check if auto-backup is enabled and get last backup info
    fetchBackupStatus()
  }, [fetchBackupStatus])

  const runManualBackup = async () => {
    if (!hubspotToken || !sheetId) {
      toast({
        title: 'Error',
        description: 'Please connect HubSpot and Google Sheets first',
        variant: 'destructive',
      })
      return
    }

    setIsRunning(true)
    try {
      const response = await fetch('/api/backup/auto-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          hubspotToken,
          sheetId,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Backup Completed! 🎉',
          description: data.message,
        })
        setLastBackup(new Date().toISOString())
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Manual backup error:', error)
      toast({
        title: 'Backup Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
    setIsRunning(false)
  }

  const toggleAutoBackup = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/backup/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          enabled,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setAutoBackupEnabled(enabled)
        toast({
          title: enabled ? 'Auto-backup Enabled' : 'Auto-backup Disabled',
          description: enabled
            ? 'Daily backups will run automatically'
            : 'Auto-backup has been disabled',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to toggle auto-backup',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Automatic Backup System
        </CardTitle>
        <CardDescription>
          Automatically backup HubSpot changes to Google Sheets daily
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-backup Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="auto-backup">Enable Auto-backup</Label>
            <p className="text-sm text-muted-foreground">
              Automatically create daily backups of changed pages
            </p>
          </div>
          <Switch id="auto-backup" checked={autoBackupEnabled} onCheckedChange={toggleAutoBackup} />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={autoBackupEnabled ? 'default' : 'secondary'}>
              {autoBackupEnabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {lastBackup && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Last Backup:</span>
              <span className="text-sm text-muted-foreground">
                <DateDisplay date={lastBackup} format="time" showTime={true} />
              </span>
            </div>
          )}
        </div>

        {/* Manual Backup */}
        <div className="space-y-3">
          <Label>Manual Backup</Label>
          <Button
            onClick={runManualBackup}
            disabled={isRunning || !hubspotToken || !sheetId}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Settings className="mr-2 h-4 w-4 animate-spin" />
                Running Backup...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Manual Backup Now
              </>
            )}
          </Button>
          {(!hubspotToken || !sheetId) && (
            <p className="text-sm text-amber-600">
              ⚠️ Connect HubSpot and Google Sheets to enable backups
            </p>
          )}
        </div>

        {/* How it works */}
        <div className="bg-accent border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">How Auto-backup Works:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Runs daily at midnight (your timezone)</li>
            <li>• Compares current pages with previous snapshots</li>
            <li>• Creates new tab: hubspot-backup-YYYY-MM-DD</li>
            <li>• Only backs up pages that have changed</li>
            <li>• Tracks field-level changes for easy review</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
