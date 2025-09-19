'use client'

import { useState, useEffect, useMemo, forwardRef, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  RefreshCw,
  FileText,
  Download,
  CalendarIcon,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import 'react-datepicker/dist/react-datepicker.css'
import { useContentTypes } from '@/hooks/useContentTypes'
import { useLayout } from '@/app/(protected)/layout-context'
import { DateDisplay } from '@/components/shared/DateDisplay'
import CsvExportTab from './components/CsvExportTab'
import GSheetsExportTab from './components/GSheetsExportTab'
import Filters from './components/Filters'
import DataTable from './components/DataTable'
import BulkEditHeader from './components/BulkEditHeader'
import TopBar from './components/TopBar'
import HubSpotSearch from './components/HubSpotSearch'

interface PageManagerProps {
  user: User
  userSettings: any
}

interface HubSpotContent {
  id: string
  name: string
  [key: string]: any
}

const formatColumnLabel = (key: string) => {
  const result = key.replace(/([A-Z])/g, ' $1')
  return result.charAt(0).toUpperCase() + result.slice(1)
}

export default function PageManager({ user, userSettings }: PageManagerProps) {
  // Get connection status from layout context
  const { connectionStatus, refreshConnectionStatus } = useLayout()

  // Fetch dynamic content types
  const { contentTypes } = useContentTypes()
  const [content, setContent] = useState<HubSpotContent[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [slugSearchTerm, setSlugSearchTerm] = useState('')
  const [htmlTitleSearchTerm, setHtmlTitleSearchTerm] = useState('')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [publishDateFilter, setPublishDateFilter] = useState('')
  const [createdAtFilter, setCreatedAtFilter] = useState('')
  const [dynamicFilters, setDynamicFilters] = useState<{ [key: string]: string }>({})
  const [refreshing, setRefreshing] = useState(false)
  const initialContentType =
    contentTypes && contentTypes.length > 0
      ? contentTypes.find(ct => ct.slug === 'landing-pages')
      : undefined
  const [contentType, setContentType] = useState(initialContentType)
  const [status, setStatus] = useState('all')
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [availableColumns, setAvailableColumns] = useState<{ key: string; label: string }[]>([])
  const [displayColumns, setDisplayColumns] = useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null])
  const { toast } = useToast()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(500) // Set to 500 for better UX
  const [totalItems, setTotalItems] = useState(0)
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const [isPublishing, setIsPublishing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [, setContentCounts] = useState<{ [key: string]: number }>({})
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentBatch, setCurrentBatch] = useState(1)
  const [maxBatches] = useState(5) // Show 5 batches (500 records) before pagination
  const [, setHasMoreRecords] = useState(false) // Track if API has more records

  // Search state
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<HubSpotContent[]>([])
  const [searchTotal, setSearchTotal] = useState(0)
  const [currentSearchTerm, setCurrentSearchTerm] = useState('')

  const pageCache = useRef<{ [key: number]: HubSpotContent[] }>({})
  const scrollPositionRef = useRef<number>(0)
  const dataTableRef = useRef<HTMLDivElement>(null)

  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const currentContentTypeLabel = contentType?.name || 'Landing Pages'

  const hubspotToken = userSettings?.hubspot_access_token || userSettings?.hubspot_token_encrypted

  // Search handlers
  const handleSearchResults = useCallback(
    (results: HubSpotContent[], total: number, searchTerm: string) => {
      setSearchResults(results)
      setSearchTotal(total)
      setCurrentSearchTerm(searchTerm)
      setSelectedRows([]) // Clear selection when searching
    },
    []
  )

  const handleClearSearch = useCallback(() => {
    setSearchResults([])
    setSearchTotal(0)
    setCurrentSearchTerm('')
    setSelectedRows([])
  }, [])

  // Fetch content counts from the API
  const fetchContentCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/hubspot/content-counts', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.counts) {
          const countsMap: { [key: string]: number } = {}
          data.counts.forEach((item: any) => {
            countsMap[item.type] = item.total
          })
          setContentCounts(countsMap)
        }
      }
    } catch (error) {
      console.error('Failed to fetch content counts:', error)
    }
  }, [])

  const loadContent = useCallback(
    async (
      page: number,
      currentCursors: (string | null)[],
      forceRefresh = false,
      append = false
    ) => {
      if (pageCache.current[page] && !forceRefresh && !append) {
        setContent(pageCache.current[page])
        setCurrentPage(page)
        setSelectedRows([])
        return
      }

      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setSelectedRows([])
      }

      const after = currentCursors[page - 1]
      try {
        const response = await fetch('/api/hubspot/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentType: contentType?.slug ?? 'landing-pages',
            limit: 100, // Back to 100 for API limit
            after: after,
          }),
        })
        const data = await response.json()
        if (data.success) {
          const newContent = data.content || []

          if (append) {
            // Append new content to existing content
            setContent(prevContent => [...prevContent, ...newContent])
            setCurrentBatch(prev => prev + 1)
          } else {
            // Replace content (initial load or refresh)
            setContent(newContent)
            pageCache.current[page] = newContent
            setCurrentBatch(1)
          }

          setTotalItems(data.total || 0)
          setCurrentPage(page)
          setLastUpdated(new Date())

          // Check if we've reached the max batches (500 records) or if there are more records
          if (data.paging?.next?.after) {
            setHasMoreRecords(true)
            if (currentBatch < maxBatches) {
              setCursors(prev => {
                const newCursors = [...prev]
                newCursors[page] = data.paging.next.after
                return newCursors
              })
              setHasMore(true)
            } else {
              setHasMore(false)
            }
          } else {
            setHasMoreRecords(false)
            setHasMore(false)
          }
        } else {
          if (!append) {
            setContent([])
            setTotalItems(0)
          }

          // Handle specific HubSpot connection error
          if (data.error === 'HubSpot not connected') {
            toast({
              title: 'HubSpot Not Connected',
              description: 'Please connect your HubSpot account to access content.',
              variant: 'destructive',
            })
          } else {
            toast({
              title: 'Could not load content',
              description: data.error,
              variant: 'destructive',
            })
          }
        }
      } catch (error) {
        if (!append) {
          setContent([])
          setTotalItems(0)
        }
        toast({
          title: 'Error Loading Content',
          description: error instanceof Error ? error.message : 'Failed to load content',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [hubspotToken, contentType, toast, currentBatch, maxBatches]
  )

  const handleContentTypeChange = (newContentType: string) => {
    const newlySelectedContentType = contentTypes.find(ct => ct.id.toString() === newContentType)
    setContentType(newlySelectedContentType)
    setContent([])
    setTotalItems(0)
    setCurrentPage(1)
    setCursors([null])
    setDisplayColumns([])
    pageCache.current = {}
    setSelectedRows([])
    setSearchTerm('')
    setSlugSearchTerm('')
    setHtmlTitleSearchTerm('')
    setLanguageFilter('all')
    setDynamicFilters({})
    setStatus('all')
    setDateRange([null, null])
    setCurrentBatch(1)
    setHasMoreRecords(false)
  }

  // Refresh connection status when component loads
  useEffect(() => {
    refreshConnectionStatus()
  }, [refreshConnectionStatus])

  // Load content when component mounts and when content type changes
  useEffect(() => {
    if (hubspotToken && contentType && connectionStatus.hubspot) {
      loadContent(1, [null], true)
    }
    if (contentTypes.length > 0 && !contentType) {
      setContentType(contentTypes.find(ct => ct.slug === 'landing-pages'))
    }
  }, [hubspotToken, contentType, contentTypes, connectionStatus.hubspot, loadContent])

  // Update the shared header last-updated span when data loads
  useEffect(() => {
    if (lastUpdated) {
      const el = document.getElementById('last-updated-display')
      if (el) el.textContent = lastUpdated.toLocaleString()
    }
  }, [lastUpdated])

  // Fetch content counts when component mounts and when content type changes
  useEffect(() => {
    fetchContentCounts()
  }, [fetchContentCounts])

  const filteredContent = useMemo(() => {
    // If we have search results, use those instead of regular content
    if (currentSearchTerm && searchResults.length > 0) {
      return searchResults
    }

    // Save current scroll position before filtering
    if (dataTableRef.current) {
      scrollPositionRef.current = dataTableRef.current.scrollTop
    }

    return content.filter(item => {
      // Get the data source (allHeaders contains all fields)
      const dataSource = item.allHeaders || item.exportHeaders || item

      const nameMatch =
        !searchTerm || dataSource.name?.toLowerCase().includes(searchTerm.toLowerCase())
      const slugMatch =
        !slugSearchTerm ||
        dataSource.slug?.toLowerCase().includes(slugSearchTerm.toLowerCase()) ||
        dataSource.url?.toLowerCase().includes(slugSearchTerm.toLowerCase())
      const htmlTitleMatch =
        !htmlTitleSearchTerm ||
        dataSource.htmlTitle?.toLowerCase().includes(htmlTitleSearchTerm.toLowerCase())
      const statusMatch =
        stateFilter === 'all' ||
        dataSource.state?.toUpperCase() === stateFilter.toUpperCase() ||
        dataSource.published?.toString().toUpperCase() === stateFilter.toUpperCase()
      const languageMatch =
        languageFilter === 'all' ||
        !languageFilter ||
        languageFilter.trim() === '' ||
        dataSource.language?.toLowerCase().includes(languageFilter.toLowerCase())

      // Handle publish date filter
      const publishDateMatch =
        !publishDateFilter ||
        publishDateFilter.trim() === '' ||
        (() => {
          const fieldValue = dataSource.publishDate
          if (!fieldValue) return true
          const fieldDate = new Date(fieldValue).toISOString().split('T')[0]
          const filterDate = publishDateFilter
          return fieldDate === filterDate
        })()

      // Handle created at filter
      const createdAtMatch =
        !createdAtFilter ||
        createdAtFilter.trim() === '' ||
        (() => {
          const fieldValue = dataSource.createdAt
          if (!fieldValue) return true
          const fieldDate = new Date(fieldValue).toISOString().split('T')[0]
          const filterDate = createdAtFilter
          return fieldDate === filterDate
        })()

      // Handle dynamic filters for all other filterable fields
      const dynamicFiltersMatch = Object.entries(dynamicFilters).every(
        ([fieldName, filterValue]) => {
          if (!filterValue || filterValue.trim() === '') return true
          const fieldValue = dataSource[fieldName]
          if (!fieldValue) return true

          // Handle date fields specially
          if (fieldName === 'publishDate' && filterValue) {
            const fieldDate = new Date(fieldValue).toISOString().split('T')[0]
            const filterDate = filterValue
            return fieldDate === filterDate
          }

          return String(fieldValue).toLowerCase().includes(filterValue.toLowerCase())
        }
      )

      const dateMatch = (() => {
        // If no date range is selected, show all items
        if (!dateRange[0] && !dateRange[1]) {
          return true
        }

        // If no createdAt field, exclude the item
        if (!dataSource.createdAt) {
          return false
        }

        const itemDate = new Date(dataSource.createdAt)

        // If both start and end dates are selected
        if (dateRange[0] && dateRange[1]) {
          const startDate = new Date(dateRange[0])
          const endDate = new Date(dateRange[1])

          // Set start date to beginning of day
          startDate.setHours(0, 0, 0, 0)
          // Set end date to end of day
          endDate.setHours(23, 59, 59, 999)

          return itemDate >= startDate && itemDate <= endDate
        }

        // If only start date is selected, treat it as that exact day
        if (dateRange[0]) {
          const startDate = new Date(dateRange[0])
          const endDate = new Date(dateRange[0])
          startDate.setHours(0, 0, 0, 0)
          endDate.setHours(23, 59, 59, 999)
          return itemDate >= startDate && itemDate <= endDate
        }

        // If only end date is selected
        if (dateRange[1]) {
          const endDate = new Date(dateRange[1])
          endDate.setHours(23, 59, 59, 999)
          return itemDate <= endDate
        }

        return true
      })()

      return (
        nameMatch &&
        slugMatch &&
        htmlTitleMatch &&
        statusMatch &&
        languageMatch &&
        publishDateMatch &&
        createdAtMatch &&
        dynamicFiltersMatch &&
        dateMatch
      )
    })
  }, [
    content,
    searchTerm,
    slugSearchTerm,
    htmlTitleSearchTerm,
    stateFilter,
    languageFilter,
    publishDateFilter,
    createdAtFilter,
    dynamicFilters,
    dateRange,
    currentSearchTerm,
    searchResults,
  ])

  // Restore scroll position after filtering
  useEffect(() => {
    if (dataTableRef.current && scrollPositionRef.current > 0) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        if (dataTableRef.current) {
          dataTableRef.current.scrollTop = scrollPositionRef.current
        }
      })
    }
  }, [filteredContent])

  useEffect(() => {
    if (content.length > 0) {
      if (displayColumns.length > 0) return

      const firstItem = content[0]
      let exportColumns: { key: string; label: string }[] = []
      if (firstItem.exportHeaders) {
        exportColumns = Object.keys(firstItem.exportHeaders)
          .map(key => ({ key, label: formatColumnLabel(key) }))
          .sort((a, b) => a.label.localeCompare(b.label))
      } else {
        const allKeys = new Set<string>()
        content.forEach(item => {
          Object.keys(item).forEach(key => allKeys.add(key))
        })
        exportColumns = Array.from(allKeys)
          .map(key => ({ key, label: formatColumnLabel(key) }))
          .sort((a, b) => a.label.localeCompare(b.label))
      }

      let allTableColumns: string[] = []
      if (firstItem.allHeaders) {
        allTableColumns = Object.keys(firstItem.allHeaders).sort()
      } else {
        const allKeys = new Set<string>()
        content.forEach(item => {
          Object.keys(item).forEach(key => allKeys.add(key))
        })
        allTableColumns = Array.from(allKeys).sort()
      }

      setAvailableColumns(exportColumns)
      setSelectedColumns(exportColumns.map(c => c.key))
      setDisplayColumns(['name', ...allTableColumns.filter(c => c !== 'name')])
    } else {
      setDisplayColumns([])
    }
  }, [content, displayColumns.length])

  const refreshCurrentPage = () => {
    setRefreshing(true)
    loadContent(currentPage, cursors, true).finally(() => setRefreshing(false))
  }

  const loadMore = () => {
    if (!loadingMore && hasMore && currentBatch < maxBatches) {
      const nextPage = currentPage + 1
      loadContent(nextPage, cursors, false, true)
    }
  }

  const handlePagination = (newPage: number) => {
    // Reset to first batch when changing pages
    setCurrentBatch(1)
    setContent([])
    loadContent(newPage, cursors, false, false)
  }

  const handleBulkEditConfirm = async (updates: { [key: string]: any }) => {
    if (selectedRows.length === 0) {
      toast({
        title: 'No Rows Selected',
        description: 'Please select at least one row to edit.',
        variant: 'destructive',
      })
      return
    }

    if (Object.keys(updates).length === 0) {
      toast({
        title: 'No Changes Entered',
        description: 'Please modify at least one field to confirm an update.',
        variant: 'destructive',
      })
      return
    }

    setIsPublishing(true)
    try {
      // Get content type information for each selected item
      const selectedItemsWithContentType = selectedRows.map(pageId => {
        const item = content.find(item => item.id === pageId)
        return {
          pageId,
          contentType: item?.contentType || contentType,
        }
      })

      // Use a single API call for bulk operations
      const requestBody = {
        userId: user.id,
        selectedItems: selectedItemsWithContentType,
        updates: updates,
        contentType: contentType?.slug || contentType?.name,
      }

      const response = await fetch('/api/pages/bulk-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      // Always log the activity regardless of success or failure
      try {
        if (result.success) {
          const { successful, failed } = result

          // toast({
          //   title: 'Successfully Updated HubSpot',
          //   description: `${successful} record(s) updated successfully${failed > 0 ? `, ${failed} failed` : ''}.`,
          // })

          // Log successful operation
          await logBulkEditingActivity(updates, successful, failed, true, undefined, selectedRows)

          // Don't clear selected rows here - let the modal handle it when user closes
          // setSelectedRows([])
          // I don't think we need to refresh the page as it doesn't change appearance in the data
          // refreshCurrentPage()
        } else {
          toast({
            title: 'Failed to Update HubSpot',
            description: result.error || 'All records failed to update. Please try again.',
            variant: 'destructive',
          })

          // Log failed operation
          await logBulkEditingActivity(
            updates,
            0,
            selectedRows.length,
            false,
            result.error,
            selectedRows
          )
        }
      } catch {
        // Still show the appropriate toast even if logging fails
        if (result.success) {
          const { successful, failed } = result
          toast({
            title: 'Successfully Updated HubSpot',
            description: `${successful} record(s) updated successfully${failed > 0 ? `, ${failed} failed` : ''}.`,
          })
          // Don't clear selected rows here - let the modal handle it when user closes
          // setSelectedRows([])
          refreshCurrentPage()
        } else {
          toast({
            title: 'Failed to Update HubSpot',
            description: result.error || 'All records failed to update. Please try again.',
            variant: 'destructive',
          })
        }
      }
    } catch (_error) {
      console.error('Error in handleBulkEditConfirm:', _error)

      // Log the error as a failed operation
      try {
        await logBulkEditingActivity(
          updates,
          0,
          selectedRows.length,
          false,
          _error instanceof Error ? _error.message : 'An unknown error occurred'
        )
      } catch (logError) {
        console.error('Failed to log error:', logError)
      }

      toast({
        title: 'Error Updating HubSpot',
        description: _error instanceof Error ? _error.message : 'An unknown error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsPublishing(false)
    }
  }

  // Deduplication mechanism to prevent logging identical operations
  const lastLogRef = useRef<{ timestamp: number; content: string } | null>(null)

  const logBulkEditingActivity = async (
    changes: { [key: string]: any },
    successful: number,
    failed: number,
    wasSuccessful: boolean = true,
    errorMessage?: string,
    selectedPageIds?: string[]
  ) => {
    // Check for duplicate operations within 2 seconds
    const now = Date.now()
    const logContent = JSON.stringify({
      changes,
      successful,
      failed,
      wasSuccessful,
      selectedPageIds,
    })

    if (
      lastLogRef.current &&
      now - lastLogRef.current.timestamp < 2000 &&
      lastLogRef.current.content === logContent
    ) {
      return // Skip duplicate logging
    }

    lastLogRef.current = { timestamp: now, content: logContent }
    try {
      // Construct pageChanges array with detailed information
      const pageChanges =
        selectedPageIds
          ?.map(pageId => {
            const page = content.find(item => item.id === pageId)
            if (!page) return null

            // Extract page name from multiple possible sources
            let pageName = 'Unknown Page'
            if (page.name && page.name !== 'Untitled') {
              pageName = page.name
            } else if (page.htmlTitle && page.htmlTitle !== 'Untitled') {
              pageName = page.htmlTitle
            } else if (page.title && page.title !== 'Untitled') {
              pageName = page.title
            } else if (page.metaTitle && page.metaTitle !== 'Untitled') {
              pageName = page.metaTitle
            } else if (page.exportHeaders?.name && page.exportHeaders.name !== 'Untitled') {
              pageName = page.exportHeaders.name
            } else if (page.allHeaders?.name && page.allHeaders.name !== 'Untitled') {
              pageName = page.allHeaders.name
            } else {
              pageName = `Page ${pageId}`
            }

            // Clean up page name
            pageName = pageName.replace(/^Untitled\s*/, '').trim() || `Page ${pageId}`

            // Extract previous values for each changed field
            const fieldChanges = Object.keys(changes).map(fieldKey => {
              // Map field keys to human-readable labels
              const fieldKeyToLabel: { [key: string]: string } = {
                name: 'Page Name',
                htmlTitle: 'HTML Title',
                title: 'Title',
                metaTitle: 'Meta Title',
                metaDescription: 'Meta Description',
                // Add more field mappings as needed
              }

              const fieldLabel = fieldKeyToLabel[fieldKey] || fieldKey

              // Extract previous value from multiple possible sources
              let previousValue = 'Field not set'
              if (page[fieldKey as keyof typeof page]) {
                previousValue = String(page[fieldKey as keyof typeof page])
              } else if (page.exportHeaders?.[fieldKey]) {
                previousValue = String(page.exportHeaders[fieldKey])
              } else if (page.allHeaders?.[fieldKey]) {
                previousValue = String(page.allHeaders[fieldKey])
              }

              // Clean up previous value
              if (
                previousValue === 'undefined' ||
                previousValue === 'null' ||
                previousValue === ''
              ) {
                previousValue = 'Field not set'
              }

              return {
                pageId,
                pageName,
                field: fieldLabel,
                previousValue: previousValue || 'Field not set',
                newValue: String(changes[fieldKey]),
              }
            })

            return fieldChanges
          })
          .flat()
          .filter(Boolean) || []

      const response = await fetch('/api/audit/bulk-editing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: wasSuccessful ? 'bulk_edit_publish' : 'bulk_edit_failed',
          changes: Object.keys(changes).length,
          successful,
          failed,
          contentType: contentType,
          errorMessage: errorMessage || null,
          wasSuccessful,
          updatesApplied: changes,
          selectedPageIds: selectedPageIds || [],
          pageChanges: pageChanges, // Add the detailed page changes
        }),
      })

      await response.json()

      if (!response.ok) {
        console.error('Audit API failed with status:', response.status)
      }
    } catch (error) {
      // Silent fail for logging
      console.error('Failed to log bulk editing activity:', error)
    }
  }

  const handleClearSelection = () => {
    setSelectedRows([])
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? filteredContent.map(p => p.id) : [])
  }

  const handleSelectRow = (id: string) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    )
  }

  const handleModalOpenChange = (open: boolean) => {
    setIsExportModalOpen(open)
  }

  const handleColumnReorder = (newOrder: string[]) => {
    setDisplayColumns(newOrder)
  }

  const DatePickerCustomInput = forwardRef(({ value, onClick }: any, ref: any) => (
    <Button variant="outline" onClick={onClick} ref={ref}>
      <CalendarIcon className="mr-2 h-4 w-4" />
      {value || 'Select Date Range'}
    </Button>
  ))
  DatePickerCustomInput.displayName = 'DatePickerCustomInput'

  // Show loading state while checking connections
  if (connectionStatus.loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checking Connections...</CardTitle>
          <CardDescription>Verifying your HubSpot and Google Sheets connections.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4 pt-4">
            <div className="h-10 bg-muted/50 rounded w-full"></div>
            <div className="h-20 bg-muted/50 rounded w-full"></div>
            <div className="h-4 bg-muted/50 rounded w-3/4 mt-2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show connection prompts if HubSpot is not connected
  if (!connectionStatus.hubspot) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b bg-background">
          <div>
            <CardTitle className="text-foreground">Content Manager</CardTitle>
            <CardDescription className="mt-1">
              Manage and export your HubSpot content.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">HubSpot Not Connected</p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Connect your HubSpot account to manage and export your content, pages, blog posts, and
              other assets.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show loading state when connection is loading or when content is being fetched
  if (connectionStatus.loading || (loading && content.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {connectionStatus.loading
              ? 'Checking Connections...'
              : `Loading ${currentContentTypeLabel}...`}
          </CardTitle>
          <CardDescription>
            {connectionStatus.loading
              ? 'Verifying your HubSpot and Google Sheets connections.'
              : 'Fetching the latest data from HubSpot.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4 pt-4">
            <div className="h-10 bg-muted/50 rounded w-full"></div>
            <div className="h-20 bg-muted/50 rounded w-full"></div>
            <div className="h-4 bg-muted/50 rounded w-3/4 mt-2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show connection prompt if HubSpot is not connected
  if (!connectionStatus.hubspot) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b bg-background">
          <div>
            <CardTitle className="text-foreground">Content Manager</CardTitle>
            <CardDescription className="mt-1">
              Manage and export your HubSpot content.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">HubSpot Not Connected</p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Connect your HubSpot account to manage and export your content, pages, blog posts, and
              other assets.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-4 w-4" />
              Content Manager
            </CardTitle>
            <CardDescription className="mt-2">
              Manage and Export your HubSpot content.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <Select value={contentType?.id.toString()} onValueChange={handleContentTypeChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map(contentTypeOption => (
                  <SelectItem key={contentTypeOption.id} value={contentTypeOption.id.toString()}>
                    {contentTypeOption.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={refreshCurrentPage} disabled={refreshing || loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {/* <Button onClick={testAuditLog} variant="outline" size="sm">
              Test Audit Log
            </Button> */}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <HubSpotSearch
              contentType={contentType}
              onSearchResults={handleSearchResults}
              onClearSearch={handleClearSearch}
              isSearching={isSearching}
              setIsSearching={setIsSearching}
            />
          </div>
          <Filters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            slugSearchTerm={slugSearchTerm}
            setSlugSearchTerm={setSlugSearchTerm}
            htmlTitleSearchTerm={htmlTitleSearchTerm}
            setHtmlTitleSearchTerm={setHtmlTitleSearchTerm}
            languageFilter={languageFilter}
            setLanguageFilter={setLanguageFilter}
            stateFilter={stateFilter}
            setStateFilter={setStateFilter}
            publishDateFilter={publishDateFilter}
            setPublishDateFilter={setPublishDateFilter}
            createdAtFilter={createdAtFilter}
            setCreatedAtFilter={setCreatedAtFilter}
            dynamicFilters={dynamicFilters}
            setDynamicFilters={setDynamicFilters}
            status={status}
            setStatus={setStatus}
            contentType={contentType}
            dateRange={dateRange}
            setDateRange={setDateRange}
            content={content}
          />
        </CardContent>
      </Card>

      {(totalItems > 0 || searchResults.length > 0) && ( // Conditionally render TopBar if there's content or search results
        <TopBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={currentSearchTerm ? searchTotal : totalItems}
          itemsPerPage={itemsPerPage}
          loading={loading || isSearching}
          selectedRows={selectedRows}
          onPagination={handlePagination}
          setItemsPerPage={setItemsPerPage}
          isExportModalOpen={isExportModalOpen}
          onExportModalOpenChange={handleModalOpenChange}
          onSelectAll={handleSelectAll}
          currentContentTypeLabel={
            currentSearchTerm ? 'Search Results' : currentContentTypeLabel.toString()
          }
          exportModalContent={
            <Tabs defaultValue="csv" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="csv" className="flex items-center gap-2">
                  <Download className="h-4 w-4" /> Export as CSV
                </TabsTrigger>
                <TabsTrigger value="sheets" className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" /> Export to Google Sheets
                </TabsTrigger>
              </TabsList>
              <CsvExportTab
                availableColumns={availableColumns}
                selectedColumns={selectedColumns}
                setSelectedColumns={setSelectedColumns}
                selectedRows={selectedRows}
                content={content}
                setIsExportModalOpen={setIsExportModalOpen}
                contentType={contentType}
                user={user}
              />
              <GSheetsExportTab
                userSettings={userSettings}
                availableColumns={availableColumns}
                selectedColumns={selectedColumns}
                setSelectedColumns={setSelectedColumns}
                selectedRows={selectedRows}
                content={content}
                user={user}
                contentType={contentType}
              />
            </Tabs>
          }
        />
      )}

      {selectedRows.length > 0 && currentContentTypeLabel && (
        <>
          <BulkEditHeader
            selectedRowCount={selectedRows.length}
            contentType={contentType}
            onConfirm={handleBulkEditConfirm}
            refreshCurrentPage={refreshCurrentPage}
            onClearSelection={handleClearSelection}
            isPublishing={isPublishing}
            allContent={content}
          />
        </>
      )}

      <DataTable
        setItemsPerPage={setItemsPerPage}
        ref={dataTableRef}
        filteredContent={filteredContent}
        displayColumns={displayColumns}
        selectedRows={selectedRows}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        currentContentTypeLabel={currentContentTypeLabel.toString()}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onLoadMore={loadMore}
        onPagination={handlePagination}
        onRecordUpdate={() => {}} // Placeholder for now
        dropdownOptions={{}}
        editableTextFields={new Set()}
        onColumnReorder={handleColumnReorder}
        showPagination={totalItems > 0}
      />
    </div>
  )
}
