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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/useUserSettings'
import { useSheetPolling } from '@/hooks/useSheetPolling'

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
  const [pollingEnabled, setPollingEnabled] = useState(false)
  const [pollingInterval, setPollingInterval] = useState(30) // seconds
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user } = useUser()

  // Initialize polling hook (will be updated after function declarations)
  const polling = useSheetPolling({
    sheetId: selectedSheet,
    tabName: selectedTab,
    userId: user?.id || '',
    contentType,
    intervalMs: pollingInterval * 1000,
    enabled: pollingEnabled && !!selectedSheet && !!selectedTab && !!user?.id,
    onChangesDetected: undefined, // Will be set after function declaration
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
      console.log('Fetching sheets for user:', user.id)
      const response = await fetch('/api/google/sheets')
      console.log('Sheets response:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Sheets data:', data)
        setSheets(data.sheets || [])
      } else {
        const errorData = await response.json()
        console.error('Sheets fetch error:', errorData)
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
        console.log('Tabs data received:', data.tabs)
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

  const handleTabChange = async (tabName: string) => {
    setSelectedTab(tabName)
    setSheetData([])
    setChanges([])

    if (!selectedSheet || !tabName) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/google/sheets/${selectedSheet}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabName }),
      })

      if (response.ok) {
        const data = await response.json()
        setSheetData(data.rows || [])

        if (data.rows && data.rows.length > 0 && selectedSheet && selectedTab) {
          await detectChanges(data.rows)
        }

        toast({
          title: 'Sheet Data Loaded',
          description: `${data.rows?.length || 0} rows imported successfully`,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch sheet data',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const detectChanges = async (importData: ImportData[]) => {
    if (!user?.id || importData.length === 0 || !selectedSheet || !selectedTab) {
      console.log('Skipping detectChanges - missing required data:', {
        userId: user?.id,
        importDataLength: importData.length,
        selectedSheet,
        selectedTab,
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/import/detect-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          contentType,
          importData,
          sheetId: selectedSheet,
          tabName: selectedTab,
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

    setIsSyncing(true)
    setSyncProgress(0)

    try {
      const response = await fetch('/api/import/sync-to-hubspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          contentType,
          importData: currentData,
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
              // Clear polling changes after successful sync
              polling.clearChanges()
              setChanges([])
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

  const syncToHubSpotWithPollingChanges = async (pollingChanges: any[]) => {
    const currentData = activeTab === 'csv' ? csvData : sheetData
    if (currentData.length === 0) return

    try {
      const response = await fetch('/api/import/sync-to-hubspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          contentType,
          importData: currentData,
          changes: pollingChanges,
          isPollingSync: true,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Auto-Sync Complete',
          description: `Successfully synced ${data.synced || 0} items to HubSpot automatically`,
        })
        // Clear polling changes after successful sync
        polling.clearChanges()
      }
    } catch (error) {
      toast({
        title: 'Auto-Sync Failed',
        description: 'Failed to automatically sync changes to HubSpot',
        variant: 'destructive',
      })
    }
  }

  // Update polling hook with the callback function
  useEffect(() => {
    if (autoSyncEnabled) {
      ;(polling as any).onChangesDetected = syncToHubSpotWithPollingChanges
    } else {
      ;(polling as any).onChangesDetected = undefined
    }
  }, [autoSyncEnabled])

  const currentData = activeTab === 'csv' ? csvData : sheetData
  const hasData = currentData && currentData.length > 0
  const allChanges = [...changes, ...polling.changes]
  const hasChanges = allChanges && allChanges.length > 0

  // Group changes by page for display
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
      
      // Convert the fields object to individual change objects
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
        // Handle the old format for backward compatibility
        acc[pageId].changes.push(change)
      }
      
      return acc
    },
    {} as Record<string, { pageId: string; pageName: string; changes: any[] }>
  )

  const groupedChangesArray = Object.values(groupedChanges)

  const renderChangeValue = (value: any) => {
    if (typeof value === 'object' && value !== null) {
      // For complex objects like layoutSections, show a summary instead of full JSON
      if (value.layoutSections || value.widgets || value.translations) {
        return '[Complex Object]'
      }
      // For arrays, show the count
      if (Array.isArray(value)) {
        return `[Array with ${value.length} items]`
      }
      // For other objects, show a truncated version
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

            {selectedSheet && selectedTab && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Sheet: {sheets.find(s => s.id === selectedSheet)?.name} - Tab: {selectedTab} (
                  {sheetData.length} rows loaded)
                </AlertDescription>
              </Alert>
            )}

            {/* Polling Controls */}
            {selectedSheet && selectedTab && (
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Real-time Sync
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Automatically detect changes in your Google Sheet
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="polling-toggle" className="text-sm font-medium">
                        Enable Auto-Sync
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Check for changes every {pollingInterval} seconds
                      </p>
                    </div>
                    <Switch
                      id="polling-toggle"
                      checked={pollingEnabled}
                      onCheckedChange={setPollingEnabled}
                      disabled={!selectedSheet || !selectedTab}
                    />
                  </div>

                  {pollingEnabled && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="polling-interval" className="text-sm">
                          Check Interval
                        </Label>
                        <Select
                          value={pollingInterval.toString()}
                          onValueChange={value => setPollingInterval(parseInt(value))}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15s</SelectItem>
                            <SelectItem value="30">30s</SelectItem>
                            <SelectItem value="60">1m</SelectItem>
                            <SelectItem value="120">2m</SelectItem>
                            <SelectItem value="300">5m</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={polling.pollForChanges}
                          disabled={polling.isPolling}
                        >
                          <RefreshCw
                            className={`h-3 w-3 mr-1 ${polling.isPolling ? 'animate-spin' : ''}`}
                          />
                          Check Now
                        </Button>

                        {polling.lastCheck && (
                          <span className="text-xs text-muted-foreground">
                            Last check: {polling.lastCheck.toLocaleTimeString()}
                          </span>
                        )}
                      </div>

                      {polling.error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">{polling.error}</AlertDescription>
                        </Alert>
                      )}

                      {polling.changes.length > 0 && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {polling.changes.length} changes detected from polling
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="auto-sync-toggle" className="text-sm font-medium">
                            Auto-Sync Changes
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Automatically sync detected changes to HubSpot
                          </p>
                        </div>
                        <Switch
                          id="auto-sync-toggle"
                          checked={autoSyncEnabled}
                          onCheckedChange={setAutoSyncEnabled}
                          disabled={!pollingEnabled}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {hasData && activeTab === 'gsheet' && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{currentData.length} rows</Badge>
                {hasChanges && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{groupedChangesArray.length} pages with changes</Badge>
                    <Badge variant="secondary">{allChanges.length} field changes</Badge>
                    {polling.changes.length > 0 && (
                      <Badge variant="default" className="bg-green-600">
                        {polling.changes.length} from auto-sync
                      </Badge>
                    )}
                  </div>
                )}
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

            {hasChanges && (
              <div className="space-y-2">
                <h4 className="font-medium">Detected Changes:</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {groupedChangesArray.slice(0, 10).map((pageChange: any, index: number) => (
                    <div key={index} className="text-sm p-3 bg-gray-50 rounded border">
                      <div className="font-medium text-blue-600 mb-2 flex items-center justify-between">
                        <span>{pageChange.pageName} ({pageChange.pageId}) - MODIFIED</span>
                        <span className="text-xs text-gray-500">{pageChange.changes.length} changes</span>
                      </div>
                      <div className="space-y-1">
                        {pageChange.changes.map((change: any, changeIndex: number) => (
                          <div key={changeIndex} className="text-xs text-gray-600 bg-white p-2 rounded border-l-2 border-blue-200">
                            <div className="font-medium text-gray-800 mb-1">
                              {change.field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs">
                                {renderChangeValue(change.oldValue)}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs">
                                {renderChangeValue(change.newValue)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {groupedChangesArray.length > 10 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      ... and {groupedChangesArray.length - 10} more pages with changes
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                onClick={() => detectChanges(currentData)}
                disabled={isLoading || !selectedSheet || !selectedTab || !hasData}
                variant="outline"
                className="min-w-[140px]"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Detect Changes'}
              </Button>
              <Button
                onClick={syncToHubSpot}
                disabled={isSyncing || !hasChanges}
                className="min-w-[140px]"
              >
                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sync to HubSpot'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
