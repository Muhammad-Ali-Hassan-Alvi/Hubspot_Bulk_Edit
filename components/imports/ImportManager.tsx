'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileSpreadsheet, Download, CheckCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/useUserSettings'
import { useSheetPolling } from '@/hooks/useSheetPolling'
import DataTable from '@/components/pages/components/DataTable'

// --- ➕ New Loader Component ---
const ImportingDataLoader = ({ progress, message }: { progress: number; message: string }) => {
  return (
    <div className="w-full p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <div>
            <p className="font-medium text-gray-800">Importing Data</p>
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>
        <span className="text-sm font-semibold text-blue-600">{progress}%</span>
      </div>
      <Progress value={progress} className="w-full h-2" />
    </div>
  )
}

interface ImportData {
  id: string
  [key: string]: any
}

interface TabInfo {
  id: string
  name: string
}

interface SheetInfo {
  id: string
  name: string
  tabs: TabInfo[]
}

interface ImportManagerProps {
  contentType?: string
  onImportComplete?: (data: ImportData[]) => void
}

export default function ImportManager({
  contentType = 'pages',
  onImportComplete,
}: ImportManagerProps) {
  const [activeTab, setActiveTab] = useState<'csv' | 'gsheet'>('gsheet')
  const [, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<ImportData[]>([])
  const [sheets, setSheets] = useState<SheetInfo[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [selectedTab, setSelectedTab] = useState<string>('')
  const [sheetData, setSheetData] = useState<ImportData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [changes, setChanges] = useState<any[]>([])
  const [selectedChangedRows, setSelectedChangedRows] = useState<string[]>([])

  // --- ➕ New State for the Loader ---
  const [importProgress, setImportProgress] = useState<{
    active: boolean
    progress: number
    message: string
  }>({ active: false, progress: 0, message: '' })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user } = useUser()

  const polling = useSheetPolling({
    sheetId: selectedSheet,
    tabName: selectedTab,
    userId: user?.id || '',
    contentType,
    intervalMs: 30000,
    enabled: false,
    onChangesDetected: undefined,
  })

  useEffect(() => {
    if (activeTab === 'gsheet' && user?.id) {
      fetchUserSheets()
    }
  }, [activeTab, user?.id])

  const fetchUserSheets = async () => {
    if (!user?.id) {
      console.log('No user ID available')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/google/sheets')
      if (response.ok) {
        const data = await response.json()
        setSheets(data.sheets || [])
      } else {
        const errorData = await response.json()
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to fetch Google Sheets',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Sheets fetch error:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch Google Sheets',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid File',
        description: 'Please select a CSV file',
        variant: 'destructive',
      })
      return
    }

    setCsvFile(file)
    parseCsvFile(file)
  }

  const parseCsvFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const data = lines
        .slice(1)
        .filter(line => line.trim())
        .map((line, index) => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
          const row: ImportData = { id: `csv_${index}` }
          headers.forEach((header, i) => {
            row[header] = values[i] || ''
          })
          return row
        })
      setCsvData(data)
      toast({
        title: 'CSV Loaded',
        description: `${data.length} rows imported successfully`,
      })
    }
    reader.readAsText(file)
  }

  const handleSheetChange = async (sheetId: string) => {
    setSelectedSheet(sheetId)
    setSelectedTab('')
    setSheetData([])
    setChanges([])

    if (!sheetId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/google/sheets/${sheetId}/tabs`)
      if (response.ok) {
        const data = await response.json()
        setSheets(prevSheets =>
          prevSheets.map(sheet =>
            sheet.id === sheetId ? { ...sheet, tabs: data.tabs || [] } : sheet
          )
        )
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch sheet tabs',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // --- 🔄 MODIFIED: handleTabChange with loader logic ---
  const handleTabChange = async (tabName: string) => {
    setSelectedTab(tabName)
    setSheetData([])
    setChanges([])

    if (!selectedSheet || !tabName) return

    setImportProgress({ active: true, progress: 0, message: 'Initiating connection...' })

    try {
      setTimeout(
        () =>
          setImportProgress(prev => ({
            ...prev,
            progress: 25,
            message: 'Reading sheet structure...',
          })),
        100
      )

      const response = await fetch(`/api/google/sheets/${selectedSheet}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabName }),
      })

      setTimeout(
        () =>
          setImportProgress(prev => ({
            ...prev,
            progress: 50,
            message: 'Fetching rows from Google Sheet...',
          })),
        500
      )

      if (response.ok) {
        const data = await response.json()

        if (data.success) {
          setSheetData(data.rows || [])
          setTimeout(
            () =>
              setImportProgress(prev => ({
                ...prev,
                progress: 75,
                message: 'Detecting changes...',
              })),
            1000
          )

          if (data.rows && data.rows.length > 0) {
            await detectChanges(data.rows, selectedSheet, tabName) // Pass args directly
          }

          setImportProgress({ active: true, progress: 100, message: 'Done!' })

          toast({
            title: 'Sheet Data Loaded',
            description: `${data.rows?.length || 0} rows imported successfully`,
          })
        } else {
          throw new Error(data.error || 'Failed to fetch sheet data')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error fetching sheet data:', error)
      toast({
        title: 'Error',
        description: `Failed to fetch sheet data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setTimeout(() => {
        setImportProgress({ active: false, progress: 0, message: '' })
      }, 1500)
    }
  }

  const detectChanges = async (importData: ImportData[], sheetId: string, tabName: string) => {
    if (!user?.id || importData.length === 0 || !sheetId || !tabName) return

    // Use setIsLoading for this secondary loading state
    setIsLoading(true)
    try {
      const response = await fetch('/api/import/detect-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          contentType,
          importData,
          sheetId: sheetId,
          tabName: tabName,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setChanges(data.changes || [])
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to detect changes',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const syncToHubSpot = async () => {
    const currentData = activeTab === 'csv' ? csvData : sheetData
    if (currentData.length === 0) return

    const dataToSync =
      selectedChangedRows.length > 0
        ? currentData.filter(item => selectedChangedRows.includes(item.Id || item.id))
        : currentData

    if (dataToSync.length === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select items to sync.',
        variant: 'destructive',
      })
      return
    }

    setIsSyncing(true)
    setSyncProgress(0)

    try {
      const response = await fetch('/api/import/sync-to-hubspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          contentType,
          importData: dataToSync,
          changes: allChanges,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        const progressInterval = setInterval(() => {
          setSyncProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval)
              setIsSyncing(false)
              toast({
                title: 'Sync Complete',
                description: `Successfully synced ${data.synced || 0} items to HubSpot`,
              })
              polling.clearChanges()
              setChanges([])
              setSelectedChangedRows([])
              onImportComplete?.(currentData)
              return 100
            }
            return prev + Math.random() * 20 + 10
          })
        }, 200)
      }
    } catch (error) {
      setIsSyncing(false)
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync data to HubSpot',
        variant: 'destructive',
      })
    }
  }

  const currentData = activeTab === 'csv' ? csvData : sheetData
  const hasData = currentData && currentData.length > 0
  const allChanges = [...changes, ...polling.changes]
  const hasChanges = allChanges && allChanges.length > 0

  const groupedChanges = allChanges.reduce(
    (acc, change: any) => {
      const pageId = change.pageId
      if (!acc[pageId]) {
        acc[pageId] = {
          pageId: pageId,
          pageName: change.name || change.pageName || pageId,
          changes: [],
        }
      }

      if (change.fields) {
        Object.entries(change.fields).forEach(([fieldName, fieldData]: [string, any]) => {
          acc[pageId].changes.push({
            field: fieldName,
            oldValue: fieldData.old,
            newValue: fieldData.new,
            pageId: change.pageId,
          })
        })
      } else {
        acc[pageId].changes.push(change)
      }

      return acc
    },
    {} as Record<string, { pageId: string; pageName: string; changes: any[] }>
  )

  const groupedChangesArray = Object.values(groupedChanges)

  const renderChangeValue = (value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (value.layoutSections || value.widgets || value.translations) {
        return '[Complex Object]'
      }
      if (Array.isArray(value)) {
        return `[Array with ${value.length} items]`
      }
      const jsonString = JSON.stringify(value)
      return jsonString.length > 50 ? `${jsonString.substring(0, 50)}...` : jsonString
    }
    if (typeof value === 'boolean') {
      return value.toString()
    }
    if (typeof value === 'string' && value.length > 100) {
      return `${value.substring(0, 100)}...`
    }
    return String(value || '')
  }

  const transformedChangesForTable = groupedChangesArray.map((pageChange: any) => {
    const changeSummary = pageChange.changes.reduce((acc: any, change: any) => {
      acc[change.field] =
        `${renderChangeValue(change.oldValue)} → ${renderChangeValue(change.newValue)}`
      return acc
    }, {})

    return {
      id: pageChange.pageId,
      name: pageChange.pageName,
      pageId: pageChange.pageId,
      changesCount: pageChange.changes.length,
      ...changeSummary,
    }
  })

  const displayColumns = [
    'name',
    'pageId',
    'changesCount',
    ...new Set(
      groupedChangesArray.flatMap((pageChange: any) =>
        pageChange.changes.map((change: any) => change.field)
      )
    ),
  ]

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Import {contentType}
            </CardTitle>
            <CardDescription>
              Import data from CSV files or Google Sheets and sync changes to HubSpot
            </CardDescription>
          </div>
          <Select
            value={activeTab}
            onValueChange={value => setActiveTab(value as 'csv' | 'gsheet')}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV Upload
                </div>
              </SelectItem>
              <SelectItem value="gsheet">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Google Sheets
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'csv' | 'gsheet')}>
          <TabsContent value="csv" className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Upload CSV File</p>
                <p className="text-sm text-gray-500">Select a CSV file to import data</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={true}
                  className="mt-4"
                >
                  Select CSV
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gsheet" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Sheet</label>
                <Select
                  value={selectedSheet}
                  onValueChange={handleSheetChange}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={isLoading ? 'Loading sheets...' : 'Choose a Google Sheet'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(!sheets || sheets.length === 0) && !isLoading ? (
                      <SelectItem value="no-sheets" disabled>
                        No sheets found. Connect Google Sheets first.
                      </SelectItem>
                    ) : (
                      sheets?.map(sheet => (
                        <SelectItem key={sheet.id} value={sheet.id}>
                          {sheet.name}
                        </SelectItem>
                      )) || []
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Tab</label>
                <Select
                  value={selectedTab}
                  onValueChange={handleTabChange}
                  disabled={!selectedSheet}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a tab" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets
                      .find(s => s.id === selectedSheet)
                      ?.tabs?.map(tab => {
                        const tabValue = typeof tab === 'string' ? tab : tab.name || tab.id
                        const tabLabel = typeof tab === 'string' ? tab : tab.name || tab.id
                        return (
                          <SelectItem key={tabValue} value={tabValue}>
                            {tabLabel}
                          </SelectItem>
                        )
                      }) || (
                      <SelectItem value="no-tabs" disabled>
                        No tabs found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* --- 🔄 MODIFIED: Conditional Rendering Block --- */}
            {importProgress.active ? (
              <div className="mt-4">
                <ImportingDataLoader
                  progress={importProgress.progress}
                  message={importProgress.message}
                />
              </div>
            ) : (
              <>
                {selectedSheet && selectedTab && sheetData.length > 0 && (
                  <Alert className="mt-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Sheet: {sheets.find(s => s.id === selectedSheet)?.name} - Tab: {selectedTab} (
                      {sheetData.length} rows loaded)
                    </AlertDescription>
                  </Alert>
                )}

                {hasData && activeTab === 'gsheet' && (
                  <div className="mt-6 space-y-4 ">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{currentData.length} rows</Badge>
                        {hasChanges && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {groupedChangesArray.length} pages with changes
                            </Badge>
                            <Badge variant="secondary">{allChanges.length} field changes</Badge>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => detectChanges(currentData, selectedSheet, selectedTab)}
                          disabled={isLoading || !selectedSheet || !selectedTab || !hasData}
                          variant="outline"
                          className="min-w-[140px]"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Detect Changes'
                          )}
                        </Button>
                        <Button
                          onClick={syncToHubSpot}
                          disabled={isSyncing || !hasChanges}
                          className="min-w-[140px]"
                        >
                          {isSyncing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              Sync to HubSpot
                              {selectedChangedRows.length > 0 && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {selectedChangedRows.length}
                                </Badge>
                              )}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {isSyncing && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Syncing to HubSpot...</span>
                          <span>{Math.round(syncProgress)}%</span>
                        </div>
                        <Progress value={syncProgress} className="w-full" />
                      </div>
                    )}

                    <div className="flex justify-between items-center gap-4">
                      {/* <div className="flex items-center gap-2">
                        {hasChanges && (
                          <>
                            <Badge variant="outline" className="text-xs">
                              {transformedChangesForTable.length} pages with changes
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {selectedChangedRows.length} selected
                            </Badge>
                          </>
                        )}
                      </div> */}
                    </div>

                    {hasChanges && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Detected Changes:</h4>
                        </div>
                        <DataTable
                          filteredContent={transformedChangesForTable}
                          displayColumns={displayColumns}
                          selectedRows={selectedChangedRows}
                          currentPage={1}
                          totalPages={1}
                          totalItems={transformedChangesForTable.length}
                          itemsPerPage={transformedChangesForTable.length}
                          loading={false}
                          currentContentTypeLabel="Changed Pages"
                          onSelectAll={checked => {
                            if (checked) {
                              setSelectedChangedRows(
                                transformedChangesForTable.map(item => item.id)
                              )
                            } else {
                              setSelectedChangedRows([])
                            }
                          }}
                          onSelectRow={id => {
                            setSelectedChangedRows(prev =>
                              prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
                            )
                          }}
                          onPagination={() => {}}
                          onRecordUpdate={() => {}}
                          dropdownOptions={{}}
                          editableTextFields={new Set()}
                          showPagination={false}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
