'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import ScrollToTopButton from '@/components/ui/scroll-to-top-button'
import HeadersTableSkeleton from '@/components/ui/skeleton/HeadersTableSkeleton'
import Filters from './components/filters/filters'
import Configurations from './components/header-configurations/configurations'
import MissingHeadersPopup from './components/missing-headers-popup'
// import DefaultConfigurationPopup from './components/default-configuration-popup'
// import SyncWithGSheetsPopup from './components/sync-with-gsheets-popup'
// import AddHeader from './components/add-header/add-header'

interface HeaderConfig {
  id?: number
  header: string
  displayName?: string
  headerType: string
  category: string
  filters: boolean
  read_only: boolean
  in_app_edit: boolean
  lastUpdated: string | null
  updatedBy?: number
  contentTypes: {
    'site-pages': boolean
    'landing-pages': boolean
    'blog-posts': boolean
    blogs: boolean
    tags: boolean
    authors: boolean
    'url-redirects': boolean
    'hubdb-tables': boolean
  }
  [key: string]: any
}

const initialData: HeaderConfig[] = []

type SortDirection = 'asc' | 'desc' | null

interface SortConfig {
  key: string
  direction: SortDirection
}

export default function HeadersPage() {
  const [data, setData] = useState<HeaderConfig[]>(initialData)
  const [originalData, setOriginalData] = useState<HeaderConfig[]>(initialData)
  const [hasChanges, setHasChanges] = useState(false)
  const { toast } = useToast()

  const [filteredData, setFilteredData] = useState<HeaderConfig[]>(initialData)
  const [isUpdating, _setIsUpdating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null })

  const getHeadersConfigurations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      }

      console.log('Fetching headers from DB...')
      const res = await fetch('/api/hubspot/header-configurations')

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const payload = await res.json()

      if (payload && Array.isArray(payload.rows)) {
        setData(payload.rows)
        setOriginalData(payload.rows)
        setFilteredData(payload.rows)
        setHasChanges(false)
        setSortConfig({ key: '', direction: null }) // Reset sorting when new data is loaded
      } else if (payload.error) {
        console.error('API returned error:', payload.error)
        toast({
          title: 'Error',
          description: `Error fetching headers: ${payload.error}`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to refresh headers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setIsInitialLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    getHeadersConfigurations()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Function to check if current data differs from original data
  const checkForChanges = (currentData: HeaderConfig[]) => {
    const hasChanges = JSON.stringify(currentData) !== JSON.stringify(originalData)
    setHasChanges(hasChanges)
  }

  // Sorting functions
  const getSortValue = (item: HeaderConfig, key: string): any => {
    if (key.startsWith('contentTypes.')) {
      const contentTypeKey = key.split('.')[1]
      return item.contentTypes[contentTypeKey as keyof typeof item.contentTypes] ? 1 : 0
    }

    const value = item[key]

    // Handle different data types for sorting
    if (key === 'lastUpdated') {
      return value ? new Date(value).getTime() : 0
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0
    }

    if (typeof value === 'string') {
      return value.toLowerCase()
    }

    return value || ''
  }

  const sortData = (
    dataToSort: HeaderConfig[],
    key: string,
    direction: SortDirection
  ): HeaderConfig[] => {
    if (!direction) return dataToSort

    return [...dataToSort].sort((a, b) => {
      const aValue = getSortValue(a, key)
      const bValue = getSortValue(b, key)

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  const handleSort = (key: string) => {
    let direction: SortDirection = 'asc'

    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc'
      } else if (sortConfig.direction === 'desc') {
        direction = null
      } else {
        direction = 'asc'
      }
    }

    setSortConfig({ key, direction })

    if (direction) {
      const sortedData = sortData(filteredData, key, direction)
      setFilteredData(sortedData)
    } else {
      setFilteredData([...filteredData])
    }
  }

  const updateField = (index: number, field: string, value: any) => {
    const newData = [...data]
    newData[index] = { ...newData[index], [field]: value }
    setData(newData)

    // Apply current sorting to maintain sort order
    if (sortConfig.direction && sortConfig.key) {
      const sortedData = sortData(newData, sortConfig.key, sortConfig.direction)
      setFilteredData(sortedData)
    } else {
      setFilteredData(newData)
    }

    checkForChanges(newData)
  }

  const removeRow = (index: number) => {
    const newData = data.filter((_, i) => i !== index)
    setData(newData)

    // Apply current sorting to maintain sort order
    if (sortConfig.direction && sortConfig.key) {
      const sortedData = sortData(newData, sortConfig.key, sortConfig.direction)
      setFilteredData(sortedData)
    } else {
      setFilteredData(newData)
    }

    checkForChanges(newData)
  }

  const saveHeaders = async () => {
    setIsSaving(true)
    try {
      console.log('Saving headers configuration...')
      console.log('Data being sent:', JSON.stringify(data, null, 2))
      const res = await fetch('/api/hubspot/header-configurations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rows: data }),
      })

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const result = await res.json()
      console.log('Save result:', result)

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Headers configuration saved successfully!',
        })
        // Refetch data from database to ensure we have the latest values
        await getHeadersConfigurations()
      } else {
        toast({
          title: 'Error',
          description: `Error saving configuration: ${result.error || 'Unknown error'}`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving headers:', error)
      toast({
        title: 'Error',
        description: `Failed to save headers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Headers Configuration</h1>
          <p className="text-muted-foreground">
            Manage header configurations for different content types and features.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Header Configuration Management</span>
              <div className="flex gap-2">
                <Button
                  onClick={() => getHeadersConfigurations(true)}
                  variant="outline"
                  disabled={isRefreshing || isInitialLoading}
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    'Refresh Headers'
                  )}
                </Button>
                <MissingHeadersPopup onHeadersUpdated={() => getHeadersConfigurations(true)} />
                {/* <DefaultConfigurationPopup /> */}
                {/* <SyncWithGSheetsPopup /> */}
                {/* <AddHeader
                  data={data}
                  setData={setData}
                  setFilteredData={setFilteredData}
                  checkForChanges={checkForChanges}
                /> */}
                <Button onClick={saveHeaders} variant="default" disabled={!hasChanges || isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
                {/* <Button onClick={testGoogleScript} variant="secondary">
                  Test Connection
                </Button> */}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Show skeleton loader during initial load */}
            {isInitialLoading ? (
              <HeadersTableSkeleton rows={10} />
            ) : (
              <>
                {/* Filters Section */}
                <Filters
                  data={data}
                  filteredData={filteredData}
                  setFilteredData={newFilteredData => {
                    // Apply current sorting to the newly filtered data
                    if (sortConfig.direction && sortConfig.key) {
                      const sortedData = sortData(
                        newFilteredData,
                        sortConfig.key,
                        sortConfig.direction
                      )
                      setFilteredData(sortedData)
                    } else {
                      setFilteredData(newFilteredData)
                    }
                  }}
                />

                <Configurations
                  data={data}
                  filteredData={filteredData}
                  isUpdating={isUpdating}
                  isSaving={isSaving}
                  isRefreshing={isRefreshing}
                  updateField={updateField}
                  removeRow={removeRow}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scroll to Top Button - Testing with lower threshold */}
      <ScrollToTopButton threshold={50} />
    </>
  )
}
