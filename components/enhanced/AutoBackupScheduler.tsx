'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Clock, Calendar, Settings, Play, Crown, AlertTriangle, CheckCircle } from 'lucide-react'
import { DateDisplay } from '@/components/shared/DateDisplay'
import { useUserSettings } from '@/hooks/useUserSettings'

interface AutoBackupSchedulerProps {
  user: User
  hubspotToken: string
  sheetId: string
  userSettings: any
  onSettingsUpdate: (settings: any) => void
}
interface ScheduleSettings {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string
  timezone: string
  retention_days: number
  include_unchanged: boolean
}

export default function AutoBackupScheduler({
  user,
  hubspotToken,
  sheetId,
  userSettings,
  onSettingsUpdate,
}: AutoBackupSchedulerProps) {
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>({
    enabled: false,
    frequency: 'daily',
    time: '02:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    retention_days: 30,
    include_unchanged: false,
  })
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [nextBackup, setNextBackup] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const { userSettings: reduxUserSettings, updateSettings } = useUserSettings()

  const calculateNextBackup = useCallback(
    (lastBackupDate: string) => {
      const last = new Date(lastBackupDate)
      const next = new Date(last)
      switch (scheduleSettings.frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1)
          break
        case 'weekly':
          next.setDate(next.getDate() + 7)
          break
        case 'monthly':
          next.setMonth(next.getMonth() + 1)
          break
      }
      const [hours, minutes] = scheduleSettings.time.split(':')
      next.setHours(Number.parseInt(hours), Number.parseInt(minutes), 0, 0)
      setNextBackup(next.toISOString())
    },
    [scheduleSettings.frequency, scheduleSettings.time]
  )

  const loadScheduleSettings = useCallback(async () => {
    try {
      // First try to get from Redux
      if (reduxUserSettings?.backup_schedule) {
        setScheduleSettings({ ...scheduleSettings, ...reduxUserSettings.backup_schedule })
        return
      }

      // Fallback to direct Supabase call
      const { data } = await supabase
        .from('user_settings')
        .select('backup_schedule')
        .eq('user_id', user.id)
        .single()
      if (data?.backup_schedule)
        setScheduleSettings({ ...scheduleSettings, ...data.backup_schedule })
    } catch (error) {
      console.error('Error loading schedule settings:', error)
    }
  }, [reduxUserSettings, supabase, user.id, scheduleSettings])

  const loadBackupStatus = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('backup_sessions')
        .select('completed_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()
      if (data?.completed_at) {
        setLastBackup(data.completed_at)
        calculateNextBackup(data.completed_at)
      }
    } catch (error) {
      console.error('Error loading backup status:', error)
    }
  }, [supabase, user.id, calculateNextBackup])

  useEffect(() => {
    loadScheduleSettings()
    loadBackupStatus()
  }, [loadScheduleSettings, loadBackupStatus])

  const saveScheduleSettings = async () => {
    if (!userSettings.is_premium) {
      toast({
        title: 'Premium Feature',
        description: 'Automatic backup scheduling requires a Premium subscription',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      // Use Redux to update user settings
      await updateSettings(user.id, {
        backup_schedule: scheduleSettings,
        updated_at: new Date().toISOString(),
      })

      await fetch('/api/backup/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          schedule: scheduleSettings,
          hubspotToken,
          sheetId,
        }),
      })
      onSettingsUpdate({ ...userSettings, backup_schedule: scheduleSettings })
      toast({
        title: 'Schedule Updated! ⏰',
        description: `Automatic backups ${scheduleSettings.enabled ? 'enabled' : 'disabled'}`,
      })
      if (lastBackup) calculateNextBackup(lastBackup)
    } catch (error) {
      console.error('Error saving schedule:', error)
      toast({
        title: 'Error',
        description: 'Failed to save backup schedule',
        variant: 'destructive',
      })
    }
    setSaving(false)
  }

  const runTestBackup = async () => {
    if (!hubspotToken || !sheetId) {
      toast({
        title: 'Error',
        description: 'Please connect HubSpot and Google Sheets first',
        variant: 'destructive',
      })
      return
    }
    setTesting(true)
    try {
      const response = await fetch('/api/backup/auto-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, hubspotToken, sheetId, testMode: true }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: 'Test Backup Successful! 🎉', description: data.message })
        loadBackupStatus()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Test backup error:', error)
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
    setTesting(false)
  }

  const formatDateTime = (dateString: string) => {
    return <DateDisplay date={dateString} format="time" showTime={true} />
  }
  const getFrequencyDescription = () => {
    switch (scheduleSettings.frequency) {
      case 'daily':
        return `Every day at ${scheduleSettings.time}`
      case 'weekly':
        return `Every week at ${scheduleSettings.time}`
      case 'monthly':
        return `Every month at ${scheduleSettings.time}`
      default:
        return ''
    }
  }

  if (!userSettings.is_premium) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            Automatic Backup Scheduling (Premium)
          </CardTitle>
          <CardDescription>
            Schedule automatic daily, weekly, or monthly backups with retention policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-background border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium mb-2">Premium Scheduling Features:</h4>
            <ul className="text-sm space-y-1">
              <li>• Automatic daily, weekly, or monthly backups</li>
              <li>• Timezone-aware scheduling</li>
              <li>• Configurable retention periods (7-365 days)</li>
              <li>• Smart change detection (skip unchanged content)</li>
              <li>• Email notifications for backup status & health monitoring</li>
            </ul>
          </div>
          <div className="space-y-4 opacity-50 pointer-events-none">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Daily" />
                  </SelectTrigger>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="02:00 AM" />
                  </SelectTrigger>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Enable Automatic Backups</Label>
              <Switch disabled />
            </div>
          </div>
          <Button disabled className="w-full">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Premium for Automatic Scheduling
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Automatic Backup Schedule
          </CardTitle>
          <CardDescription>
            Configure when and how often to automatically backup your HubSpot pages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="enable-schedule">Enable Automatic Backups</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create backups based on your schedule
              </p>
            </div>
            <Switch
              id="enable-schedule"
              checked={scheduleSettings.enabled}
              onCheckedChange={enabled => setScheduleSettings({ ...scheduleSettings, enabled })}
            />
          </div>
          {scheduleSettings.enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={scheduleSettings.frequency}
                    onValueChange={(frequency: 'daily' | 'weekly' | 'monthly') =>
                      setScheduleSettings({ ...scheduleSettings, frequency })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select
                    value={scheduleSettings.time}
                    onValueChange={time => setScheduleSettings({ ...scheduleSettings, time })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {i === 0
                              ? '12:00 AM'
                              : i < 12
                                ? `${i}:00 AM`
                                : i === 12
                                  ? '12:00 PM'
                                  : `${i - 12}:00 PM`}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Retention (Days)</Label>
                  <Select
                    value={scheduleSettings.retention_days.toString()}
                    onValueChange={days =>
                      setScheduleSettings({
                        ...scheduleSettings,
                        retention_days: Number.parseInt(days),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Skip Unchanged Content</Label>
                    <p className="text-sm text-muted-foreground">
                      Only backup pages that have changed since last backup
                    </p>
                  </div>
                  <Switch
                    checked={scheduleSettings.include_unchanged}
                    onCheckedChange={include_unchanged =>
                      setScheduleSettings({ ...scheduleSettings, include_unchanged })
                    }
                  />
                </div>
              </div>
              <div className="bg-accent border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Schedule Summary</span>
                </div>
                <p className="text-sm text-blue-800">
                  {getFrequencyDescription()} ({scheduleSettings.timezone})
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Backups will be retained for {scheduleSettings.retention_days} days
                </p>
                {nextBackup && (
                  <p className="text-sm text-blue-700">Next backup: {formatDateTime(nextBackup)}</p>
                )}
              </div>
            </>
          )}
          <div className="flex gap-2">
            <Button onClick={saveScheduleSettings} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Settings className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Settings className="mr-2 h-4 w-4" />
                  Save Schedule
                </>
              )}
            </Button>
            <Button
              onClick={runTestBackup}
              disabled={testing || !hubspotToken || !sheetId}
              variant="outline"
            >
              {testing ? (
                <>
                  <Play className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Test Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Backup Status
          </CardTitle>
          <CardDescription>Current status of your automatic backups</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Schedule Status</Label>
              <div className="flex items-center gap-2">
                <Badge variant={scheduleSettings.enabled ? 'default' : 'secondary'}>
                  {scheduleSettings.enabled ? 'Active' : 'Inactive'}
                </Badge>
                {scheduleSettings.enabled && (
                  <span className="text-sm text-green-600">{getFrequencyDescription()}</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Last Backup</Label>
              <p className="text-sm">
                {lastBackup ? formatDateTime(lastBackup) : 'No backups yet'}
              </p>
            </div>
            {nextBackup && scheduleSettings.enabled && (
              <div className="space-y-2">
                <Label>Next Scheduled Backup</Label>
                <p className="text-sm font-medium text-blue-600">{formatDateTime(nextBackup)}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Retention Policy</Label>
              <p className="text-sm">{scheduleSettings.retention_days} days</p>
            </div>
          </div>
          <div className="bg-popover border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium mb-2">Requirements Status:</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={hubspotToken ? 'default' : 'secondary'} className="w-3 h-3 p-0">
                  {hubspotToken ? '✓' : '✗'}
                </Badge>
                <span>HubSpot Connection</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={sheetId ? 'default' : 'secondary'} className="w-3 h-3 p-0">
                  {sheetId ? '✓' : '✗'}
                </Badge>
                <span>Google Sheets Connection</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge
                  variant={userSettings.is_premium ? 'default' : 'secondary'}
                  className="w-3 h-3 p-0"
                >
                  {userSettings.is_premium ? '✓' : '✗'}
                </Badge>
                <span>Premium Subscription</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900">Important Notes</h4>
              <ul className="text-sm text-amber-800 mt-1 space-y-1">
                <li>• Automatic backups run in your timezone: {scheduleSettings.timezone}</li>
                <li>• Failed backups will be retried automatically</li>
                <li>• You'll receive email notifications for backup failures</li>
                <li>• Old backups are automatically cleaned up based on retention policy</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
