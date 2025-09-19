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
import LogDetailsModal from './LogDetailsModal'
import {
  FileText,
  Search,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Eye,
  CheckCircle,
  XCircle,
  FileText as FileTextIcon,
  PenSquare,
  AlertTriangle,
} from 'lucide-react'

// BRO: Updated the interface to be more specific about the details object
interface AuditLog {
  id: string
  action_type: string
  resource_type: string
  resource_id: string | null
  details: {
    content_type?: string | { id: number; name: string; slug: string; created_at: string }
    [key: string]: any // Allows for other dynamic properties in details
  }
  created_at: string
  status?: string
  total_records?: number
  success_count?: number
  failure_count?: number
}

export default function AuditLogs() {
  // ... (state and hooks remain the same)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [resourceFilter, setResourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortConfig, setSortConfig] = useState<{
    key: string | null
    direction: 'asc' | 'desc'
  }>({ key: null, direction: 'asc' })
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLogType, setSelectedLogType] = useState('activity-logs')
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [_selectedStatus, setSelectedStatus] = useState<string>('')

  const { toast } = useToast()

  // Helper function to format action_type
  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // ... (all functions like loadAuditLogs, filterLogs, sortedLogs, etc. remain the same)
  const loadAuditLogs = useCallback(async () => {
    setLoading(true)
    try {
      let type = 'activity'
      if (selectedLogType === 'bulk-editing-logs') {
        type = 'bulk-editing'
      }

      const params = new URLSearchParams({
        type: type,
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
      console.error('Error loading audit logs:', error)
      toast({
        title: 'Error Loading Logs',
        description: 'Failed to load audit logs',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }, [selectedLogType, searchTerm, actionFilter, resourceFilter, statusFilter, toast])

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
    loadAuditLogs()
  }, [loadAuditLogs])

  useEffect(() => {
    filterLogs()
  }, [filterLogs])

  const sortedLogs = useCallback(() => {
    if (!sortConfig.key) return filteredLogs

    return [...filteredLogs].sort((a, b) => {
      let aValue: any
      let bValue: any

      if (sortConfig.key === 'date') {
        aValue = new Date(a.created_at).getTime()
        bValue = new Date(b.created_at).getTime()
      } else {
        aValue = a[sortConfig.key as keyof AuditLog]
        bValue = b[sortConfig.key as keyof AuditLog]
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
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Success{countText}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        )
      case 'Error':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Error{countText}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        )
      case 'Warning':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30 flex items-center gap-1">
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

  const openLogDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setIsModalOpen(true)
  }

  const openStatusModal = (status: string, log: AuditLog) => {
    setSelectedStatus(status)
    setSelectedLog(log)
    setIsStatusModalOpen(true)
  }


  const uniqueActions = [...new Set(logs.map(log => log.action_type))]
  const uniqueResources = [...new Set(logs.map(log => log.resource_type))]
  const uniqueStatuses = [
    ...new Set(logs.map(log => log.status).filter((status): status is string => Boolean(status))),
  ]

  const getLogTypeInfo = () => {
    switch (selectedLogType) {
      case 'activity-logs':
        return {
          title: 'Smuves Activity Logs',
          description: 'Track all activities and changes in your account',
          icon: FileText,
        }
      case 'bulk-editing-logs':
        return {
          title: 'Bulk Editing Logs',
          description: 'Track all bulk editing operations and changes',
          icon: PenSquare,
        }
      default:
        return {
          title: 'Smuves Activity Logs',
          description: 'Track all activities and changes in your account',
          icon: FileText,
        }
    }
  }

  const logTypeInfo = getLogTypeInfo()
  const LogIcon = logTypeInfo.icon

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
      {/* ... (Header and filters JSX remains the same) ... */}
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <LogIcon className="h-4 w-4" />
            {logTypeInfo.title} ({filteredLogs.length} entries)
          </CardTitle>
          <CardDescription>{logTypeInfo.description}</CardDescription>
        </div>
        <Select value={selectedLogType} onValueChange={setSelectedLogType}>
          <SelectTrigger className="w-[200px] bg-background border border-border">
            <SelectValue placeholder="Activity Logs" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border">
            <SelectItem value="activity-logs" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 flex-1">
                <FileText className="h-4 w-4" />
                <span>Activity Logs</span>
              </div>
            </SelectItem>

            <SelectItem
              value="bulk-editing-logs"
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2 flex-1">
                <PenSquare className="h-4 w-4" />
                <span>Bulk Editing Logs</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
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

            <Button onClick={loadAuditLogs} variant="outline" size="sm">
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
                    {/* BRO: Conditionally render the Content Type header */}
                    {selectedLogType === 'bulk-editing-logs' && (
                      <th className="px-4 py-3 font-medium text-left">Content Type</th>
                    )}
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
                      {/* BRO: Conditionally render the Content Type data cell */}
                      {selectedLogType === 'bulk-editing-logs' && (
                        <td className="px-4 py-3">
                          {(() => {
                            const contentType = log.details?.content_type
                            if (!contentType) {
                              return <span className="text-muted-foreground">N/A</span>
                            }
                            // Handle both string and object content types
                            if (typeof contentType === 'string') {
                              return contentType
                            }
                            if (typeof contentType === 'object' && contentType.name) {
                              return contentType.name
                            }
                            return <span className="text-muted-foreground">N/A</span>
                          })()}
                        </td>
                      )}
                      <td className="px-4 py-3 text-left">
                        <div
                          className="inline-flex cursor-pointer"
                          onClick={() => openStatusModal(log.status || 'Unknown', log)}
                        >
                          {getStatusBadge(log.status || 'Unknown', log.failure_count)}
                        </div>
                      </td>
                      <td className="px-4 py-3"><DateDisplay date={log.created_at} format="short" /></td>
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
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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

      {/* ... (Modals JSX remains the same) ... */}
      <LogDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedLog={selectedLog}
      />

      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Success Statistics
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Success Statistics
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Operations completed successfully
              </p>

              <div className="space-y-0">
                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Total Records
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {selectedLog?.total_records || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 px-4 bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-400">
                      Success
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-green-800 dark:text-green-400">
                    {selectedLog?.success_count || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 px-4 bg-red-50 dark:bg-red-900/20 rounded-b-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800 dark:text-red-400">
                      Total Failures
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-red-800 dark:text-red-400">
                    {selectedLog?.failure_count || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
