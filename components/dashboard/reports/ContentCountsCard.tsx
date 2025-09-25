'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/lib/store'
import { fetchContentCounts } from '@/lib/store/slices/exportDataSlice'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react'
import TableSkeleton from '@/components/ui/skeleton/TableSkeleton'
import { DateDisplay } from '@/components/shared/DateDisplay'

interface ContentCountsCardProps {
  refreshKey: number
  isHubSpotConnected: boolean
  isCheckingConnection: boolean
}

export const ContentCountsCard = ({
  refreshKey,
  isHubSpotConnected,
  isCheckingConnection,
}: ContentCountsCardProps) => {
  const dispatch = useDispatch<AppDispatch>()
  const {
    contentCounts,
    loading,
    error: reduxError,
    lastUpdated,
  } = useSelector((state: RootState) => state.exportData)

  const [disclaimer, setDisclaimer] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isRequestInProgressRef = useRef(false)
  const lastRefreshKeyRef = useRef<number>(-1)

  const refreshData = useCallback(
    async (forceRefresh = false) => {
      // Only fetch if HubSpot is connected
      if (!isHubSpotConnected) {
        console.log('🚫 ContentCountsCard: HubSpot not connected, skipping API call')
        setIsRefreshing(false)
        setError(null)
        setDisclaimer(null)
        return
      }

      // Prevent multiple simultaneous requests
      if (isRequestInProgressRef.current) {
        console.log('🚫 ContentCountsCard: Request already in progress, skipping')
        return
      }

      // Check if we already have data in Redux and it's not a forced refresh
      if (!forceRefresh && contentCounts.length > 0 && lastUpdated) {
        console.log('✅ ContentCountsCard: Using cached Redux data')
        setIsRefreshing(false)
        setError(null)
        setDisclaimer('Data loaded from cache')
        return
      }

      // Only fetch if refreshKey has actually changed OR it's a forced refresh
      if (!forceRefresh && lastRefreshKeyRef.current === refreshKey) {
        console.log('🚫 ContentCountsCard: RefreshKey unchanged, skipping')
        return
      }

      isRequestInProgressRef.current = true
      lastRefreshKeyRef.current = refreshKey
      setIsRefreshing(true)
      setError(null)

      try {
        console.log('🔄 ContentCountsCard: Fetching fresh data from API')
        await dispatch(fetchContentCounts()).unwrap()
        setDisclaimer('Data fetched from HubSpot API')
      } catch (err) {
        console.error('❌ ContentCountsCard: Redux action failed:', err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred.')
      } finally {
        setIsRefreshing(false)
        isRequestInProgressRef.current = false
      }
    },
    [refreshKey, isHubSpotConnected, dispatch, contentCounts, lastUpdated]
  )

  useEffect(() => {
    refreshData()
  }, [refreshKey, isHubSpotConnected]) // Trigger when refreshKey or connection status changes

  // Cleanup effect to reset flags
  useEffect(() => {
    return () => {
      isRequestInProgressRef.current = false
    }
  }, [])

  // Show loading skeleton while checking connection or fetching data
  if (isRefreshing || isCheckingConnection || loading) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground text-right">
          <div className="bg-gray-200 dark:bg-gray-700 w-32 h-5 rounded-full animate-pulse inline-block"></div>
        </div>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-background">
            <div>
              <CardTitle className="text-foreground">Content Counts</CardTitle>
              <CardDescription className="mt-1">
                An overview of your non-archived content assets.
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => refreshData(true)}
                className="bg-foreground"
                disabled={isRefreshing || isCheckingConnection || loading}
                size="sm"
              >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refresh Data
              </Button>
            </div>
          </CardHeader>
          <TableSkeleton rows={5} headers={['Content Type', 'Published', 'Draft', 'Total']} />
        </Card>
      </div>
    )
  }

  // Show a message when HubSpot is not connected
  if (!isHubSpotConnected) {
    return (
      <div className="space-y-2">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-background">
            <div>
              <CardTitle className="text-foreground">Content Counts</CardTitle>
              <CardDescription className="mt-1">
                An overview of your non-archived content assets.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">HubSpot Not Connected</p>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Connect your HubSpot account to view content counts for your pages, blog posts, and
                other assets.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {lastUpdated && (
        <div className="text-sm text-muted-foreground text-right ">
          Last Updated: <DateDisplay date={lastUpdated} format="time" showTime={true} />
        </div>
      )}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-background">
          <div>
            <CardTitle className="text-foreground">Content Counts</CardTitle>
            <CardDescription className="mt-1">
              An overview of your non-archived content assets.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => refreshData(true)}
              className="bg-foreground"
              disabled={isRefreshing || loading}
              size="sm"
            >
              {isRefreshing || loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh Data
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-background">
              <TableRow>
                <TableHead className="w-[250px] font-semibold">Content Type</TableHead>
                <TableHead className="text-right font-semibold">Published</TableHead>
                <TableHead className="text-right font-semibold">Draft</TableHead>
                <TableHead className="text-right font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-background">
              {error || reduxError ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-6 w-6" />
                      <p className="font-semibold">Could not load data</p>
                      <p className="text-sm text-muted-foreground">{error || reduxError}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                contentCounts.map(item => (
                  <TableRow key={item.type}>
                    <TableCell className="font-medium">{item.type}</TableCell>
                    <TableCell className="text-right font-medium">
                      {item.published ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.draft ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium">{item.total}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {disclaimer && (
          <CardFooter className="p-3 text-xs text-muted-foreground border-t bg-background">
            <span className="font-bold pr-1">Note:</span>
            {disclaimer}
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
