'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileSpreadsheet,
  Upload,
  ArrowBigDownDash,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useContentTypes } from '@/hooks/useContentTypes'
import type { ContentTypeT } from '@/lib/content-types'
import type { User } from '@supabase/supabase-js'
import SelectSheetAndTab from '@/components/shared/GoogleSheetsConnection/components/SelectSheetAndTab'
import DataTable from '../pages/components/DataTable'
import HeadersViewModal from './HeadersViewModal'

interface ImportsPageProps {
  user: User
  userSettings?: any
}

export default function ImportsPage({ user, userSettings }: ImportsPageProps) {
  const { contentTypes } = useContentTypes()
  const { toast } = useToast()
  const [selectedContentType, setSelectedContentType] = useState<ContentTypeT | undefined>()
  const [importMethod, setImportMethod] = useState<'google-sheets' | 'csv'>('google-sheets')
  const [selectedSheetId, setSelectedSheetId] = useState<string>('')
  const [selectedTabId, setSelectedTabId] = useState<string>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [fileSheets, setFileSheets] = useState<{ id: string; name: string }[]>([])
  const [selectedFileSheet, setSelectedFileSheet] = useState<string>('')
  const [processingFile, setProcessingFile] = useState(false)
  const [exportingToSheets, setExportingToSheets] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchedData, setFetchedData] = useState<any[] | null>(null)
  const [showFetchedData, setShowFetchedData] = useState(false)
  const [displayColumns, setDisplayColumns] = useState<string[]>([])
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [showHeadersModal, setShowHeadersModal] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Set default content type to landing pages when content types are loaded
  useEffect(() => {
    if (contentTypes && contentTypes.length > 0 && !selectedContentType) {
      const landingPages = contentTypes.find(ct => ct.slug === 'landing-pages')
      if (landingPages) {
        setSelectedContentType(landingPages)
      } else {
        setSelectedContentType(contentTypes[0])
      }
    }
  }, [contentTypes, selectedContentType])

  // Function to clear table data and reset to default state
  const clearTableData = () => {
    setFetchedData(null)
    setShowFetchedData(false)
    setDisplayColumns([])
    setSelectedRows([])
  }

  // Function to reset file upload section
  const resetFileSection = () => {
    setCsvFile(null)
    setFileSheets([])
    setSelectedFileSheet('')
    setProcessingFile(false)
  }

  // Function to reset Google Sheets section
  const resetGoogleSheetsSection = () => {
    setSelectedSheetId('')
    setSelectedTabId('')
    setExportingToSheets(false)
  }

  const handleContentTypeChange = (value: string) => {
    const contentType = contentTypes.find(ct => ct.id.toString() === value)
    setSelectedContentType(contentType)
    // Clear table data when content type changes
    clearTableData()
  }

  const handleTabNameChange = (name: string) => {
    // Handle tab name change if needed
    console.log('Tab name changed:', name)
  }

  const handleSheetSelectionChange = (sheetId: string) => {
    setSelectedSheetId(sheetId)
    // Clear table data when sheet selection changes
    clearTableData()
  }

  const handleTabSelectionChange = (tab: { id: string; name: string }) => {
    setSelectedTabId(tab.id)
    console.log('Tab selected:', tab)
    // Clear table data when tab selection changes
    clearTableData()
  }

  const handleCsvFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setCsvFile(null)
      setFileSheets([])
      setSelectedFileSheet('')
      return
    }

    // Check file type
    const fileExtension = file.name.toLowerCase().split('.').pop()
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      setCsvFile(null)
      setFileSheets([])
      setSelectedFileSheet('')
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a CSV or Excel file (.csv, .xlsx, .xls)',
        variant: 'destructive',
      })
      return
    }

    setCsvFile(file)
    setProcessingFile(true)
    setFileSheets([])
    setSelectedFileSheet('')
    // Clear table data when new file is uploaded (in case user uploads different file)
    clearTableData()

    try {
      // Process the file to get available sheets
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/files/process', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setFileSheets(result.sheets)
        toast({
          title: 'File Processed',
          description: `${result.message} Please select a sheet/tab to continue.`,
        })
      } else {
        throw new Error(result.error || 'Failed to process file')
      }
    } catch (error) {
      console.error('Error processing file:', error)
      setCsvFile(null)
      setFileSheets([])
      setSelectedFileSheet('')
      toast({
        title: 'Processing Failed',
        description: error instanceof Error ? error.message : 'Failed to process file',
        variant: 'destructive',
      })
    } finally {
      setProcessingFile(false)
    }
  }

  const handleFetchSheetData = async () => {
    if (!selectedContentType || !selectedSheetId) return

    setLoading(true)
    setShowFetchedData(false)
    try {
      const response = await fetch(
        `/api/google/sheets/${selectedSheetId}/data${selectedTabId ? `?tabId=${selectedTabId}` : ''}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      const result = await response.json()

      if (!result.success) {
        // Handle "no data found" case gracefully by showing empty state
        if (
          result.error &&
          (result.error.toLowerCase().includes('no data found') ||
            result.error.toLowerCase().includes('no content found') ||
            result.error.toLowerCase().includes('empty sheet'))
        ) {
          setFetchedData([])
          setDisplayColumns([])
          setShowFetchedData(true)
          return
        }

        // For other errors, show toast
        toast({
          title: 'Fetch Failed',
          description: result.error || 'Failed to fetch sheet data.',
          variant: 'destructive',
        })
        return
      }

      console.log('Fetched sheet data:', result.data)

      // Convert readable headers back to camelCase (reverse of export process)
      const convertReadableHeaderToCamelCase = (readableHeader: string): string => {
        return readableHeader
          .split(' ')
          .map((word, index) =>
            index === 0
              ? word.toLowerCase()
              : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join('')
      }

      // Transform data to match DataTable format and convert headers back to camelCase
      const transformedData = result.data.map((row: any, index: number) => {
        const convertedRow: any = {
          id: row.id || row.ID || row.Id || `row-${index + 1}`, // Use existing ID or create one
        }

        // Convert all field names from readable format back to camelCase
        for (const [readableField, value] of Object.entries(row)) {
          if (readableField.startsWith('_')) {
            // Keep internal fields as is
            convertedRow[readableField] = value
          } else {
            // Convert readable header back to camelCase
            const camelCaseField = convertReadableHeaderToCamelCase(readableField)
            convertedRow[camelCaseField] = value
          }
        }

        return convertedRow
      })

      // Get column names from converted data (excluding internal fields)
      const allColumns =
        transformedData.length > 0
          ? Object.keys(transformedData[0]).filter(key => !key.startsWith('_'))
          : []

      // If 'name' exists in data, make it first column for sticky behavior
      const columns = allColumns.includes('name')
        ? ['name', ...allColumns.filter(col => col !== 'name')]
        : allColumns

      console.log('Display columns:', columns)
      console.log('First few transformed rows:', transformedData.slice(0, 2))

      setFetchedData(transformedData)
      setDisplayColumns(columns)
      setShowFetchedData(true)

      toast({
        title: 'Data Fetched Successfully',
        description: `Retrieved ${result.data.length} rows from the sheet.`,
      })
    } catch (error) {
      console.error('Error fetching sheet data:', error)
      toast({
        title: 'Fetch Failed',
        description: 'An error occurred while fetching sheet data.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSyncToHubSpot = async () => {
    if (!selectedContentType || !fetchedData || selectedRows.length === 0) return

    setSyncing(true)
    try {
      // Get selected row data
      const selectedData = fetchedData.filter(row => selectedRows.includes(row.id))

      // Sync each selected row to HubSpot
      let successCount = 0
      let errorCount = 0
      let firstErrorMessage = ''

      for (const rowData of selectedData) {
        try {
          console.log('Syncing record to HubSpot:', {
            contentType: selectedContentType.slug,
            recordId: rowData.id,
            recordData: rowData,
          })

          const response = await fetch('/api/hubspot/sync-record', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contentType: selectedContentType.slug,
              recordData: rowData,
            }),
          })

          const result = await response.json()
          console.log('HubSpot sync response:', result)

          if (result.success) {
            successCount++
          } else {
            console.error('Sync failed for record:', rowData.id, result.error)
            errorCount++

            // Store first error message for later use
            if (errorCount === 1 && result.error) {
              firstErrorMessage = result.error
            }
          }
        } catch (error) {
          console.error('Error syncing record:', rowData.id, error)
          errorCount++

          // Store first error message for later use
          if (errorCount === 1) {
            firstErrorMessage = error instanceof Error ? error.message : 'Network error occurred'
          }
        }
      }

      // Show results with specific error details combined with counts
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: 'Sync Complete',
          description: `Successfully synced ${successCount} records to HubSpot.`,
        })
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: 'Partial Success',
          description: `Synced ${successCount} records successfully, ${errorCount} failed.${
            firstErrorMessage ? `\nError: ${firstErrorMessage}` : ''
          }\n\nNote: You have selected "${selectedContentType.name}" content type. Make sure the content you're importing matches this content type in HubSpot.`,
          variant: 'destructive',
        })
      } else if (errorCount > 0) {
        toast({
          title: 'Sync Failed',
          description: `Failed to sync ${errorCount} record${errorCount > 1 ? 's' : ''} to HubSpot.${
            firstErrorMessage ? `\nError: ${firstErrorMessage}` : ''
          }\n\nNote: You have selected "${selectedContentType.name}" content type. Make sure the content you're importing matches this content type in HubSpot.`,
          variant: 'destructive',
        })
      }

      // Clear selection after sync
      setSelectedRows([])
    } catch (error) {
      console.error('Error during sync:', error)
      toast({
        title: 'Sync Error',
        description: 'An error occurred while syncing to HubSpot.',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleFetchFileData = async () => {
    if (!selectedContentType || !csvFile || !selectedFileSheet) return

    setLoading(true)
    setShowFetchedData(false)

    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('sheetName', selectedFileSheet)
      if (selectedContentType) {
        formData.append('contentType', selectedContentType.slug)
      }

      const response = await fetch('/api/files/extract-data', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        // Handle "no data found" case gracefully by showing empty state
        if (
          result.error &&
          (result.error.toLowerCase().includes('no data found') ||
            result.error.toLowerCase().includes('no content found') ||
            result.error.toLowerCase().includes('empty sheet'))
        ) {
          setFetchedData([])
          setDisplayColumns([])
          setShowFetchedData(true)
          return
        }

        // For other errors, show toast
        toast({
          title: 'Data Extraction Failed',
          description: result.error || 'Failed to extract data from file.',
          variant: 'destructive',
        })
        return
      }

      console.log('Fetched file data:', result.data)

      const transformedData = result.data

      // Get column names from converted data (excluding internal fields)
      const allColumns =
        transformedData.length > 0
          ? Object.keys(transformedData[0]).filter(key => !key.startsWith('_'))
          : []

      // If 'name' exists in data, make it first column for sticky behavior
      const columns = allColumns.includes('name')
        ? ['name', ...allColumns.filter(col => col !== 'name')]
        : allColumns

      console.log('Display columns:', columns)
      console.log('First few transformed rows:', transformedData.slice(0, 2))

      setFetchedData(transformedData)
      setDisplayColumns(columns)
      setShowFetchedData(true)

      toast({
        title: 'Data Fetched Successfully',
        description: `Retrieved ${result.data.length} rows from ${result.fileName} (${result.sheetName}).`,
      })
    } catch (error) {
      console.error('Error fetching file data:', error)
      toast({
        title: 'Fetch Failed',
        description: 'An error occurred while fetching file data.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (importMethod === 'google-sheets') {
      await handleFetchSheetData()
    } else {
      await handleFetchFileData()
    }
  }

  const canImport =
    selectedContentType &&
    ((importMethod === 'google-sheets' && selectedSheetId && exportingToSheets) ||
      (importMethod === 'csv' && csvFile && selectedFileSheet))

  return (
    <div className="w-full space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowBigDownDash className="h-5 w-5" />
                Import Data
              </CardTitle>
              <CardDescription>
                Select a content type and import method to fetch and preview data from your source.
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {/* Content Type Selection */}
              <div className="space-y-1">
                <Select
                  value={selectedContentType?.id.toString() || ''}
                  onValueChange={handleContentTypeChange}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map(contentType => (
                      <SelectItem key={contentType.id} value={contentType.id.toString()}>
                        {contentType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Import Source Configuration */}
          <Tabs
            value={importMethod}
            onValueChange={value => {
              const newMethod = value as 'google-sheets' | 'csv'
              setImportMethod(newMethod)
              // Clear table data when switching import methods
              clearTableData()

              // Reset the opposite section when switching tabs
              if (newMethod === 'google-sheets') {
                // Switching to Google Sheets - reset file section
                resetFileSection()
              } else {
                // Switching to file upload - reset Google Sheets section
                resetGoogleSheetsSection()
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="google-sheets" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Google Sheets
              </TabsTrigger>
              <TabsTrigger value="csv" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload File
              </TabsTrigger>
            </TabsList>

            <TabsContent value="google-sheets" className="space-y-4 pt-4">
              {user && userSettings ? (
                <SelectSheetAndTab
                  user={user}
                  userSettings={userSettings}
                  selectedSheetId={selectedSheetId}
                  setSelectedSheetId={handleSheetSelectionChange}
                  onTabNameChange={handleTabNameChange}
                  onTabSelectionChange={handleTabSelectionChange}
                  setExportingToSheets={setExportingToSheets}
                  isImportContext={true}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Please ensure you're logged in and have Google Sheets connected.
                </div>
              )}
            </TabsContent>

            <TabsContent value="csv" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">Upload File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleCsvFileChange}
                    className="cursor-pointer"
                    disabled={processingFile}
                  />
                  {csvFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                  {processingFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing file...
                    </div>
                  )}
                  {!csvFile && !processingFile && (
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV or Excel file to see available sheets/tabs
                    </p>
                  )}
                </div>

                {fileSheets.length > 0 && (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Available Sheets/Tabs:</strong> {fileSheets.length} found
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {fileSheets.map(sheet => (
                          <span
                            key={sheet.id}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-700"
                          >
                            {sheet.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sheet-select">Select Sheet/Tab to Import</Label>
                      <Select
                        value={selectedFileSheet}
                        onValueChange={value => {
                          setSelectedFileSheet(value)
                          // Clear table data when file sheet selection changes
                          clearTableData()
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a sheet/tab..." />
                        </SelectTrigger>
                        <SelectContent>
                          {fileSheets.map(sheet => (
                            <SelectItem key={sheet.id} value={sheet.name}>
                              {sheet.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedFileSheet && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>Ready to import from:</strong> {selectedFileSheet}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Import Button */}
          <div className="flex justify-end pt-4 gap-2">
            {/* <Button onClick={handleImport} disabled={true} size="sm">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Comparing Data...
                </>
              ) : (
                <>
                  <GitCompareArrows className="h-4 w-4 mr-2" />
                  Compare Data <ComingSoonBadge className="text-background border-background" />
                </>
              )}
            </Button> */}
            <Button onClick={handleImport} disabled={!canImport || loading} size="sm">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fetching Data...
                </>
              ) : (
                <>
                  {importMethod === 'google-sheets' ? (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {importMethod === 'google-sheets' ? 'Fetch Sheet Data' : 'Fetch File Data'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Read-only fields notice */}
      {showFetchedData && (
        <Card>
          <CardContent className="pt-6">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">Read-Only Fields Notice</p>
                  <p className="text-blue-700">
                    Only editable fields are considered for change detection. Fields marked as "Read
                    Only" are completely excluded from syncing back to HubSpot - even if you modify
                    these fields in your Google Sheet or exported file, they won't be detected as
                    changes and won't be synchronized back to HubSpot. This protects critical
                    HubSpot system fields from unintended modifications.
                    {selectedContentType && (
                      <>
                        {' '}
                        <button
                          onClick={() => setShowHeadersModal(true)}
                          className="underline hover:text-blue-800 font-medium"
                        >
                          View all headers for {selectedContentType.name}
                        </button>
                        .
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Button - appears when rows are selected */}
      {showFetchedData && selectedRows.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Sync Selected Records</h3>
                <p className="text-sm text-muted-foreground">
                  Sync {selectedRows.length} selected records back to HubSpot. Only editable fields
                  will be updated.
                </p>
              </div>
              <Button
                onClick={handleSyncToHubSpot}
                disabled={syncing}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Sync to HubSpot
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sheet Data Display */}
      {showFetchedData && (
        <DataTable
          filteredContent={fetchedData || []}
          displayColumns={displayColumns}
          selectedRows={selectedRows}
          currentPage={1}
          totalPages={1}
          totalItems={fetchedData?.length || 0}
          itemsPerPage={fetchedData?.length || 0}
          loading={false}
          loadingMore={false}
          hasMore={false}
          currentContentTypeLabel={selectedContentType?.name || 'Sheet Data'}
          onSelectAll={(checked: boolean) => {
            if (checked && fetchedData) {
              setSelectedRows(fetchedData.map(item => item.id))
            } else {
              setSelectedRows([])
            }
          }}
          onSelectRow={(id: string) => {
            setSelectedRows(prev =>
              prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
            )
          }}
          onLoadMore={() => {}}
          onPagination={() => {}}
          onRecordUpdate={() => {}}
          dropdownOptions={{}}
          editableTextFields={new Set()}
          onColumnReorder={(newOrder: string[]) => setDisplayColumns(newOrder)}
          showPagination={false}
          isImportContext={true}
        />
      )}

      {/* Headers View Modal */}
      <HeadersViewModal
        isOpen={showHeadersModal}
        onOpenChange={setShowHeadersModal}
        contentType={selectedContentType}
      />
    </div>
  )
}
