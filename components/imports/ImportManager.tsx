'use client'

import { useImportManager } from '@/hooks/useImportManager' // 👈 Import the new hook
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
import DataTable from '@/components/pages/components/DataTable'

// This small component can stay here as it's only used in this file
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

interface ImportManagerProps {
  contentType?: string
  onImportComplete?: (data: any[]) => void
}

export default function ImportManager({
  contentType = 'pages',
  onImportComplete,
}: ImportManagerProps) {
  // --- 👇 All logic is now handled by the hook! ---
  const {
    activeTab,
    sheets,
    selectedSheet,
    selectedTab,
    sheetData,
    isLoading,
    isSyncing,
    syncProgress,
    importProgress,
    selectedChangedRows,
    currentData,
    hasData,
    hasChanges,
    allChanges,
    flattenedChanges,
    groupedChangesArray,
    fileInputRef,
    setActiveTab,
    handleCsvUpload,
    handleSheetChange,
    handleTabChange,
    detectChanges,
    syncToHubSpot,
    setSelectedChangedRows,
  } = useImportManager({ contentType, onImportComplete })

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
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" /> Import {contentType}
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
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab}>
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
                    {!sheets.length && !isLoading ? (
                      <SelectItem value="no-sheets" disabled>
                        No sheets found. Connect Google Sheets first.
                      </SelectItem>
                    ) : (
                      sheets.map(sheet => (
                        <SelectItem key={sheet.id} value={sheet.id}>
                          {sheet.name}
                        </SelectItem>
                      ))
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
                      ?.tabs?.map(tab => (
                        <SelectItem key={tab.id} value={tab.name}>
                          {tab.name}
                        </SelectItem>
                      )) || (
                      <SelectItem value="no-tabs" disabled>
                        No tabs found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                {hasData && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      {hasChanges && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {groupedChangesArray.length} pages with changes
                          </Badge>
                          <Badge variant="secondary">{allChanges.length} field changes</Badge>
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
                              prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
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
  )
}
