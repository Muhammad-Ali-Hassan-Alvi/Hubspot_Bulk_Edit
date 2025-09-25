'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DateDisplay } from '@/components/shared/DateDisplay'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCw, FileText, Activity, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface BulkEditingLog {
  id: string
  timestamp: string
  content_type: string
  action: string
  resource: string
  status: string
  details: {
    page_changes?: PageChange[]
    updates_applied?: number
    page_snapshots?: any[]
  }
  user_id: string
  changes_count?: number
}

interface PageChange {
  pageId: string
  pageName: string
  field: string
  previousValue: string
  newValue: string
}

interface LogDetails {
  pageId: string
  pageName: string
  field: string
  previousValue: string
  newValue: string
}

export default function BulkEditingLogs({ user: _user }: { user: SupabaseUser }) {
  const [_logs, setLogs] = useState<BulkEditingLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<BulkEditingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<BulkEditingLog | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        '/api/audit/logs?type=bulk-editing&page=1&limit=100&search=&action=all&resource=all&status=all'
      )

      if (!response.ok) {
        throw new Error('Failed to fetch logs')
      }

      const data = await response.json()

      if (data.logs && Array.isArray(data.logs)) {
        // Client-side deduplication based on timestamp, content_type, changes_count, and page_changes
        const uniqueLogs = data.logs.filter(
          (log: BulkEditingLog, index: number, self: BulkEditingLog[]) => {
            const firstIndex = self.findIndex(
              l =>
                l.timestamp === log.timestamp &&
                l.content_type === log.content_type &&
                l.changes_count === log.changes_count &&
                JSON.stringify(l.details?.page_changes) ===
                  JSON.stringify(log.details?.page_changes)
            )
            return firstIndex === index
          }
        )

        setLogs(uniqueLogs)
        setFilteredLogs(uniqueLogs)
      } else {
        setLogs([])
        setFilteredLogs([])
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch bulk editing logs',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const getPageChanges = (log: BulkEditingLog): LogDetails[] => {
    if (log.details?.page_changes) {
      return log.details.page_changes
    }

    // Fallback to generating from page_snapshots if page_changes not available
    if (log.details?.page_snapshots && Array.isArray(log.details.page_snapshots)) {
      return log.details.page_snapshots.map((snapshot: any) => ({
        pageId: snapshot.page_id || 'Unknown',
        pageName: snapshot.page_name || `Page ${snapshot.page_id || 'Unknown'}`,
        field: 'Multiple fields',
        previousValue: 'Previous values available',
        newValue: 'Updated values available',
      }))
    }

    return []
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Bulk Editing Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Bulk Editing Logs
          </CardTitle>
          <Button
            onClick={fetchLogs}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        <CardDescription>Track all bulk editing operations and their results</CardDescription>
      </CardHeader>
      <CardContent>
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No bulk editing logs found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map(log => {
              const pageChanges = getPageChanges(log)
              return (
                <Card key={log.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {log.content_type}
                          </Badge>
                          <Badge className={getStatusColor(log.status)}>
                            {getStatusIcon(log.status)}
                            <span className="ml-1">{log.status}</span>
                          </Badge>
                          <span className="text-sm text-gray-500">
                            <DateDisplay date={log.timestamp} format="time" showTime={true} />
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Action:</strong> {log.action} • <strong>Resource:</strong>{' '}
                          {log.resource}
                          {log.changes_count && (
                            <span>
                              {' '}
                              • <strong>Changes:</strong> {log.changes_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <Dialog
                        open={isModalOpen && selectedLog?.id === log.id}
                        onOpenChange={open => {
                          if (open) {
                            setSelectedLog(log)
                            setIsModalOpen(true)
                          } else {
                            setIsModalOpen(false)
                            setSelectedLog(null)
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto custom-scrollbar">
                          <DialogHeader>
                            <DialogTitle>Bulk Editing Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong>Timestamp:</strong>{' '}
                                <DateDisplay date={log.timestamp} format="time" showTime={true} />
                              </div>
                              <div>
                                <strong>Status:</strong>
                                <Badge className={`ml-2 ${getStatusColor(log.status)}`}>
                                  {log.status}
                                </Badge>
                              </div>
                              <div>
                                <strong>Content Type:</strong> {log.content_type}
                              </div>
                              <div>
                                <strong>Action:</strong> {log.action}
                              </div>
                              <div>
                                <strong>Resource:</strong> {log.resource}
                              </div>
                              {log.changes_count && (
                                <div>
                                  <strong>Total Changes:</strong> {log.changes_count}
                                </div>
                              )}
                            </div>

                            {pageChanges.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-3">Page Changes</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Page Name</TableHead>
                                      <TableHead>Field</TableHead>
                                      <TableHead>Previous Value</TableHead>
                                      <TableHead>New Value</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {pageChanges.map((change, index) => (
                                      <TableRow key={index}>
                                        <TableCell className="font-medium">
                                          {change.pageName}
                                        </TableCell>
                                        <TableCell>{change.field}</TableCell>
                                        <TableCell className="max-w-xs truncate">
                                          {change.previousValue}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                          {change.newValue}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
