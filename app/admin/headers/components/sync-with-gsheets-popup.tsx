'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, CheckCircle, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ConfigurationMismatch {
  header: string
  field: string
  currentValue: any
  gsheetValue: any
  headerType: string
  contentType?: string
}

interface SyncComparisonResult {
  success: boolean
  totalHeaders: number
  mismatchedHeaders: number
  mismatches: ConfigurationMismatch[]
  isUpToDate: boolean
  error?: string
}

export default function SyncWithGSheetsPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<SyncComparisonResult | null>(null)
  const { toast } = useToast()

  const compareWithGSheets = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/hubspot/header-configurations/compare-gsheets')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setComparisonResult(result)

      if (result.success) {
        toast({
          title: 'GSheets Comparison Complete',
          description: result.isUpToDate
            ? 'Database configuration matches GSheets!'
            : `Found ${result.mismatches.length} configuration differences`,
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to compare with GSheets configuration',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error comparing with GSheets:', error)
      toast({
        title: 'Error',
        description: `Failed to compare configurations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const syncWithGSheets = async () => {
    if (!comparisonResult || comparisonResult.mismatches.length === 0) {
      return
    }

    setIsSyncing(true)
    try {
      const response = await fetch('/api/hubspot/header-configurations/sync-gsheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mismatches: comparisonResult.mismatches,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Configuration Synced',
          description: `${result.updatedCount} configurations have been synced with GSheets.`,
        })

        // COST OPTIMIZATION: Removed auto-refresh to prevent cascading API calls
        // User can manually refresh if needed
        // await compareWithGSheets()
        setComparisonResult(null) // Clear result to show sync completed
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to sync with GSheets configuration',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error syncing with GSheets:', error)
      toast({
        title: 'Error',
        description: `Failed to sync: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    // COST OPTIMIZATION: Only auto-compare if user explicitly requests it
    // Removed automatic comparison on popup open to prevent excessive API calls
    // if (open && !comparisonResult) {
    //   compareWithGSheets()
    // }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string':
        return 'bg-blue-100 text-blue-800'
      case 'number':
        return 'bg-green-100 text-green-800'
      case 'boolean':
        return 'bg-purple-100 text-purple-800'
      case 'date-time':
        return 'bg-orange-100 text-orange-800'
      case 'array':
        return 'bg-yellow-100 text-yellow-800'
      case 'object':
        return 'bg-pink-100 text-pink-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }
    if (value === null || value === undefined) {
      return 'null'
    }
    if (Array.isArray(value)) {
      return JSON.stringify(value)
    }
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return String(value)
  }

  const getFieldDisplayName = (field: string) => {
    const fieldMap: Record<string, string> = {
      dataType: 'Data Type',
      category: 'Category',
      isReadOnly: 'Read Only',
      inAppEdit: 'In-App Edit',
      filters: 'Filters',
      contentType: 'Content Type Presence',
    }
    return fieldMap[field] || field
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Sync Configuration with GSheets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Sync Configuration with Google Sheets
          </DialogTitle>
          <DialogDescription>
            Compare and sync your database configuration with the Google Sheets header definitions
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Comparing with GSheets configuration...</span>
            </div>
          ) : comparisonResult ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {comparisonResult.totalHeaders}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Headers</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {comparisonResult.mismatchedHeaders}
                  </div>
                  <div className="text-sm text-muted-foreground">Headers with Differences</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div
                    className={`text-2xl font-bold ${comparisonResult.mismatches.length > 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {comparisonResult.mismatches.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Differences</div>
                </div>
              </div>

              {/* Status Alert */}
              {comparisonResult.isUpToDate ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Configuration is in sync!</strong> Your database configuration matches
                    the Google Sheets definitions perfectly.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <RotateCcw className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Configuration differences detected!</strong> The following settings
                    don't match your Google Sheets configuration.
                  </AlertDescription>
                </Alert>
              )}

              {/* Differences Table */}
              {comparisonResult.mismatches.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Header Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Content Type</TableHead>
                        <TableHead>Current Value</TableHead>
                        <TableHead>GSheets Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonResult.mismatches.map((mismatch, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{mismatch.header}</TableCell>
                          <TableCell>
                            <Badge className={getTypeColor(mismatch.headerType)}>
                              {mismatch.headerType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {getFieldDisplayName(mismatch.field)}
                          </TableCell>
                          <TableCell className="text-sm">{mismatch.contentType || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">
                            <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs">
                              {formatValue(mismatch.currentValue)}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                              {formatValue(mismatch.gsheetValue)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">Click "Refresh Comparison" to start the comparison</p>
              <p className="text-sm text-amber-600">⚠️ This will make API calls to HubSpot</p>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={compareWithGSheets}
              disabled={isLoading || isSyncing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Comparison
            </Button>
            {comparisonResult &&
              !comparisonResult.isUpToDate &&
              comparisonResult.mismatches.length > 0 && (
                <Button
                  onClick={syncWithGSheets}
                  disabled={isLoading || isSyncing}
                  className="flex items-center gap-2"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Syncing with GSheets...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Sync with GSheets
                    </>
                  )}
                </Button>
              )}
          </div>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
