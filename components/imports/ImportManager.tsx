'use client'

import { useState, useCallback, useEffect } from 'react'
import { useImportManager } from '@/hooks/useImportManager' // 👈 Import the new hook
import { useContentTypesOptions } from '@/hooks/useContentTypes'
import { useToast } from '@/hooks/use-toast'
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
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import DataTable from '@/components/pages/components/DataTable'
import SheetAndTabSelector from './SheetAndTabSelector'
import ConfirmChangesModal from '@/components/modals/ConfirmChangesModal'
import UploadingModal from '@/components/modals/UploadingModal'
import UploadResultsModal from '@/components/modals/UploadResultsModal'

// This small component can stay here as it's only used in this file
const ImportingDataLoader = ({ progress, message }: { progress: number; message: string }) => {
  return (
    <div className="w-full p-4 border rounded-lg bg-background shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="font-medium text-foreground">Importing Data</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <span className="text-sm font-semibold text-primary">{progress}%</span>
      </div>
      <Progress value={progress} className="w-full h-2" />
    </div>
  )
}

interface ImportManagerProps {
  contentType?: string
  onImportComplete?: (data: any[]) => void
}

export default function ImportManager({
  contentType: initialContentType = 'landing-pages',
  onImportComplete,
}: ImportManagerProps) {
  // Content type state
  const [selectedContentType, setSelectedContentType] = useState(initialContentType)
  const { options: contentTypesOptions, loading: contentTypesLoading } = useContentTypesOptions()

  // Content type state is properly managed

  // Ensure selected content type is valid when options load
  useEffect(() => {
    if (contentTypesOptions.length > 0 && !contentTypesLoading) {
      const isValidOption = contentTypesOptions.some(option => option.value === selectedContentType)
      if (!isValidOption) {
        // If current selection is not valid, set to first available option (should be landing-pages)
        const defaultOption =
          contentTypesOptions.find(option => option.value === 'landing-pages') ||
          contentTypesOptions[0]
        setSelectedContentType(defaultOption.value)
      }
    }
  }, [contentTypesOptions, contentTypesLoading, selectedContentType])

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false)
  const { toast } = useToast()

  // Handle content type change
  const handleContentTypeChange = (newContentType: string) => {
    setSelectedContentType(newContentType)
    // Clear any existing validation errors when content type changes
    // This will be handled by the hook when it re-runs with new contentType
  }

  // --- 👇 All logic is now handled by the hook! ---
  const {
    activeTab,
    sheets,
    selectedSheet,
    selectedTab,
    sheetData,
    isLoading,
    isLoadingTabs,
    isSyncing,
    syncProgress,
    importProgress,
    selectedChangedRows,
    validationError,
    isValidating,
    user,
    userSettings,
    currentData,
    hasData,
    hasChanges,
    flattenedChanges,
    groupedChangesArray,
    uploadFlow,
    handleConfirmSync,
    fileInputRef,
    setActiveTab,
    handleCsvUpload,
    handleSheetChange,
    handleTabChange,
    detectChanges,
    syncToHubSpot,
    setSelectedChangedRows,
    resetCsvData,
  } = useImportManager({
    contentType: selectedContentType,
    onImportComplete,
    onContentTypeChange: handleContentTypeChange,
  })

  // Drag and drop handlers (after hook call to access handleCsvUpload)
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      const file = files[0]

      if (file && file.name.endsWith('.csv')) {
        // Create a fake event object to reuse the existing handler
        const fakeEvent = {
          target: { files: [file] },
        } as unknown as React.ChangeEvent<HTMLInputElement>
        handleCsvUpload(fakeEvent)
      } else if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        toast({
          title: 'Excel Files Not Supported',
          description: 'Please convert your Excel file to CSV format first',
          variant: 'destructive',
        })
      }
    },
    [handleCsvUpload, toast]
  )

  // --- Display columns and headers can stay here as they are UI-specific ---
  const displayColumns = ['pageName', 'pageId', 'field', 'oldValue', 'newValue']
  const customColumnHeaders = {
    pageName: 'Page Name',
    pageId: 'Page ID',
    field: 'Field',
    oldValue: 'Old Value',
    newValue: 'New Value',
  }

  // --- The JSX remains almost identical, just using the values from the hook ---
  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" /> Import{' '}
                {contentTypesOptions.find(opt => opt.value === selectedContentType)?.label ||
                  (contentTypesLoading ? 'Landing Pages' : selectedContentType)}
              </CardTitle>
              <CardDescription>
                Import data from CSV files or Google Sheets and sync changes to HubSpot
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedContentType} onValueChange={handleContentTypeChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {/* Always show Landing Pages as default option */}
                  <SelectItem value="landing-pages">Landing Pages</SelectItem>
                  {/* Show other options when loaded */}
                  {contentTypesOptions
                    .filter(option => option.value !== 'landing-pages')
                    .map(contentTypeOption => (
                      <SelectItem key={contentTypeOption.value} value={contentTypeOption.value}>
                        {contentTypeOption.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
                      <FileSpreadsheet className="h-4 w-4" /> CSV Upload
                    </div>
                  </SelectItem>
                  <SelectItem value="gsheet">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" /> Google Sheets
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab}>
            <TabsContent value="csv" className="space-y-4">
              {validationError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              {/* Show upload area only if no data is loaded */}
              {!hasData && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      <strong>Note:</strong> Only CSV files exported from this system are supported.
                      Convert your Excel file to CSV format first. The file should be in the format:
                      hubspot_{selectedContentType.toLowerCase().replace(/\s+/g, '_')}
                      _X_items_YYYY-MM-DD.csv
                    </span>
                  </div>

                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragOver
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload
                      className={`h-12 w-12 mx-auto mb-4 ${
                        isDragOver ? 'text-blue-500' : 'text-gray-400'
                      }`}
                    />
                    <div className="space-y-2">
                      <p className="text-lg font-medium">
                        {isDragOver ? 'Drop your file here' : 'Upload CSV File'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {isDragOver
                          ? 'Release to upload the file'
                          : 'Drag and drop a file here or click to select'}
                      </p>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isValidating}
                        className="mt-4"
                        variant={isDragOver ? 'default' : 'outline'}
                      >
                        {isValidating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Validating...
                          </>
                        ) : (
                          'Select File'
                        )}
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
                </div>
              )}

              {/* Show data table and controls after successful validation - same as Google Sheets */}
              {importProgress.active ? (
                <div className="mt-4">
                  <ImportingDataLoader
                    progress={importProgress.progress}
                    message={importProgress.message}
                  />
                </div>
              ) : (
                <>
                  {hasData && (
                    <Alert className="mt-4">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <span>CSV File loaded successfully ({currentData.length} rows loaded)</span>
                        <Button variant="outline" size="sm" onClick={resetCsvData}>
                          Upload New File
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  {hasData && (
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        {hasChanges && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {groupedChangesArray.length} pages with changes
                            </Badge>
                            <Badge variant="secondary">
                              {flattenedChanges.length} field changes
                            </Badge>
                          </div>
                        )}
                        <div className="flex gap-2 ml-auto">
                          <Button
                            onClick={() => detectChanges(currentData, 'csv', 'csv-file')}
                            disabled={isLoading || !hasData}
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
                              'Sync to HubSpot'
                            )}
                            {selectedChangedRows.length > 0 && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {selectedChangedRows.length}
                              </Badge>
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
                      {hasChanges && (
                        <div className="space-y-4">
                          <h4 className="font-medium">Detected Changes:</h4>
                          <DataTable
                            filteredContent={flattenedChanges}
                            displayColumns={displayColumns}
                            selectedRows={selectedChangedRows}
                            onSelectAll={checked =>
                              setSelectedChangedRows(
                                checked ? flattenedChanges.map(item => item.id) : []
                              )
                            }
                            onSelectRow={id =>
                              setSelectedChangedRows(prev =>
                                prev.includes(id)
                                  ? prev.filter(rowId => rowId !== id)
                                  : [...prev, id]
                              )
                            }
                            customColumnHeaders={customColumnHeaders}
                            totalItems={flattenedChanges.length}
                            itemsPerPage={flattenedChanges.length}
                            showPagination={false}
                            loading={false}
                            currentPage={1}
                            totalPages={1}
                            onPagination={() => {}}
                            onRecordUpdate={() => {}}
                            dropdownOptions={{}}
                            editableTextFields={new Set()}
                            currentContentTypeLabel="Detected Changes"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="gsheet" className="space-y-4">
              {validationError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              {user && (
                <SheetAndTabSelector
                  user={user}
                  userSettings={userSettings}
                  selectedSheetId={selectedSheet}
                  setSelectedSheetId={handleSheetChange}
                  selectedTabName={selectedTab}
                  setSelectedTabName={handleTabChange}
                  showNewOptions={false}
                  onSheetChange={handleSheetChange}
                  onTabChange={handleTabChange}
                  sheets={sheets}
                  isLoadingSheets={isLoading}
                  isLoadingTabs={isLoadingTabs}
                />
              )}

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
                        Sheet: {sheets.find(s => s.id === selectedSheet)?.name} - Tab: {selectedTab}{' '}
                        ({sheetData.length} rows loaded)
                      </AlertDescription>
                    </Alert>
                  )}
                  {hasData && (
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        {hasChanges && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {groupedChangesArray.length} pages with changes
                            </Badge>
                            <Badge variant="secondary">
                              {flattenedChanges.length} field changes
                            </Badge>
                          </div>
                        )}
                        <div className="flex gap-2 ml-auto">
                          <Button
                            onClick={() => detectChanges(currentData, selectedSheet, selectedTab)}
                            disabled={isLoading || !hasData}
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
                              'Sync to HubSpot'
                            )}
                            {selectedChangedRows.length > 0 && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {selectedChangedRows.length}
                              </Badge>
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
                      {hasChanges && (
                        <div className="space-y-4">
                          <h4 className="font-medium">Detected Changes:</h4>
                          <DataTable
                            filteredContent={flattenedChanges}
                            displayColumns={displayColumns}
                            selectedRows={selectedChangedRows}
                            onSelectAll={checked =>
                              setSelectedChangedRows(
                                checked ? flattenedChanges.map(item => item.id) : []
                              )
                            }
                            onSelectRow={id =>
                              setSelectedChangedRows(prev =>
                                prev.includes(id)
                                  ? prev.filter(rowId => rowId !== id)
                                  : [...prev, id]
                              )
                            }
                            customColumnHeaders={customColumnHeaders}
                            totalItems={flattenedChanges.length}
                            itemsPerPage={flattenedChanges.length}
                            showPagination={false}
                            loading={false}
                            currentPage={1}
                            totalPages={1}
                            onPagination={() => {}}
                            onRecordUpdate={() => {}}
                            dropdownOptions={{}}
                            editableTextFields={new Set()}
                            currentContentTypeLabel="Detected Changes"
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

      {/* Upload Flow Modals */}
      <ConfirmChangesModal
        isOpen={uploadFlow.showConfirmation}
        onClose={() => uploadFlow.reset()}
        onConfirm={handleConfirmSync}
        changes={flattenedChanges.reduce(
          (acc, change) => {
            acc[change.field] = change.newValue
            return acc
          },
          {} as { [key: string]: any }
        )}
        selectedCount={flattenedChanges.length}
        isProcessing={uploadFlow.isProcessing}
      />

      <UploadingModal
        isOpen={uploadFlow.showProgress}
        progress={uploadFlow.progress}
        currentStatus={uploadFlow.currentStatus}
        selectedCount={flattenedChanges.length}
      />

      <UploadResultsModal
        isOpen={uploadFlow.showResults}
        onClose={() => {
          uploadFlow.closeResults()
          uploadFlow.reset()
        }}
        onViewLogs={() => window.open('/reports-and-logs/logs', '_blank')}
        successCount={uploadFlow.uploadResults.success}
        failedCount={uploadFlow.uploadResults.failed}
        showViewLogs={true}
      />
    </>
  )
}
