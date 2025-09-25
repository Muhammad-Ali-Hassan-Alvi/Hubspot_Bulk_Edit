'use client'

import { Button } from '@/components/ui/button'
import { TabsContent } from '@/components/ui/tabs'
import { DialogFooter } from '@/components/ui/dialog'
import { Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import DynamicExportFieldsSelector from './common/DynamicExportFieldsSelector'
import { logExportActivity } from '@/lib/audit-logger'
import type { User } from '@supabase/supabase-js'
import { generateUUID } from '@/lib/utils'
import { ContentTypeT } from '@/lib/content-types'
import { saveUserExport } from '@/lib/export-logger'
import { UserExportStatusEnum } from '@/lib/constants'

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
  selectedColumns,
  setSelectedColumns,
  selectedRows,
  content,
  setIsExportModalOpen,
  contentType,
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
    const worksheet = XLSX.utils.json_to_sheet(processedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet)
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const exportId = generateUUID()
    // Generate a more descriptive filename
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const contentTypeLabel = contentType?.name.replace(/-/g, '_').replace(/\s+/g, '_').toLowerCase()
    const filename = `hubspot_${contentTypeLabel}_${dataToExport.length}_items_${date}_${exportId}.xlsx`

    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), filename)
    setIsExportModalOpen(false)

    // Log the export activity
    if (user) {
      // Log to new user_exports table - For record at the time of import content to HubSpot
      await saveUserExport({
        contentType: contentType?.id || 0,
        exportType: 'csv',
        itemsCount: dataToExport.length,
        sheetId: exportId,
        tabId: '0',
        snapshotData: processedData, // Include the actual exported data
        status: UserExportStatusEnum.ACTIVE, // Set status to active for new exports
      })
      // Log to existing audit system - For logs
      await logExportActivity(user.id, 'csv', {
        content_type: contentType?.name,
        items_count: dataToExport.length,
        columns_exported: columnsForExport,
        filename,
        file_size_bytes: excelBuffer.byteLength,
      })
    }

    toast({
      title: 'Export Complete',
      description: `${dataToExport.length} rows exported successfully.`,
    })
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
