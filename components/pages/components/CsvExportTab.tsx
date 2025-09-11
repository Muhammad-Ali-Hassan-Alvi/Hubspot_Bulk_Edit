'use client'

import { Button } from '@/components/ui/button'
import { TabsContent } from '@/components/ui/tabs'
import { DialogFooter } from '@/components/ui/dialog'
import { Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { saveAs } from 'file-saver'
import ExportFieldsSelector from './common/ExportFieldsSelector'
import { logExportActivity } from '@/lib/audit-logger'
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
  user,
}: CsvExportTabProps) {
  const { toast } = useToast()

  const handleExportCSV = async () => {
    // Only export the selected columns - no automatic inclusion of id
    const columnsForExport = selectedColumns
    const dataToExport = content.filter(p => selectedRows.includes(p.id))
    const processedData = dataToExport.map(item => {
      // Use exportHeaders if available, otherwise fall back to original item
      const sourceData = item.exportHeaders || item
      return Object.fromEntries(columnsForExport.map(key => [key, sourceData[key] || '']))
    })

    // Generate actual CSV content
    const csvContent = generateCSVContent(processedData, columnsForExport)

    // Generate a more descriptive filename
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const contentTypeLabel = contentType.replace(/-/g, '_').replace(/\s+/g, '_').toLowerCase()
    const filename = `hubspot_${contentTypeLabel}_${dataToExport.length}_items_${date}.csv`

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, filename)
    setIsExportModalOpen(false)

    // Log the export activity
    if (user) {
      await logExportActivity(user.id, 'csv', {
        content_type: contentType,
        items_count: dataToExport.length,
        columns_exported: columnsForExport,
        filename,
        file_size_bytes: blob.size,
      })
    }

    toast({
      title: 'Export Complete',
      description: `${dataToExport.length} rows exported successfully.`,
    })
  }

  // Helper function to generate CSV content
  const generateCSVContent = (data: any[], headers: string[]): string => {
    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCSVValue = (value: any): string => {
      if (value === null || value === undefined) return ''
      const stringValue = String(value)
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }

    // Create CSV header row
    const headerRow = headers.map(escapeCSVValue).join(',')
    
    // Create CSV data rows
    const dataRows = data.map(row => 
      headers.map(header => escapeCSVValue(row[header])).join(',')
    )
    
    // Combine header and data rows
    return [headerRow, ...dataRows].join('\n')
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
