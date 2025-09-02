'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { History, Undo2, Calendar, User } from 'lucide-react'

interface ChangeHistoryProps {
  userId: string
  hubspotToken: string
}

interface Change {
  id: string
  page_id: string
  field_name: string
  old_value: string
  new_value: string
  change_type: string
  changed_at: string
  changed_by_user?: { email: string }
}

export default function ChangeHistory({ userId, hubspotToken }: ChangeHistoryProps) {
  const [changes, setChanges] = useState<Change[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedPageId, setSelectedPageId] = useState('')
  const [reverting, setReverting] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchChanges = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ userId })
      if (selectedDate) params.append('date', selectedDate)
      if (selectedPageId) params.append('pageId', selectedPageId)

      const response = await fetch(`/api/backup/history?${params}`)
      const data = await response.json()

      if (data.success) {
        setChanges(data.changes)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Failed to fetch changes:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch change history',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }, [userId, selectedDate, selectedPageId, toast])

  useEffect(() => {
    fetchChanges()
  }, [fetchChanges])

  const revertChange = async (change: Change) => {
    if (!hubspotToken) {
      toast({
        title: 'Error',
        description: 'HubSpot token is required to revert changes',
        variant: 'destructive',
      })
      return
    }

    setReverting(change.id)
    try {
      const response = await fetch('/api/backup/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
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
          description: data.message,
        })
        fetchChanges() // Refresh the list
      } else {
        throw new Error(data.error)
      }
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
      default:
        return 'bg-muted text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Change History & Revert
        </CardTitle>
        <CardDescription>View and revert changes made to your HubSpot pages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date-filter">Filter by Date</Label>
            <Input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-filter">Filter by Page ID</Label>
            <Input
              id="page-filter"
              placeholder="Enter page ID"
              value={selectedPageId}
              onChange={e => setSelectedPageId(e.target.value)}
            />
          </div>
        </div>

        {/* Changes Table */}
        <div className="border rounded-lg">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>Loading change history...</p>
            </div>
          ) : changes.length === 0 ? (
            <div className="p-8 text-center">
              <History className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
              <p className="text-gray-500">No changes found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {selectedDate || selectedPageId
                  ? 'Try adjusting your filters'
                  : 'Make some changes to see history here'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Page ID</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changes.map(change => (
                  <TableRow key={change.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground/70" />
                        {new Date(change.changed_at).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{change.page_id}</TableCell>
                    <TableCell className="font-medium">{change.field_name}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-red-600">From:</span>{' '}
                          <span className="font-mono bg-red-50 px-1 rounded">
                            {change.old_value || '(empty)'}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-green-600">To:</span>{' '}
                          <span className="font-mono bg-green-50 px-1 rounded">
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
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground/70" />
                        <span className="text-sm">
                          {change.changed_by_user?.email || 'Unknown'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {change.change_type !== 'create' && change.old_value && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revertChange(change)}
                          disabled={reverting === change.id || !hubspotToken}
                        >
                          {reverting === change.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900 mr-2"></div>
                              Reverting...
                            </>
                          ) : (
                            <>
                              <Undo2 className="h-3 w-3 mr-2" />
                              Revert
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {!hubspotToken && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 text-sm">
              ⚠️ Connect your HubSpot account to enable the revert functionality
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
