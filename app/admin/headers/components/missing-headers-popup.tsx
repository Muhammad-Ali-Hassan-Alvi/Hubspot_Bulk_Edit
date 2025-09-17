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
import { Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface MissingHeader {
  header: string
  headerType: string
  presence: Record<string, boolean>
}

interface ComparisonResult {
  success: boolean
  totalHubSpotHeaders: number
  totalHubSpotUniqueHeaders?: number
  totalDatabaseHeaders: number
  totalDatabaseCompositeHeaders?: number
  missingHeaders: MissingHeader[]
  isUpToDate: boolean
  explanation?: {
    hubspotIncludesDataTypeVariants: boolean
    databaseStoresUniqueNames: boolean
    comparisonMethod: string
    missingHeadersAreDataTypeVariants: boolean
  }
  error?: string
}

export default function MissingHeadersPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingHeaders, setIsAddingHeaders] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const { toast } = useToast()

  const checkMissingHeaders = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/hubspot/header-configurations/compare-headers')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setComparisonResult(result)

      if (result.success) {
        toast({
          title: 'Comparison Complete',
          description: result.isUpToDate
            ? 'All headers are up to date!'
            : `Found ${result.missingHeaders.length} missing headers`,
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to compare headers',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error checking missing headers:', error)
      toast({
        title: 'Error',
        description: `Failed to check headers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addMissingHeaders = async () => {
    if (!comparisonResult || comparisonResult.missingHeaders.length === 0) {
      return
    }

    setIsAddingHeaders(true)
    try {
      const response = await fetch('/api/hubspot/header-configurations/add-missing-headers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          missingHeaders: comparisonResult.missingHeaders,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        const headersCount = result.headersCount || 0
        const configurationsCount = result.configurationsCount || 0

        toast({
          title: 'Headers and Configurations Added Successfully',
          description: `${headersCount} headers and ${configurationsCount} configurations have been added to the database.`,
        })

        // Refresh the comparison to show updated status
        await checkMissingHeaders()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add missing headers',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error adding missing headers:', error)
      toast({
        title: 'Error',
        description: `Failed to add headers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setIsAddingHeaders(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && !comparisonResult) {
      checkMissingHeaders()
    }
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

  const renderPresenceInfo = (presence: Record<string, boolean>) => {
    const presentIn = Object.entries(presence)
      .filter(([_, isPresent]) => isPresent)
      .map(([type, _]) => type)

    return (
      <div className="flex flex-wrap gap-1">
        {presentIn.map(type => (
          <Badge key={type} variant="secondary" className="text-xs">
            {type}
          </Badge>
        ))}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Check Missing Headers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Headers Comparison Report
          </DialogTitle>
          <DialogDescription>
            Compare HubSpot API headers with your database to identify missing headers
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Comparing headers...</span>
            </div>
          ) : comparisonResult ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {comparisonResult.totalHubSpotUniqueHeaders ||
                      comparisonResult.totalHubSpotHeaders}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    HubSpot Headers
                    {comparisonResult.totalHubSpotUniqueHeaders && (
                      <div className="text-xs text-gray-500 mt-1">
                        ({comparisonResult.totalHubSpotHeaders} with data type variants)
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {comparisonResult.totalDatabaseHeaders}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Database Headers
                    {comparisonResult.totalDatabaseCompositeHeaders && (
                      <div className="text-xs text-gray-500 mt-1">
                        ({comparisonResult.totalDatabaseCompositeHeaders} with configurations)
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div
                    className={`text-2xl font-bold ${comparisonResult.missingHeaders.length > 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {comparisonResult.missingHeaders.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Missing Headers
                    {comparisonResult.explanation?.missingHeadersAreDataTypeVariants && (
                      <div className="text-xs text-gray-500 mt-1">(Data type variants)</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Explanation Alert */}
              {comparisonResult.explanation && (
                <Alert>
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription>
                    <strong>How the comparison works:</strong> HubSpot treats the same field name
                    with different data types as separate headers (e.g., "updated_date" as both
                    string and date-time). Your database stores unique field names with their data
                    type configurations separately. The comparison now accounts for these data type
                    variants to provide accurate results.
                  </AlertDescription>
                </Alert>
              )}

              {/* Status Alert */}
              {comparisonResult.isUpToDate ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Headers are already up to date!</strong> All HubSpot header variants
                    (including data types) are properly configured in your database.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Missing header configurations detected!</strong> The following{' '}
                    {comparisonResult.missingHeaders.length} header configurations from HubSpot are
                    not in your database. These may be new headers or existing headers with
                    different data types.
                  </AlertDescription>
                </Alert>
              )}

              {/* Missing Headers Table */}
              {comparisonResult.missingHeaders.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Header Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Present In</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonResult.missingHeaders.map((header, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{header.header}</TableCell>
                          <TableCell>
                            <Badge className={getTypeColor(header.headerType)}>
                              {header.headerType}
                            </Badge>
                          </TableCell>
                          <TableCell>{renderPresenceInfo(header.presence)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Click "Check Missing Headers" to start the comparison
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={checkMissingHeaders}
              disabled={isLoading || isAddingHeaders}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Comparison
            </Button>
            {comparisonResult &&
              !comparisonResult.isUpToDate &&
              comparisonResult.missingHeaders.length > 0 && (
                <Button
                  onClick={addMissingHeaders}
                  disabled={isLoading || isAddingHeaders}
                  className="flex items-center gap-2"
                >
                  {isAddingHeaders ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding Headers & Configurations...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Add Missing Headers & Configurations
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
