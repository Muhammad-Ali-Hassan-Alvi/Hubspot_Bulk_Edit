'use client'

import { Button } from '@/components/ui/button'
import { TabsContent } from '@/components/ui/tabs'
import { DialogFooter } from '@/components/ui/dialog'
import { Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { saveAs } from 'file-saver'
import ExportFieldsSelector from './common/ExportFieldsSelector'
import type { User } from '@supabase/supabase-js'

interface CsvExportTabProps {
  availableColumns: { key: string; label: string }[]
  selectedColumns: string[]
  setSelectedColumns: React.Dispatch<React.SetStateAction<string[]>>
  selectedRows: string[]
  content: any[]
  setIsExportModalOpen: (open: boolean) => void
  contentType?: string
  user?: User
}

export default function CsvExportTab({
  availableColumns,
  selectedColumns,
  setSelectedColumns,
  selectedRows,
  content,
  setIsExportModalOpen,
  contentType = 'Landing Page',
  user: _user,
}: CsvExportTabProps) {
  const { toast } = useToast()

  const handleExportCSV = async () => {
    try {
      // Only export the selected columns - no automatic inclusion of id
      const columnsForExport = selectedColumns
      const dataToExport = content.filter(p => selectedRows.includes(p.id))
      const processedData = dataToExport.map(item => {
        // Use exportHeaders if available, otherwise fall back to original item
        const sourceData = item.exportHeaders || item
        return Object.fromEntries(columnsForExport.map(key => [key, sourceData[key] || '']))
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
    }
  }

  return (
    <TabsContent value="csv" className="space-y-4 pt-4">
      <ExportFieldsSelector
        availableColumns={availableColumns}
        selectedColumns={selectedColumns}
        setSelectedColumns={setSelectedColumns}
        idPrefix="csv"
        contentType={contentType}
      />
      <DialogFooter>
        <Button
          onClick={handleExportCSV}
          disabled={selectedRows.length === 0 || selectedColumns.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export to CSV ({selectedRows.length} rows)
        </Button>
      </DialogFooter>
    </TabsContent>
  )
}
