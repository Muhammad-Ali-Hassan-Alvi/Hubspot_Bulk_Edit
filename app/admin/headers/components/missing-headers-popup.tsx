'use client'

import { useState, useEffect, useRef } from 'react'
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
  isUsingCachedData?: boolean
  cacheInfo?: string
  cacheExpiresAt?: number
  explanation?: {
    hubspotIncludesDataTypeVariants: boolean
    databaseStoresUniqueNames: boolean
    comparisonMethod: string
    missingHeadersAreDataTypeVariants: boolean
  }
  error?: string
}

interface MissingHeadersPopupProps {
  onHeadersUpdated?: () => void
}

export default function MissingHeadersPopup({ onHeadersUpdated }: MissingHeadersPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingHeaders, setIsAddingHeaders] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [cacheExpired, setCacheExpired] = useState(false)
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null)
  const { toast } = useToast()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Handle cache expiration timing
  useEffect(() => {
    if (comparisonResult?.isUsingCachedData && comparisonResult?.cacheExpiresAt) {
      const updateTimer = () => {
        const now = Date.now()
        const expiresAt = comparisonResult.cacheExpiresAt!
        const timeLeft = expiresAt - now

        if (timeLeft <= 0) {
          setCacheExpired(true)
          setTimeUntilExpiry(null)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        } else {
          setCacheExpired(false)
          setTimeUntilExpiry(timeLeft)
        }
      }

      // Initial update
      updateTimer()

      // Set up interval to update every second
      intervalRef.current = setInterval(updateTimer, 1000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } else {
      setCacheExpired(false)
      setTimeUntilExpiry(null)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [comparisonResult?.isUsingCachedData, comparisonResult?.cacheExpiresAt])

  const formatTimeRemaining = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000)
    const seconds = Math.floor((milliseconds % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const checkMissingHeaders = async (forceRefresh = false) => {
    setIsLoading(true)
    setHasError(false)
    setErrorMessage('')
    try {
      const url = forceRefresh
        ? '/api/hubspot/header-configurations/compare-headers?force=true'
        : '/api/hubspot/header-configurations/compare-headers'
      const response = await fetch(url)

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
            : `Found ${result.missingHeaders?.length || 0} missing headers`,
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

      // Show more helpful error message
      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage =
            'Network error: Unable to connect to the server. Please check your internet connection and try again.'
        } else if (error.message.includes('timeout')) {
          errorMessage =
            'Request timeout: The server took too long to respond. This may be due to HubSpot API rate limiting. Please try again in a few minutes.'
        } else {
          errorMessage = error.message
        }
      }

      toast({
        title: 'Failed to Compare Headers',
        description: errorMessage,
        variant: 'destructive',
      })

      // Set error state and reset comparison result
      setHasError(true)
      setErrorMessage(errorMessage)
      setComparisonResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  const addMissingHeaders = async () => {
    if (
      !comparisonResult ||
      !comparisonResult.missingHeaders ||
      !Array.isArray(comparisonResult.missingHeaders) ||
      comparisonResult.missingHeaders.length === 0
    ) {
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

        // Trigger refresh of main headers table
        onHeadersUpdated?.()
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
    } else if (!open) {
      // Modal is closing, trigger refresh headers
      onHeadersUpdated?.()
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
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Failed to Load Headers Comparison
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">{errorMessage}</p>
                <p className="text-xs text-muted-foreground">
                  This is often due to HubSpot API rate limiting on Vercel. Please try again in a
                  few minutes.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => checkMissingHeaders(true)}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again (Force Refresh)
              </Button>
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
                    className={`text-2xl font-bold ${(comparisonResult.missingHeaders?.length || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {comparisonResult.missingHeaders?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Missing Headers
                    {comparisonResult.explanation?.missingHeadersAreDataTypeVariants && (
                      <div className="text-xs text-gray-500 mt-1">(Data type variants)</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cache Info Alert */}
              {comparisonResult.isUsingCachedData && !cacheExpired && (
                <Alert>
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription>
                    <strong>Using Cached Data:</strong> {comparisonResult.cacheInfo}
                    {timeUntilExpiry && (
                      <span className="block mt-1 text-sm">
                        Fresh data available in:{' '}
                        <strong>{formatTimeRemaining(timeUntilExpiry)}</strong>
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Cache Expired Alert */}
              {comparisonResult.isUsingCachedData && cacheExpired && (
                <Alert>
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <strong>Cache Expired:</strong> Fresh data is now available! Click "Refresh
                    Comparison" to get the latest headers from HubSpot.
                  </AlertDescription>
                </Alert>
              )}

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
                    {comparisonResult.missingHeaders?.length || 0} header configurations from
                    HubSpot are not in your database. These may be new headers or existing headers
                    with different data types.
                  </AlertDescription>
                </Alert>
              )}

              {/* Missing Headers Table */}
              {comparisonResult.missingHeaders && comparisonResult.missingHeaders.length > 0 && (
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
              onClick={() => checkMissingHeaders(false)}
              disabled={
                isLoading ||
                isAddingHeaders ||
                (comparisonResult?.isUsingCachedData && !cacheExpired)
              }
              className="flex items-center gap-2"
              title={
                comparisonResult?.isUsingCachedData && !cacheExpired
                  ? `Refresh disabled while using cached data. Available in ${timeUntilExpiry ? formatTimeRemaining(timeUntilExpiry) : 'a few minutes'}`
                  : 'Refresh comparison with latest HubSpot data'
              }
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {comparisonResult?.isUsingCachedData && !cacheExpired
                ? `Cached Data ${timeUntilExpiry ? `(${formatTimeRemaining(timeUntilExpiry)})` : ''}`
                : 'Refresh Comparison'}
            </Button>

            {comparisonResult?.isUsingCachedData && !cacheExpired && (
              <Button
                variant="secondary"
                onClick={() => checkMissingHeaders(true)}
                disabled={isLoading || isAddingHeaders}
                className="flex items-center gap-2"
                title="Force refresh with fresh HubSpot API data (may trigger rate limiting)"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Force Refresh
              </Button>
            )}
            {comparisonResult &&
              !comparisonResult.isUpToDate &&
              comparisonResult.missingHeaders &&
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
