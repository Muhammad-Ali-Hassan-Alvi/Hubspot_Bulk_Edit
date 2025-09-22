'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, TestTube, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DateDisplay } from '@/components/shared/DateDisplay'

interface SyncHistoryProps {
  userId: string
  refreshKey: number
}

interface SyncSession {
  id: string
  sheet_id: string
  tab_name: string
  content_type: string
  filters_used: any
  timestamp: string
  rows_synced?: number
}

export default function SyncHistory({ userId, refreshKey }: SyncHistoryProps) {
  const [sessions, setSessions] = useState<SyncSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const { toast } = useToast()

  const fetchSyncHistory = useCallback(async () => {
    console.log('=== Fetching Sync History ===')
    console.log('UserId:', userId)
    console.log('RefreshKey:', refreshKey)

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/sync-history?userId=${userId}`)
      console.log('Response status:', response.status)

      const data = await response.json()
      console.log('Response data:', data)

      if (data.success) {
        setSessions(data.sessions || [])
        console.log('✅ Sessions loaded:', data.sessions?.length || 0)
      } else {
        setError(data.error || 'Failed to load sync history')
        console.error('❌ API error:', data.error)
      }
    } catch (error) {
      console.error('❌ Fetch error:', error)
      setError('Failed to fetch sync history')
    }
    setLoading(false)
  }, [userId, refreshKey])

  useEffect(() => {
    fetchSyncHistory()
  }, [fetchSyncHistory])

  const runTest = async () => {
    setTesting(true)
    try {
      const response = await fetch('/api/test/sync-sessions')
      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Test Successful ✅',
          description: `Insert: ${
            data.tests.insert.success ? '✅' : '❌'
          }, Read: ${data.tests.read.success ? '✅' : '❌'}`,
        })
        // Refresh the history after test
        fetchSyncHistory()
      } else {
        toast({
          title: 'Test Failed ❌',
          description: data.error || 'Test failed',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Test error:', error)
      toast({
        title: 'Test Error',
        description: 'Failed to run test',
        variant: 'destructive',
      })
    }
    setTesting(false)
  }

  const cleanupTestData = async () => {
    try {
      const response = await fetch('/api/test/cleanup-sync-sessions', {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Cleanup Complete',
          description: `Removed ${data.deletedCount} test records`,
        })
        fetchSyncHistory()
      } else {
        toast({
          title: 'Cleanup Failed',
          description: data.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Cleanup error:', error)
      toast({
        title: 'Cleanup Error',
        description: 'Failed to cleanup test data',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted/50 rounded w-3/4"></div>
            <div className="h-4 bg-muted/50 rounded w-1/2"></div>
            <div className="h-4 bg-muted/50 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full overflow-x-auto">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Sync History</CardTitle>
            <CardDescription>Recent synchronization activities</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={runTest}
              disabled={testing}
              className="flex-1 md:flex-none"
            >
              <TestTube className="h-4 w-4 mr-2" />
              <span className="sr-only md:not-sr-only">{testing ? 'Testing...' : 'Test DB'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={cleanupTestData}
              className="flex-1 md:flex-none"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span className="sr-only md:not-sr-only">Cleanup</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSyncHistory}
              className="flex-1 md:flex-none"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="sr-only md:not-sr-only">Refresh</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">Error: {error}</p>
          </div>
        )}

        <div className="mb-4 text-sm text-muted-foreground bg-popover p-3 rounded">
          <p>
            <strong>Debug Info:</strong>
          </p>
          <p>
            User ID: <code className="bg-muted px-1 rounded">{userId}</code>
          </p>
          <p>
            Sessions found: <strong>{sessions.length}</strong>
          </p>
          <p>
            Refresh key: <strong>{refreshKey}</strong>
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">No sync history yet</p>
            <p className="text-sm text-muted-foreground/70 mb-4">
              Complete a sync from HubSpot to Google Sheets to see history here
            </p>
            <Button onClick={runTest} disabled={testing} variant="outline">
              <TestTube className="h-4 w-4 mr-2" />
              Test Database Connection
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Tab Name</TableHead>
                  <TableHead className="whitespace-nowrap">Content Type</TableHead>
                  <TableHead className="whitespace-nowrap">Filters</TableHead>
                  <TableHead className="whitespace-nowrap">Rows</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map(session => (
                  <TableRow key={session.id}>
                    <TableCell className="whitespace-nowrap">
                      <DateDisplay date={session.timestamp} format="time" showTime={true} />
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {session.tab_name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="secondary">{session.content_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {session.filters_used && typeof session.filters_used === 'object' ? (
                        <div className="space-y-1">
                          {
                            Object.entries(session.filters_used).map(([key, value]) =>
                              value && value !== 'all' ? (
                                <Badge
                                  key={key}
                                  variant="outline"
                                  className="text-xs whitespace-nowrap"
                                >
                                  {key}: {String(value)}
                                </Badge>
                              ) : null
                            ) as React.ReactNode[]
                          }
                        </div>
                      ) : (
                        <span className="text-muted-foreground/70">None</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {session.rows_synced || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
