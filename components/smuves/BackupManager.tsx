'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Database, Download, RefreshCw, Clock, AlertTriangle } from 'lucide-react'

interface BackupManagerProps {
  user: User
  connections: {
    google: boolean
    hubspot: boolean
    sheetId: string
    hubspotToken: string
  }
  userSettings: any
  onBackupComplete: (details: any) => void
}

interface BackupSession {
  id: string
  backup_date: string
  status: string
  pages_backed_up: number
  changes_detected: number
  completed_at: string
  created_at: string
}

export default function BackupManager({
  user,
  connections,
  userSettings,
  onBackupComplete,
}: BackupManagerProps) {
  const [backupSessions, setBackupSessions] = useState<BackupSession[]>([])
  const [creating, setCreating] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const loadBackupSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('backup_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setBackupSessions(data || [])
    } catch (error) {
      console.error('Error loading backup sessions:', error)
    }
  }, [supabase, user.id])

  useEffect(() => {
    loadBackupSessions()
  }, [loadBackupSessions])

  const createManualBackup = async () => {
    if (!connections.hubspot || !connections.google || !userSettings.backup_sheet_id) {
      toast({
        title: 'Error',
        description: 'Please ensure all connections are set up first',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    try {
      // First, fetch pages from HubSpot
      const pagesResponse = await fetch('/api/hubspot/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: connections.hubspotToken }),
      })

      const pagesData = await pagesResponse.json()
      if (!pagesData.success) {
        throw new Error(pagesData.error || 'Failed to fetch pages')
      }

      // Create backup session
      const { data: backupSession, error: sessionError } = await supabase
        .from('backup_sessions')
        .insert({
          user_id: user.id,
          sheet_id: userSettings.backup_sheet_id,
          tab_name: `Backup_${new Date().toISOString().split('T')[0]}`,
          backup_date: new Date().toISOString().split('T')[0],
          status: 'in_progress',
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Sync to backup sheet
      const syncResponse = await fetch('/api/google/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId: userSettings.backup_sheet_id,
          tabName: `Backup_${new Date().toISOString().split('T')[0]}`,
          pages: pagesData.pages,
          userId: user.id,
          backupSessionId: backupSession.id,
        }),
      })

      const syncData = await syncResponse.json()
      if (!syncData.success) {
        throw new Error(syncData.error || 'Failed to create backup')
      }

      // Update backup session
      await supabase
        .from('backup_sessions')
        .update({
          status: 'completed',
          pages_backed_up: pagesData.pages.length,
          completed_at: new Date().toISOString(),
        })
        .eq('id', backupSession.id)

      toast({
        title: 'Backup Created! 🎉',
        description: `Successfully backed up ${pagesData.pages.length} pages`,
      })

      onBackupComplete({
        pages_count: pagesData.pages.length,
        backup_id: backupSession.id,
      })

      loadBackupSessions()
    } catch (error) {
      console.error('Backup error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create backup',
        variant: 'destructive',
      })
    }
    setCreating(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>
      case 'in_progress':
        return <Badge variant="secondary">In Progress</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const canCreateBackup = connections.google && connections.hubspot && userSettings.backup_sheet_id

  return (
    <div className="space-y-6">
      {/* Backup Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup Management
          </CardTitle>
          <CardDescription>
            Create and manage backups of your HubSpot pages. Backups are stored in your designated
            Google Sheet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Check */}
          {!canCreateBackup && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900">Setup Required</h4>
                  <p className="text-sm text-amber-800 mt-1">To create backups, you need to:</p>
                  <ul className="text-sm text-amber-800 mt-2 space-y-1 list-disc list-inside">
                    {!connections.google && <li>Connect your Google account</li>}
                    {!connections.hubspot && <li>Connect your HubSpot account</li>}
                    {!userSettings.backup_sheet_id && <li>Select a backup sheet</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Manual Backup */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Create Manual Backup</h3>
            <div className="flex items-center gap-4">
              <Button
                onClick={createManualBackup}
                disabled={creating || !canCreateBackup}
                size="lg"
                className="flex-1"
              >
                {creating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Create Backup Now
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This will create a new tab in your backup sheet with today's date and all current page
              data.
            </p>
          </div>

          {/* Auto Backup Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Automatic Backups</h3>
            <div className="bg-accent border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Coming Soon - Premium Feature</span>
              </div>
              <p className="text-sm text-blue-800">
                Automatic daily backups will be available with the Premium plan. This will create
                backups automatically and track changes between versions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Backup History
          </CardTitle>
          <CardDescription>View and manage your previous backups</CardDescription>
        </CardHeader>
        <CardContent>
          {backupSessions.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Backups Yet</h3>
              <p className="text-muted-foreground">Create your first backup to see it here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupSessions.map(session => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        {new Date(session.backup_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                      <TableCell>{session.pages_backed_up || 0}</TableCell>
                      <TableCell>{session.changes_detected || 0}</TableCell>
                      <TableCell>
                        {session.completed_at ? formatDate(session.completed_at) : '—'}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" disabled>
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium Rollback Feature Preview */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-yellow-600" />
            Rollback & Recovery (Premium)
          </CardTitle>
          <CardDescription>Advanced backup features available with Premium plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Select Backup Date</h4>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a backup date..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-01-07">January 7, 2025</SelectItem>
                  <SelectItem value="2025-01-06">January 6, 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Select Page</h4>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a page..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home Page</SelectItem>
                  <SelectItem value="about">About Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-background border rounded-lg p-4">
            <h4 className="font-medium mb-2">Change History Preview</h4>
            <div className="text-sm text-muted-foreground">
              <p>• View detailed change history for each page</p>
              <p>• Compare versions side-by-side</p>
              <p>• One-click rollback to any previous version</p>
              <p>• Track who made changes and when</p>
            </div>
          </div>

          <Button disabled className="w-full">
            Upgrade to Premium for Rollback Features
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
