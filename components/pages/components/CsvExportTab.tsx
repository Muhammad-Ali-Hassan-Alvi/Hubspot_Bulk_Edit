'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TabsContent } from '@/components/ui/tabs'
import { DialogFooter } from '@/components/ui/dialog'
import { Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { saveAs } from 'file-saver'
import DynamicExportFieldsSelector from './common/DynamicExportFieldsSelector'
import WarningModal from '@/components/modals/WarningModal'
import type { User } from '@supabase/supabase-js'
import { ContentTypeT } from '@/lib/content-types'
import { saveUserExport } from '@/lib/export-logger'

interface CsvExportTabProps {
  availableColumns: { key: string; label: string }[]
  selectedColumns: string[]
  setSelectedColumns: React.Dispatch<React.SetStateAction<string[]>>
  selectedRows: string[]
  content: any[]
  setIsExportModalOpen: (open: boolean) => void
  contentType?: ContentTypeT
  user?: User
}

export default function CsvExportTab({
  availableColumns,
  selectedColumns,
  setSelectedColumns,
  selectedRows,
  content,
  setIsExportModalOpen,
  contentType,
  user: _user,
}: CsvExportTabProps) {
  const { toast } = useToast()
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      // Only export the selected columns - no automatic inclusion of id
      const columnsForExport = selectedColumns
      const dataToExport = content.filter(p => selectedRows.includes(p.id))
      const processedData = dataToExport.map(item => {
        // Use exportHeaders if available, otherwise fall back to original item
        const sourceData = item.exportHeaders || item

        // Create a mapping object where keys are the column labels (as expected by export service)
        // and values are the actual field values from the source data
        const mappedData: Record<string, any> = {}

        columnsForExport.forEach(key => {
          // Find the corresponding label for this key
          const columnLabel = availableColumns.find(col => col.key === key)?.label || key

          // Try to get the value from source data using multiple possible keys
          let value = ''

          // First try the label directly (most likely case based on your payload)
          if (sourceData[columnLabel] !== undefined) {
            value = sourceData[columnLabel]
          }
          // Then try the key directly
          else if (sourceData[key] !== undefined) {
            value = sourceData[key]
          }
          // Then try camelCase version of the label
          else {
            const camelKey = columnLabel
              .split(' ')
              .map((word, i) =>
                i === 0
                  ? word.toLowerCase()
                  : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              )
              .join('')
            if (sourceData[camelKey] !== undefined) {
              value = sourceData[camelKey]
            }
          }

          // Map using the label as key (this is what export service expects)
          mappedData[columnLabel] = value || ''
        })

        return mappedData
      })

      // Call the CSV export API to save data to database and get CSV content
      const response = await fetch('/api/export/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: processedData,
          columns: columnsForExport.map(
            key => availableColumns.find(col => col.key === key)?.label || key
          ),
          contentType,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Create and download CSV file
        const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' })
        saveAs(blob, result.filename)
        setIsExportModalOpen(false)

        // Save to user_exports table for import validation
        if (_user) {
          await saveUserExport({
            contentType: contentType?.id || 0,
            exportType: 'csv',
            itemsCount: dataToExport.length,
            filename: result.filename,
            // No sheetId/tabId needed for CSV exports
          })
        }

        toast({
          title: 'Export Complete',
          description: `${dataToExport.length} rows exported successfully and saved to database.`,
        })
      } else {
        throw new Error(result.error || 'Failed to export CSV')
      }
    } catch (error) {
      console.error('CSV export error:', error)
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export CSV',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleShowWarning = () => {
    setShowWarningDialog(true)
  }

  const handleCancelExport = () => {
    setShowWarningDialog(false)
  }

  const handleConfirmExport = () => {
    setShowWarningDialog(false)
    handleExportCSV()
  }

  return (
    <TabsContent value="csv" className="space-y-4 pt-4">
      <DynamicExportFieldsSelector
        selectedColumns={selectedColumns}
        setSelectedColumns={setSelectedColumns}
        idPrefix="csv"
        contentType={contentType}
      />
      <DialogFooter>
        <Button
          onClick={handleShowWarning}
          disabled={selectedRows.length === 0 || selectedColumns.length === 0 || isExporting}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : `Export to CSV (${selectedRows.length} rows)`}
        </Button>
      </DialogFooter>

      <WarningModal
        isOpen={showWarningDialog}
        onClose={handleCancelExport}
        onConfirm={handleConfirmExport}
        title="CSV Export Warning"
        description={`Only CSV files exported from this system are supported. Please don't change your CSV file sheet name. The file should be in the format: hubspot_${contentType?.name?.toLowerCase().replace(/\s+/g, '_') || 'content'}_X_items_YYYY-MM-DD.csv`}
        confirmText={isExporting ? 'Exporting...' : 'Confirm Export'}
        cancelText="Cancel"
        isConfirmDisabled={isExporting}
      />
    </TabsContent>
  )
}
