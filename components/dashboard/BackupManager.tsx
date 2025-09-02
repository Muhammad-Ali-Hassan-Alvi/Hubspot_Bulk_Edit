'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Database, Download, Loader2, GitPullRequest, UploadCloud, AlertCircle } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
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

interface BackupManagerProps {
  user: User
  hubspotToken: string
  userSettings: any
}
const fieldDisplayNames: { [key: string]: string } = {
  name: 'Name',
  url: 'URL',
  html_title: 'HTML Title',
  meta_description: 'Meta Description',
  slug: 'Slug',
  state: 'State',
  body_content: 'Body Content',
  body_content_diff: 'Body Content Changes',
}
interface Version {
  version_id: string
  created_at: string
  type: 'Sync' | 'Backup' | 'Revert'
}

export default function BackupManager({ user, hubspotToken, userSettings }: BackupManagerProps) {
  const [googleConnected, setGoogleConnected] = useState(!!userSettings?.google_access_token)
  const [selectedSheetId, setSelectedSheetId] = useState<string>(
    userSettings?.selected_sheet_id || ''
  )
  const [changes, setChanges] = useState<any[]>([])
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [revertingId] = useState<string | null>(null)
  const [, setFilteredVersions] = useState<Version[]>([])
  const [, setIsLoadingVersions] = useState(true)
  const [searchTerm] = useState('')
  const [typeFilter] = useState('all')
  const [, setCurrentPage] = useState(1)
  const { toast } = useToast()

  const loadVersionHistory = useCallback(async () => {
    setIsLoadingVersions(true)
    try {
      const response = await fetch('/api/history/get-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await response.json()
      if (data.success) setVersions(data.versions)
      else throw new Error(data.error)
    } catch (error) {
      console.error('Failed to load version history:', error)
    } finally {
      setIsLoadingVersions(false)
    }
  }, [user.id])

  useEffect(() => {
    setGoogleConnected(!!userSettings?.google_access_token)
    setSelectedSheetId(userSettings?.selected_sheet_id || '')
    loadVersionHistory()
    setLoading(false)
  }, [userSettings, loadVersionHistory])

  useEffect(() => {
    let filtered = versions
    if (searchTerm)
      filtered = filtered.filter(v => v.version_id.toLowerCase().includes(searchTerm.toLowerCase()))
    if (typeFilter !== 'all')
      filtered = filtered.filter(v => v.type.toLowerCase() === typeFilter.toLowerCase())
    setFilteredVersions(filtered)
    setCurrentPage(1)
  }, [versions, searchTerm, typeFilter])

  const startBackup = async () => {
    if (!hubspotToken || !googleConnected || !selectedSheetId) {
      toast({
        title: 'Prerequisites Missing',
        description: 'Connect HubSpot & Google and select a sheet first.',
        variant: 'destructive',
      })
      return
    }
    setIsBackingUp(true)
    try {
      const response = await fetch('/api/backup/sync-to-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          hubspotToken,
          sheetId: selectedSheetId,
          sheetName: 'HubSpot Content Backup',
        }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Backup failed')
      toast({
        title: 'Backup Completed! 🎉',
        description: `Successfully backed up ${data.pages_synced} pages.`,
      })
      await loadVersionHistory()
    } catch (error) {
      toast({
        title: 'Backup Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsBackingUp(false)
    }
  }

  const previewChanges = async () => {
    if (!selectedSheetId) {
      toast({
        title: 'Configuration Missing',
        description: 'A backup sheet must be selected.',
        variant: 'destructive',
      })
      return
    }
    setIsPreviewing(true)
    setChanges([])
    try {
      const response = await fetch('/api/sync/preview-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          sheetId: selectedSheetId,
          sheetName: 'HubSpot Content Backup',
        }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to fetch changes.')
      setChanges(data.changes)
      toast({
        title: 'Preview Complete',
        description:
          data.changes.length > 0
            ? `Found ${data.changes.length} page(s) with changes to review.`
            : 'No changes found. Your sheet matches the last backup.',
      })
    } catch (error) {
      toast({
        title: 'Error Previewing Changes',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsPreviewing(false)
    }
  }

  const syncChangesToHubspot = async () => {
    if (changes.length === 0) return
    setIsSyncing(true)
    try {
      const response = await fetch('/api/sync/to-hubspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, hubspotToken, changes }),
      })
      const data = await response.json()
      const succeeded = data.succeeded || [],
        failed = data.failed || []
      if (!data.success) throw new Error(data.error || 'Syncing failed.')
      toast({
        title: 'Sync Complete!',
        description: `✅ ${succeeded.length} succeeded, ❌ ${failed.length} failed.`,
      })
      if (failed.length > 0) console.error('Failed syncs:', failed)
      setChanges([])
      await loadVersionHistory()
    } catch (error) {
      toast({
        title: 'Error Syncing Changes',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {!googleConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              Google Account Not Connected
            </CardTitle>
            <CardDescription>
              To select a backup sheet, you must first connect your Google account in the
              Authentication settings.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sync with HubSpot
          </CardTitle>
          <CardDescription>
            Create an initial backup of your HubSpot pages. This creates a new version in your
            history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={startBackup}
            disabled={isBackingUp || !hubspotToken || !googleConnected || !selectedSheetId}
            className="w-full"
            size="lg"
          >
            {isBackingUp ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing with HubSpot...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Sync with HubSpot
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {selectedSheetId && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5" />
              Sync Changes to HubSpot
            </CardTitle>
            <CardDescription>
              After editing in Google Sheets, preview changes and then sync them to HubSpot. This
              creates a new version.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={previewChanges}
              disabled={isPreviewing || isSyncing || !!revertingId}
              className="w-full"
            >
              {isPreviewing ? 'Comparing...' : 'Preview Changes from Sheet'}
            </Button>
            {!isPreviewing && changes.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  Review {changes.length} Page(s) with Changes
                </h3>
                {changes.map(change => (
                  <div key={change.pageId} className="border p-4 rounded-lg space-y-3 bg-slate-50">
                    <h4 className="font-semibold text-base">
                      {change.name}{' '}
                      <span className="text-xs font-mono text-gray-500">(ID: {change.pageId})</span>
                    </h4>
                    {Object.entries(change.fields).map(([fieldKey, value]: [string, any]) => {
                      if (fieldKey === 'body_content') return null
                      return (
                        <div key={fieldKey}>
                          <div className="flex items-center gap-2 mb-1">
                            <strong className="text-sm">
                              {fieldDisplayNames[fieldKey] || fieldKey}:
                            </strong>
                            {value.location && (
                              <Badge variant="secondary" className="font-mono text-xs font-normal">
                                Row {value.location.row}, Col {value.location.column}
                              </Badge>
                            )}
                          </div>
                          {fieldKey === 'body_content_diff' ? (
                            <div
                              className="diff-container border rounded mt-1 p-3 text-sm leading-relaxed bg-white"
                              dangerouslySetInnerHTML={{ __html: value.diffHtml }}
                            />
                          ) : (
                            <div className="text-sm p-2 rounded bg-white mt-1 font-mono">
                              <span className="text-red-600 line-through">
                                {value.old || '(empty)'}
                              </span>
                              <span className="text-gray-400 mx-2">→</span>
                              <span className="text-green-600">{value.new || '(empty)'}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={isSyncing} className="w-full bg-green-600 hover:bg-green-700">
                      {isSyncing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="mr-2 h-4 w-4" />
                          Confirm and Sync {changes.length} Changes
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will sync {changes.length} change(s) directly to HubSpot and create a
                        new version. This action is irreversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={syncChangesToHubspot}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Yes, Sync
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            {!isPreviewing && changes.length === 0 && (
              <p className="text-sm text-center text-gray-500 pt-4">
                Click "Preview Changes" to check for modifications.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
