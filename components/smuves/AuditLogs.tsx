'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { BarChart3, Download, Search, Filter, Calendar, Trash2 } from 'lucide-react'

interface AuditLogsProps {
  user: User
  onExport: (format: string) => void
}

interface AuditLog {
  id: string
  action_type: string
  resource_type: string
  resource_id?: string
  details: any
  created_at: string
}

export default function AuditLogs({ user, onExport }: AuditLogsProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [resourceFilter, setResourceFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  // Helper function to format action_type
  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const loadAuditLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
      console.log('umar data is ', data)
      setFilteredLogs(data || [])
    } catch (error) {
      console.error('Error loading audit logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }, [supabase, user.id, toast])

  const applyFilters = useCallback(() => {
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

    setFilteredLogs(filtered)
  }, [logs, searchTerm, actionFilter, resourceFilter])

  useEffect(() => {
    loadAuditLogs()
  }, [loadAuditLogs])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const exportLogs = async (format: string) => {
    try {
      const dataToExport = filteredLogs.map(log => ({
        Date: new Date(log.created_at).toLocaleString(),
        Action: log.action_type,
        Resource: log.resource_type,
        // 'Resource ID': log.resource_id || '',
        Details: JSON.stringify(log.details),
      }))

      if (format === 'csv') {
        const csv = [
          Object.keys(dataToExport[0]).join(','),
          ...dataToExport.map(row =>
            Object.values(row)
              .map(val => `"${val}"`)
              .join(',')
          ),
        ].join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }

      onExport(format)
      toast({
        title: 'Success',
        description: `Audit logs exported as ${format.toUpperCase()}`,
      })
    } catch (error) {
      console.error('Error exporting logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to export audit logs',
        variant: 'destructive',
      })
    }
  }

  const clearLogs = async () => {
    try {
      const { error } = await supabase.from('audit_logs').delete().eq('user_id', user.id)

      if (error) throw error

      setLogs([])
      setFilteredLogs([])
      toast({
        title: 'Logs Cleared',
        description: 'All activity logs for your account have been cleared.',
      })
    } catch (error) {
      console.error('Error clearing logs:', error)
      toast({
        title: 'Error Clearing Logs',
        description: 'Failed to clear activity logs.',
        variant: 'destructive',
      })
    }
  }

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      sync: 'bg-blue-100 text-blue-800',
      edit: 'bg-green-100 text-green-800',
      connect: 'bg-purple-100 text-purple-800',
      backup: 'bg-orange-100 text-orange-800',
      revert: 'bg-red-100 text-red-800',
      configure: 'bg-muted text-gray-800',
    }

    return (
      <Badge className={colors[action] || 'bg-muted text-gray-800'}>
        {formatActionType(action)}
      </Badge>
    )
  }

  const getResourceIcon = (resource: string) => {
    const icons: Record<string, string> = {
      page: '📄',
      sheet: '📊',
      hubspot: '🟠',
      google: '🔵',
      fields: '⚙️',
      premium: '👑',
    }

    return icons[resource] || '📋'
  }

  const formatDetails = (details: any) => {
    if (!details) return ''

    // Special handling for Google Sheets exports
    if (details.sheet_url && details.sheet_name) {
      const sheetName = details.sheet_name || 'Unknown Sheet'
      const tabName = details.tab_name === 'Default' ? 'Sheet1' : details.tab_name || 'Sheet1'
      const sheetUrl = details.sheet_url

      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs">
            📊 Exported:{' '}
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              {sheetName}
            </a>{' '}
            • Tab: {tabName}
          </span>
          <span className="text-xs text-muted-foreground">
            📈 {details.rows_exported || 0} rows • 📊 {details.columns_exported?.length || 0}
          </span>
        </div>
      )
    }

    // Special handling for CSV exports
    if (details.filename) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs">
            💾 Downloaded as <span className="font-medium text-green-600">{details.filename}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            📈 {details.rows_exported || 0} rows • 📊 {details.columns_exported?.length || 0}{' '}
            columns
          </span>
        </div>
      )
    }

    // Default formatting for other details
    const key = Object.keys(details)[0]
    const value = details[key]

    if (typeof value === 'object') {
      return `${key}: ${Object.keys(value).length} items`
    }

    return `${key}: ${value}`
  }

  const getUniqueActions = () => {
    return [...new Set(logs.map(log => log.action_type))]
  }

  const getUniqueResources = () => {
    return [...new Set(logs.map(log => log.resource_type))]
  }

  return (
    <div className="space-y-6">
      {/* Audit Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Activity Logs
          </CardTitle>
          <CardDescription>
            Track all actions performed in your Smuves account for security and compliance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-accent border border-blue-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-900">{logs.length}</div>
              <div className="text-sm text-blue-700">Total Actions</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-900">
                {logs.filter(log => log.action_type === 'sync').length}
              </div>
              <div className="text-sm text-green-700">Syncs</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-900">
                {logs.filter(log => log.action_type === 'edit').length}
              </div>
              <div className="text-sm text-orange-700">Edits</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-900">
                {logs.filter(log => log.action_type === 'backup').length}
              </div>
              <div className="text-sm text-purple-700">Backups</div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {getUniqueActions().map(action => (
                    <SelectItem key={action} value={action}>
                      {formatActionType(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  {getUniqueResources().map(resource => (
                    <SelectItem key={resource} value={resource}>
                      {resource.charAt(0).toUpperCase() + resource.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => exportLogs('csv')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={logs.length === 0}
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear Logs
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all activity logs
                      for your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearLogs}>Clear Logs</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Logs Table */}
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted/50 rounded w-3/4"></div>
              <div className="h-4 bg-muted/50 rounded w-1/2"></div>
              <div className="h-4 bg-muted/50 rounded w-2/3"></div>
            </div>
          ) : filteredLogs.length > 0 ? (
            <div className="border rounded-lg max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                    {/* <TableHead>Resource ID</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{getActionBadge(log.action_type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getResourceIcon(log.resource_type)}</span>
                          <span className="capitalize">{log.resource_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {formatDetails(log.details)}
                      </TableCell>
                      <TableCell className="text-sm font-mono">{log.resource_id || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
              <p className="text-muted-foreground">
                {logs.length === 0
                  ? 'Start using Smuves to see your activity logs here.'
                  : 'Try adjusting your search or filters.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export & Reporting</CardTitle>
          <CardDescription>
            Download your audit logs for compliance and reporting purposes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={() => exportLogs('csv')} variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export as CSV
            </Button>
            <Button disabled variant="outline" className="w-full bg-transparent">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Report (Premium)
            </Button>
            <Button disabled variant="outline" className="w-full bg-transparent">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters (Premium)
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Current filter shows {filteredLogs.length} of {logs.length} total log entries.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
