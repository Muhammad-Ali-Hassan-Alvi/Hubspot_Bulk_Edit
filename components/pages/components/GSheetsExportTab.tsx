'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TabsContent } from '@/components/ui/tabs'
import { DialogFooter } from '@/components/ui/dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileSpreadsheet, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import ExportFieldsSelector from './common/ExportFieldsSelector'
import type { User } from '@supabase/supabase-js'
import SelectSheetAndTab from '@/components/shared/GoogleSheetsConnection/components/SelectSheetAndTab'
import { logExportActivityAction } from '@/app/actions/exportActions'

interface GSheetsExportTabProps {
  availableColumns: { key: string; label: string }[]
  selectedColumns: string[]
  setSelectedColumns: React.Dispatch<React.SetStateAction<string[]>>
  selectedRows: string[]
  content: any[]
  user: User
  userSettings: any
  contentType?: string
}

interface TabT {
  id: string
  name: string
}

export default function GSheetsExportTab({
  availableColumns,
  selectedColumns,
  setSelectedColumns,
  selectedRows,
  content,
  user,
  userSettings,
  contentType = 'Landing Page',
}: GSheetsExportTabProps) {
  const [loading, setLoading] = useState(false)
  const [selectedSheetId, setSelectedSheetId] = useState<string>('')
  const [_selectedTabId, setSelectedTabId] = useState<string>('')
  const [tabName, setTabName] = useState('')
  const [exportSuccessUrl, setExportSuccessUrl] = useState('')
  const [exportingToSheets, setExportingToSheets] = useState(false)
  const [selectedSheetName, setSelectedSheetName] = useState<string>('')
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  const { toast } = useToast()

  const performExportToSheets = async () => {
    setLoading(true)

    try {
      const dataToExport = content.filter(p => selectedRows.includes(p.id))
      // Only export the selected columns - no automatic inclusion of id
      const columnsForExport = selectedColumns
      const processedData = dataToExport.map(item => {
        // Use exportHeaders if available, otherwise fall back to original item
        const sourceData = item.exportHeaders || item
        return Object.fromEntries(columnsForExport.map(key => [key, sourceData[key]]))
      })

      const requestBody: any = {
        sheetId: selectedSheetId,
        data: processedData,
        columns: columnsForExport.map(
          key => availableColumns.find(col => col.key === key)?.label || key
        ),
      }

      if (tabName?.trim()) {
        requestBody.tabName = tabName.trim()
      }

      const response = await fetch('/api/google/sheets/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const result = await response.json()
      if (result.success) {
        toast({
          title: 'Export Successful',
          description: `Data exported to Google Sheets successfully.`,
        })
        setExportSuccessUrl(result.url)

        const logResult = await logExportActivityAction('sheets', {
          content_type: contentType,
          items_count: dataToExport.length,
          columns_exported: [], // 👈 pass empty array so columns_exported is skipped
          tab_name: tabName?.trim() || 'Default',
          sheet_url: `https://docs.google.com/spreadsheets/d/${selectedSheetId}/edit#gid=0`,
          sheet_name: `[${selectedSheetName}](${`https://docs.google.com/spreadsheets/d/${selectedSheetId}/edit#gid=0`})`, // markdown clickable
        })
        
        if (!logResult.success) {
          console.error('Failed to log export activity:', logResult.error)
        }
        // Reset sheet and tab selection after successful export
        setSelectedSheetId('')
        setSelectedTabId('')
        setTabName('')
        setSelectedSheetName('')
        setExportingToSheets(false)
      } else {
        toast({
          title: 'Export Failed',
          description: result.error || 'Failed to export to Google Sheets.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export Failed',
        description: 'An error occurred while exporting to Google Sheets.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExportToSheets = () => {
    setShowWarningDialog(true)
  }

  const handleConfirmExport = () => {
    setShowWarningDialog(false)
    performExportToSheets()
  }

  const handleCancelExport = () => {
    setShowWarningDialog(false)
  }

  const handleTabNameChange = (name: string) => {
    setTabName(name)
  }

  const handleTabSelectionChange = (tab: TabT) => {
    setSelectedTabId(tab.id)
    setTabName(tab.name)
  }

  const handleSheetSelection = async (sheetId: string) => {
    setSelectedSheetId(sheetId)
    // Get sheet name from the sheets list
    if (sheetId) {
      try {
        // Fetch the sheet name from the API
        const response = await fetch('/api/google/sheets')
        const data = await response.json()
        if (data.success && data.sheets) {
          const selectedSheet = data.sheets.find((sheet: any) => sheet.id === sheetId)
          if (selectedSheet) {
            setSelectedSheetName(selectedSheet.name)
          } else {
            setSelectedSheetName('Selected Sheet')
          }
        } else {
          setSelectedSheetName('Selected Sheet')
        }
      } catch (error) {
        console.error('Error fetching sheet name:', error)
        setSelectedSheetName('Selected Sheet')
      }
    } else {
      setSelectedSheetName('')
    }
  }

  const getSheetUrl = () => {
    if (selectedSheetId) {
      return `https://docs.google.com/spreadsheets/d/${selectedSheetId}`
    }
    return ''
  }

  return (
    <TabsContent value="sheets" className="space-y-4 pt-4">
      <ExportFieldsSelector
        availableColumns={availableColumns}
        selectedColumns={selectedColumns}
        setSelectedColumns={setSelectedColumns}
        idPrefix="sheets"
        contentType={contentType}
      />
      <div className="space-y-4">
        <SelectSheetAndTab
          user={user}
          userSettings={userSettings}
          selectedSheetId={selectedSheetId}
          setSelectedSheetId={handleSheetSelection}
          onTabNameChange={handleTabNameChange}
          onTabSelectionChange={handleTabSelectionChange}
          setExportingToSheets={setExportingToSheets}
        />

        {/* Show sheet link when a sheet is selected */}
        {selectedSheetId && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">View Sheet:</span>
            <Button
              variant="link"
              size="sm"
              onClick={() => window.open(getSheetUrl(), '_blank')}
              className="p-0 h-auto text-blue-800 hover:text-blue-900"
            >
              {selectedSheetName}
            </Button>
            <ExternalLink className="h-3 w-3 text-blue-600" />
          </div>
        )}

        {exportSuccessUrl && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <ExternalLink className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800">Export completed successfully!</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(exportSuccessUrl, '_blank')}
              className="ml-auto"
            >
              View Exported Data
            </Button>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          onClick={handleExportToSheets}
          disabled={
            selectedRows.length === 0 ||
            selectedColumns.length === 0 ||
            !exportingToSheets ||
            loading
          }
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 mr-2" />
          )}
          Export to Google Sheets ({selectedRows.length} rows)
        </Button>
      </DialogFooter>

      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Warning
            </DialogTitle>
            <DialogDescription>
              Exporting data to Google Sheets will overwrite the existing data in the selected tab.
              This action cannot be undone. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelExport}>
              Cancel
            </Button>
            <Button onClick={handleConfirmExport}>Confirm Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  )
}
