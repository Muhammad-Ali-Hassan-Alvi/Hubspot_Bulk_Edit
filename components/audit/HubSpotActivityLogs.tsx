'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DateDisplay } from '@/components/shared/DateDisplay'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Zap,
  Search,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Eye,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Calendar,
  FileText as FileTextIcon,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface HubSpotLog {
  id: string
  action_type: string
  resource_type: string
  resource_id: string | null
  details: any
  created_at: string
  status?: string
  total_records?: number
  success_count?: number
  failure_count?: number
}

interface LogDetails {
  pageName: string
  field: string
  previousValue: string
  newValue: string
}

interface PageChanges {
  pageName: string
  changes: LogDetails[]
}

export default function HubSpotActivityLogs({ user: _user }: { user: SupabaseUser }) {
  const [logs, setLogs] = useState<HubSpotLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<HubSpotLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [resourceFilter, setResourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortConfig, setSortConfig] = useState<{
    key: string | null
    direction: 'asc' | 'desc'
  }>({ key: null, direction: 'asc' })
  const [selectedLog, setSelectedLog] = useState<HubSpotLog | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPageIndex, setSelectedPageIndex] = useState(0)

  const { toast } = useToast()

  // Helper function to format action_type
  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const loadHubSpotLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: 'hubspot',
        page: '1',
        limit: '100',
        search: searchTerm,
        action: actionFilter,
        resource: resourceFilter,
        status: statusFilter,
      })

      const response = await fetch(`/api/audit/logs?${params}`)
      const result = await response.json()

      if (result.success) {
        setLogs(result.data || [])
        setFilteredLogs(result.data || [])
      } else {
        throw new Error(result.error || 'Failed to load logs')
      }
    } catch (error) {
      console.error('Error loading HubSpot logs:', error)
      toast({
        title: 'Error Loading Logs',
        description: 'Failed to load HubSpot logs',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }, [searchTerm, actionFilter, resourceFilter, statusFilter, toast])

  const filterLogs = useCallback(() => {
    let filtered = logs

    if (searchTerm) {
      filtered = filtered.filter(
        log =>
          log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (log.resource_id && log.resource_id.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action_type === actionFilter)
    }

    if (resourceFilter !== 'all') {
      filtered = filtered.filter(log => log.resource_type === resourceFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter)
    }

    setFilteredLogs(filtered)
  }, [logs, searchTerm, actionFilter, resourceFilter, statusFilter])

  useEffect(() => {
    loadHubSpotLogs()
  }, [loadHubSpotLogs])

  useEffect(() => {
    filterLogs()
  }, [filterLogs])

  // Sorting function
  const sortedLogs = useCallback(() => {
    if (!sortConfig.key) return filteredLogs

    return [...filteredLogs].sort((a, b) => {
      let aValue: any
      let bValue: any

      if (sortConfig.key === 'date') {
        aValue = new Date(a.created_at).getTime()
        bValue = new Date(b.created_at).getTime()
      } else {
        aValue = a[sortConfig.key as keyof HubSpotLog]
        bValue = b[sortConfig.key as keyof HubSpotLog]
      }

      if (aValue === bValue) return 0
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      const comparison = String(aValue).localeCompare(String(bValue))
      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [filteredLogs, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: (prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc') as 'asc' | 'desc',
    }))
  }

  const getStatusBadge = (status: string, count?: number) => {
    const countText = count ? ` (${count})` : ''

    switch (status) {
      case 'Success':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-300 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-800/40 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Success{countText}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        )
      case 'Error':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-300 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-800/40 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Error{countText}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        )
      case 'Warning':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-800/40 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Warning{countText}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            {status}
            {countText}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        )
    }
  }

  const openLogDetails = (log: HubSpotLog) => {
    setSelectedLog(log)
    setSelectedPageIndex(0)
    setIsModalOpen(true)
  }

  // Group changes by page for the modal
  const getPageChanges = (log: HubSpotLog): PageChanges[] => {
    if (!log.details?.changes) return []

    const pageMap = new Map<string, LogDetails[]>()

    log.details.changes.forEach((change: LogDetails) => {
      if (!pageMap.has(change.pageName)) {
        pageMap.set(change.pageName, [])
      }
      pageMap.get(change.pageName)!.push(change)
    })

    return Array.from(pageMap.entries()).map(([pageName, changes]) => ({
      pageName,
      changes,
    }))
  }

  const uniqueActions = [...new Set(logs.map(log => log.action_type))]
  const uniqueResources = [...new Set(logs.map(log => log.resource_type))]
  const uniqueStatuses = [
    ...new Set(logs.map(log => log.status).filter((status): status is string => Boolean(status))),
  ]

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-muted/50 rounded w-3/4"></div>
        <div className="h-4 bg-muted/50 rounded w-1/2"></div>
        <div className="h-4 bg-muted/50 rounded w-2/3"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Zap className="h-5 w-5" />
          HubSpot Activity Logs ({filteredLogs.length} entries)
        </CardTitle>
        <CardDescription>Track all HubSpot-related activities and operations</CardDescription>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search HubSpot logs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {formatActionType(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {uniqueResources.map(resource => (
                  <SelectItem key={resource} value={resource}>
                    {resource}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {uniqueStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={loadHubSpotLogs} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {sortedLogs().length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium text-left">Action</th>
                    <th className="px-4 py-3 font-medium text-left">Status</th>
                    <th
                      className="px-4 py-3 font-medium text-left cursor-pointer hover:bg-muted/70"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Date/Time
                        {sortConfig.key === 'date' ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-medium text-left">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedLogs().map(log => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{formatActionType(log.action_type)}</td>
                      <td className="px-4 py-3">
                        {getStatusBadge(log.status || 'Unknown', log.failure_count)}
                      </td>
                      <td className="px-4 py-3">
                        <DateDisplay date={log.created_at} format="time" showTime={true} />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          onClick={() => openLogDetails(log)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg bg-muted/50">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No activity to display</h3>
              <p className="text-muted-foreground text-sm">
                {logs.length === 0
                  ? 'Logs will appear here.'
                  : 'No logs match your current filters'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Log Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Log Entry Details</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                    ACTION
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold">
                      {formatActionType(selectedLog.action_type)}
                    </span>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                    STATUS
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      {selectedLog.status}
                    </Badge>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                    RESOURCE
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <span className="font-semibold">{selectedLog.resource_type}</span>
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <div className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">
                    DATE & TIME
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <span className="font-semibold text-sm">
                      <DateDisplay date={selectedLog.created_at} format="time" showTime={true} />
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                    TOTAL RECORDS
                  </div>
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold">{selectedLog.total_records || 0}</span>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                    SUCCESS
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold">{selectedLog.success_count || 0}</span>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                    FAILURES
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span className="font-semibold">{selectedLog.failure_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Page Changes Navigation */}
              {getPageChanges(selectedLog).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Record Changes</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPageIndex(prev => Math.max(0, prev - 1))}
                        disabled={selectedPageIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {selectedPageIndex + 1} of {getPageChanges(selectedLog).length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelectedPageIndex(prev =>
                            Math.min(getPageChanges(selectedLog).length - 1, prev + 1)
                          )
                        }
                        disabled={selectedPageIndex === getPageChanges(selectedLog).length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {getPageChanges(selectedLog)[selectedPageIndex] && (
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center gap-2 mb-4">
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                            {getPageChanges(selectedLog)[selectedPageIndex].pageName}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            ({getPageChanges(selectedLog)[selectedPageIndex].changes.length}{' '}
                            changes)
                          </span>
                        </div>

                        <div className="space-y-3">
                          {getPageChanges(selectedLog)[selectedPageIndex].changes.map(
                            (change, index) => (
                              <div
                                key={index}
                                className="border-l-4 border-blue-200 dark:border-blue-800 pl-4"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium min-w-[120px]">
                                    {change.field}:
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs max-w-[200px] truncate"
                                    title={change.previousValue}
                                  >
                                    {change.previousValue}
                                  </Badge>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                  <Badge
                                    className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs max-w-[300px] truncate"
                                    title={change.newValue}
                                  >
                                    {change.newValue}
                                  </Badge>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
