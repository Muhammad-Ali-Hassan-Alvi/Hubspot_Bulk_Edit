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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { RotateCcw, Calendar, FileText, AlertTriangle, Eye, Undo2 } from 'lucide-react'
import { DateDisplay } from '@/components/shared/DateDisplay'

interface RollbackManagerProps {
  user: User
  hubspotToken: string
  userSettings: any
}
interface ChangeRecord {
  id: string
  page_id: string
  field_name: string
  old_value: string
  new_value: string
  change_type: string
  changed_at: string
  page_name?: string
  page_url?: string
}
interface BackupDate {
  date: string
  changes_count: number
  pages_affected: number
}

export default function RollbackManager({
  user,
  hubspotToken,
  userSettings,
}: RollbackManagerProps) {
  const [availableDates, setAvailableDates] = useState<BackupDate[]>([])
  const [selectedDate, setSelectedDate] = useState('default')
  const [selectedPageId, setSelectedPageId] = useState('default')
  const [changes, setChanges] = useState<ChangeRecord[]>([])
  const [pages, setPages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [reverting, setReverting] = useState<string | null>(null)
  const [previewChange, setPreviewChange] = useState<ChangeRecord | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const loadAvailableDates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('change_history')
        .select('changed_at')
        .eq('user_id', user.id)
        .order('changed_at', { ascending: false })
      if (error) throw error
      const dateGroups = data.reduce((acc: Record<string, any>, change) => {
        const date = change.changed_at.split('T')[0]
        if (!acc[date]) acc[date] = { changes: 0, pages: new Set() }
        acc[date].changes++
        return acc
      }, {})
      const dates = Object.entries(dateGroups).map(([date, info]: [string, any]) => ({
        date,
        changes_count: info.changes,
        pages_affected: info.pages.size,
      }))
      setAvailableDates(dates)
    } catch (error) {
      console.error('Error loading available dates:', error)
    }
  }, [supabase, user.id])

  const loadChangesForDate = useCallback(
    async (date: string) => {
      setLoading(true)
      try {
        const startDate = new Date(date),
          endDate = new Date(date)
        endDate.setDate(endDate.getDate() + 1)
        const { data, error } = await supabase
          .from('change_history')
          .select('*')
          .eq('user_id', user.id)
          .gte('changed_at', startDate.toISOString())
          .lt('changed_at', endDate.toISOString())
          .order('changed_at', { ascending: false })
        if (error) throw error
        setChanges(data || [])
      } catch (error) {
        console.error('Error loading changes:', error)
        toast({
          title: 'Error',
          description: 'Failed to load changes for selected date',
          variant: 'destructive',
        })
      }
      setLoading(false)
    },
    [supabase, user.id, toast]
  )

  const loadPagesForDate = useCallback(
    async (date: string) => {
      try {
        const { data, error } = await supabase
          .from('change_history')
          .select('page_id')
          .eq('user_id', user.id)
          .gte('changed_at', `${date}T00:00:00`)
          .lt('changed_at', `${date}T23:59:59`)
        if (error) throw error
        const uniquePageIds = [...new Set(data.map(item => item.page_id))]
        const { data: pageData, error: pageError } = await supabase
          .from('page_snapshots')
          .select('page_id, page_name, page_url')
          .eq('user_id', user.id)
          .in('page_id', uniquePageIds)
        if (pageError) throw pageError
        setPages(pageData || [])
      } catch (error) {
        console.error('Error loading pages:', error)
      }
    },
    [supabase, user.id]
  )

  const loadChangesForPage = useCallback(
    async (date: string, pageId: string) => {
      setLoading(true)
      try {
        const startDate = new Date(date),
          endDate = new Date(date)
        endDate.setDate(endDate.getDate() + 1)
        const { data, error } = await supabase
          .from('change_history')
          .select('*')
          .eq('user_id', user.id)
          .eq('page_id', pageId)
          .gte('changed_at', startDate.toISOString())
          .lt('changed_at', endDate.toISOString())
          .order('changed_at', { ascending: false })
        if (error) throw error
        setChanges(data || [])
      } catch (error) {
        console.error('Error loading page changes:', error)
      }
      setLoading(false)
    },
    [supabase, user.id]
  )

  useEffect(() => {
    loadAvailableDates()
  }, [loadAvailableDates])

  useEffect(() => {
    if (selectedDate !== 'default') {
      loadChangesForDate(selectedDate)
      loadPagesForDate(selectedDate)
    }
  }, [selectedDate, loadChangesForDate, loadPagesForDate])

  useEffect(() => {
    if (selectedDate !== 'default' && selectedPageId !== 'default') {
      loadChangesForPage(selectedDate, selectedPageId)
    }
  }, [selectedDate, selectedPageId, loadChangesForPage])

  const revertChange = async (change: ChangeRecord) => {
    if (!userSettings.is_premium) {
      toast({
        title: 'Premium Feature',
        description: 'Rollback functionality requires a Premium subscription',
        variant: 'destructive',
      })
      return
    }
    if (!hubspotToken) {
      toast({
        title: 'Error',
        description: 'HubSpot connection required for rollback',
        variant: 'destructive',
      })
      return
    }
    setReverting(change.id)
    try {
      const response = await fetch('/api/history/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          pageId: change.page_id,
          fieldName: change.field_name,
          revertValue: change.old_value,
          hubspotToken,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Change Reverted! ✅',
          description: `Successfully reverted ${change.field_name} to previous value`,
        })
        if (selectedDate !== 'default' && selectedPageId !== 'default')
          loadChangesForPage(selectedDate, selectedPageId)
        else if (selectedDate !== 'default') loadChangesForDate(selectedDate)
      } else throw new Error(data.error)
    } catch (error) {
      console.error('Revert error:', error)
      toast({
        title: 'Revert Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
    setReverting(null)
  }

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'create':
        return 'bg-green-100 text-green-800'
      case 'update':
        return 'bg-blue-100 text-blue-800'
      case 'delete':
        return 'bg-red-100 text-red-800'
      case 'revert':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-muted text-gray-800'
    }
  }

  const formatDateTime = (dateString: string) => {
    return <DateDisplay date={dateString} format="time" showTime={true} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rollback</h1>
        <p className="mt-1 text-muted-foreground">
          Recover your Hubspot Pages back to the previous versions.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Rollback & Recovery
          </CardTitle>
          <CardDescription>
            Select a backup date and page to view and revert changes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="backup-date">Select Backup Date</Label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a backup date..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDates.map(dateInfo => (
                    <SelectItem key={dateInfo.date} value={dateInfo.date}>
                      <div className="flex items-center justify-between w-full">
                        <span>
                          <DateDisplay date={dateInfo.date} format="short" />
                        </span>
                        <Badge variant="outline" className="ml-2">
                          {dateInfo.changes_count} changes
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-select">Select Page (Optional)</Label>
              <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                <SelectTrigger>
                  <SelectValue placeholder="All pages or select specific..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">All Pages</SelectItem>
                  {pages.map(page => (
                    <SelectItem key={page.page_id} value={page.page_id}>
                      {page.page_name || page.page_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedDate !== 'default' && (
            <div className="bg-accent border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">
                  Showing changes for <DateDisplay date={selectedDate} format="short" />
                </span>
              </div>
              {selectedPageId !== 'default' && (
                <p className="text-sm text-blue-700 mt-1">
                  Filtered to:{' '}
                  {pages.find(p => p.page_id === selectedPageId)?.page_name || selectedPageId}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {selectedDate !== 'default' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Change History
            </CardTitle>
            <CardDescription>
              Review and revert individual changes made on the selected date
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3 p-4">
                <div className="h-4 bg-muted/50 rounded w-3/4"></div>
                <div className="h-4 bg-muted/50 rounded w-1/2"></div>
                <div className="h-4 bg-muted/50 rounded w-2/3"></div>
              </div>
            ) : changes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Changes Found</h3>
                <p className="text-muted-foreground">No changes were made on the selected date.</p>
              </div>
            ) : (
              <div className="border rounded-lg max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changes.map(change => (
                      <TableRow key={change.id}>
                        <TableCell className="text-sm">
                          {formatDateTime(change.changed_at)}
                        </TableCell>
                        <TableCell className="font-medium max-w-[150px] truncate">
                          {change.page_name || change.page_id}
                        </TableCell>
                        <TableCell className="font-medium">{change.field_name}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-red-600">From:</span>{' '}
                              <span className="font-mono bg-red-50 px-1 rounded text-xs">
                                {change.old_value || '(empty)'}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-green-600">To:</span>{' '}
                              <span className="font-mono bg-green-50 px-1 rounded text-xs">
                                {change.new_value || '(empty)'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getChangeTypeColor(change.change_type)}>
                            {change.change_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPreviewChange(change)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Preview
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Change Preview</DialogTitle>
                                  <DialogDescription>
                                    Review the change before reverting
                                  </DialogDescription>
                                </DialogHeader>
                                {previewChange && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <Label>Page:</Label>
                                        <p className="font-medium">
                                          {previewChange.page_name || previewChange.page_id}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Field:</Label>
                                        <p className="font-medium">{previewChange.field_name}</p>
                                      </div>
                                      <div>
                                        <Label>Change Type:</Label>
                                        <Badge
                                          className={getChangeTypeColor(previewChange.change_type)}
                                        >
                                          {previewChange.change_type}
                                        </Badge>
                                      </div>
                                      <div>
                                        <Label>Date:</Label>
                                        <p>{formatDateTime(previewChange.changed_at)}</p>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Previous Value:</Label>
                                      <div className="p-2 bg-red-50 border border-red-200 rounded font-mono text-sm">
                                        {previewChange.old_value || '(empty)'}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Current Value:</Label>
                                      <div className="p-2 bg-green-50 border border-green-200 rounded font-mono text-sm">
                                        {previewChange.new_value || '(empty)'}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <DialogFooter>
                                  <Button
                                    onClick={() => previewChange && revertChange(previewChange)}
                                    disabled={reverting === previewChange?.id}
                                    variant="destructive"
                                  >
                                    {reverting === previewChange?.id ? (
                                      'Reverting...'
                                    ) : (
                                      <>
                                        <Undo2 className="h-3 w-3 mr-1" />
                                        Revert This Change
                                      </>
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            {change.change_type !== 'create' && change.old_value && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => revertChange(change)}
                                disabled={reverting === change.id}
                              >
                                {reverting === change.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                    Reverting...
                                  </>
                                ) : (
                                  <>
                                    <Undo2 className="h-3 w-3 mr-1" />
                                    Revert
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900">Safety Notice</h4>
              <p className="text-sm text-amber-800 mt-1">
                Rollback operations immediately update your HubSpot pages. All rollback actions are
                logged for audit purposes. Consider creating a backup before performing bulk
                rollbacks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
