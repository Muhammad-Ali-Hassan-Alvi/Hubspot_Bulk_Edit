'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, FileText } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import 'react-datepicker/dist/react-datepicker.css'
import { useContentTypes } from '@/hooks/useContentTypes'
import DataTable from './DataTable'
import Filters from '../pages/components/Filters'

interface PageManagerProps {
  user: User
  userSettings: any
}

// THIS IS THE CORRECTED TYPE DEFINITION
interface HubSpotContent {
  id: string
  name: string
  allHeaders: { [key: string]: any } // This line was missing
  [key: string]: any
}

const IN_APP_EDITABLE_TEXT_FIELDS = new Set(['name', 'htmlTitle', 'slug'])

const MOCK_DROPDOWN_OPTIONS = {
  state: ['PUBLISHED', 'DRAFT', 'SCHEDULED', 'ARCHIVED'],
}

export default function InAppPageManager({ userSettings }: PageManagerProps) {
  const [content, setContent] = useState<HubSpotContent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [slugSearchTerm, setSlugSearchTerm] = useState('')
  const [htmlTitleSearchTerm, setHtmlTitleSearchTerm] = useState('')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [publishDateFilter, setPublishDateFilter] = useState('')
  const [createdAtFilter, setCreatedAtFilter] = useState('')
  const [dynamicFilters, setDynamicFilters] = useState<{ [key: string]: string }>({})
  const [refreshing, setRefreshing] = useState(false)
  const [contentType, setContentType] = useState('all-pages')
  const [status, setStatus] = useState('all')
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [displayColumns, setDisplayColumns] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null])
  const { toast } = useToast()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(100)
  const [totalItems, setTotalItems] = useState(0)
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const [modifiedRecords, setModifiedRecords] = useState<{ [key: string]: any }>({})
  const pageCache = useRef<{ [key: number]: HubSpotContent[] }>({})

  // Fetch dynamic content types
  const { contentTypes } = useContentTypes()

  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const currentContentTypeLabel =
    contentTypes.find(ct => ct.value === contentType)?.label || 'Content'

  const hubspotToken = userSettings?.hubspot_token_encrypted

  const loadContent = useCallback(
    async (page: number, currentCursors: (string | null)[], forceRefresh = false) => {
      if (pageCache.current[page] && !forceRefresh) {
        setContent(pageCache.current[page])
        setCurrentPage(page)
        return
      }

      if (!hubspotToken) {
        toast({
          title: 'HubSpot Not Connected',
          description: 'Could not find HubSpot token in your settings.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }
      setLoading(true)
      setModifiedRecords({})
      const after = currentCursors[page - 1]
      try {
        const response = await fetch('/api/hubspot/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hubspotToken: hubspotToken,
            contentType: contentType,
            limit: itemsPerPage,
            after: after,
          }),
        })
        const data = await response.json()
        if (data.success) {
          const newContent = data.content || []
          setContent(newContent)
          pageCache.current[page] = newContent
          setTotalItems(data.total || 0)
          setCurrentPage(page)
          if (data.paging?.next?.after) {
            setCursors(prev => {
              const newCursors = [...prev]
              newCursors[page] = data.paging.next.after
              return newCursors
            })
          }
        } else {
          setContent([])
          setTotalItems(0)
          toast({
            title: 'Could Not Load Content',
            description: data.error || 'An unknown error occurred.',
            variant: 'destructive',
          })
        }
      } catch (error) {
        toast({
          title: 'Error Loading Content',
          description: error instanceof Error ? error.message : 'Failed to load content',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [hubspotToken, contentType, itemsPerPage, toast]
  )

  useEffect(() => {
    loadContent(1, [null], true)
  }, [contentType, itemsPerPage, loadContent])

  const handleContentTypeChange = (newContentType: string) => {
    setContent([])
    setTotalItems(0)
    setCurrentPage(1)
    setCursors([null])
    setDisplayColumns([])
    pageCache.current = {}
    setContentType(newContentType)
  }

  const contentWithModifications = useMemo(() => {
    if (Object.keys(modifiedRecords).length === 0) {
      return content
    }
    return content.map(item => {
      const newItem = { ...item }
      if (modifiedRecords[item.id]) {
        newItem.allHeaders = { ...item.allHeaders, ...modifiedRecords[item.id] }
      }
      return newItem
    })
  }, [content, modifiedRecords])

  const filteredContent = useMemo(() => {
    return contentWithModifications.filter(item => {
      const data = item.allHeaders
      if (!data) return false
      const nameMatch = !searchTerm || data.name?.toLowerCase().includes(searchTerm.toLowerCase())
      const slugMatch =
        !slugSearchTerm || data.slug?.toLowerCase().includes(slugSearchTerm.toLowerCase())
      const htmlTitleMatch =
        !htmlTitleSearchTerm ||
        data.htmlTitle?.toLowerCase().includes(htmlTitleSearchTerm.toLowerCase())
      const statusMatch =
        stateFilter === 'all' || data.state?.toUpperCase() === stateFilter.toUpperCase()

      // Handle publish date filter
      const publishDateMatch =
        !publishDateFilter ||
        publishDateFilter.trim() === '' ||
        (() => {
          const fieldValue = data.publishDate
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
          const fieldValue = data.createdAt
          if (!fieldValue) return true
          const fieldDate = new Date(fieldValue).toISOString().split('T')[0]
          const filterDate = createdAtFilter
          return fieldDate === filterDate
        })()

      const dateMatch = (() => {
        // If no date range is selected, show all items
        if (!dateRange[0] && !dateRange[1]) {
          return true
        }

        // If no createdAt field, exclude the item
        if (!data.createdAt) {
          return false
        }

        const itemDate = new Date(data.createdAt)

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
        publishDateMatch &&
        createdAtMatch &&
        dateMatch
      )
    })
  }, [
    contentWithModifications,
    searchTerm,
    slugSearchTerm,
    htmlTitleSearchTerm,
    stateFilter,
    publishDateFilter,
    createdAtFilter,
    dateRange,
  ])

  useEffect(() => {
    if (content.length > 0 && content[0].allHeaders) {
      const allKeys = Object.keys(content[0].allHeaders)
      setDisplayColumns(['name', ...allKeys.filter(key => key !== 'name')])
    } else {
      setDisplayColumns([])
    }
  }, [content])

  const refreshCurrentPage = () => {
    setRefreshing(true)
    loadContent(currentPage, cursors, true).finally(() => setRefreshing(false))
  }

  const handlePagination = (newPage: number) => {
    loadContent(newPage, cursors)
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? filteredContent.map(p => p.id) : [])
  }

  const handleSelectRow = (id: string) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    )
  }

  const handleRecordUpdate = (recordId: string, field: string, value: any) => {
    setModifiedRecords(prev => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || {}),
        [field]: value,
      },
    }))
  }

  const handleSaveChanges = () => {
    const updatedContent = content.map(item => {
      if (modifiedRecords[item.id]) {
        return { ...item, allHeaders: { ...item.allHeaders, ...modifiedRecords[item.id] } }
      }
      return item
    })

    setContent(updatedContent)
    setModifiedRecords({})

    toast({
      title: 'Perfect.',
      description:
        "We would recommend you to Sync these changes with your Hubspot Records as these changes may lost since you don't have a premium plan",
      duration: 6000,
    })
  }

  if (loading && content.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Content...</CardTitle>
          <CardDescription>Fetching the latest data from HubSpot.</CardDescription>
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

  return (
    <div className="flex flex-col space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {currentContentTypeLabel} ({totalItems} items)
            </CardTitle>
            <CardDescription className="mt-2">
              Manage and Edit your HubSpot content.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={contentType} onValueChange={handleContentTypeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Change Type" />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={refreshCurrentPage} disabled={refreshing || loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            dateRange={dateRange}
            setDateRange={setDateRange}
            contentType={contentType}
            content={content}
          />
        </CardContent>
      </Card>

      <DataTable
        filteredContent={filteredContent}
        displayColumns={displayColumns}
        selectedRows={selectedRows}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        loading={loading}
        currentContentTypeLabel={currentContentTypeLabel}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onPagination={handlePagination}
        onRecordUpdate={handleRecordUpdate}
        dropdownOptions={MOCK_DROPDOWN_OPTIONS}
        editableTextFields={IN_APP_EDITABLE_TEXT_FIELDS}
      />

      {Object.keys(modifiedRecords).length > 0 && (
        <div className="flex justify-end sticky bottom-4">
          <Button size="lg" onClick={handleSaveChanges} className="shadow-2xl">
            Save Changes ({Object.keys(modifiedRecords).length} records changed)
          </Button>
        </div>
      )}
    </div>
  )
}
