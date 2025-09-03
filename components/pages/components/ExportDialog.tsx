import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, FileSpreadsheet } from 'lucide-react'
import CsvExportTab from './CsvExportTab'
import GSheetsExportTab from './GSheetsExportTab'
import type { User } from '@supabase/supabase-js'

interface ExportDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  availableColumns: { key: string; label: string }[]
  selectedColumns: string[]
  setSelectedColumns: React.Dispatch<React.SetStateAction<string[]>>
  selectedRows: string[]
  content: any[]
  user: User
  userSettings: any
  setIsExportModalOpen: (open: boolean) => void
  contentType?: string
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onOpenChange,
  availableColumns,
  selectedColumns,
  setSelectedColumns,
  selectedRows,
  content,
  user,
  userSettings,
  setIsExportModalOpen,
  contentType = 'Landing Page',
}) => {
  const [currentTab, setCurrentTab] = useState('csv')

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={selectedRows.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>Export {contentType}</DialogTitle>
          <DialogDescription>
            Choose your export method and select from all available properties to include. This will
            export the selected rows from the current page.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Export as CSV
            </TabsTrigger>
            <TabsTrigger value="sheets" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Export to Google Sheets
            </TabsTrigger>
          </TabsList>
          <CsvExportTab
            availableColumns={availableColumns}
            selectedColumns={selectedColumns}
            setSelectedColumns={setSelectedColumns}
            selectedRows={selectedRows}
            content={content}
            setIsExportModalOpen={setIsExportModalOpen}
            contentType={contentType}
            user={user}
          />
          <GSheetsExportTab
            key={currentTab}
            availableColumns={availableColumns}
            selectedColumns={selectedColumns}
            setSelectedColumns={setSelectedColumns}
            selectedRows={selectedRows}
            content={content}
            user={user}
            userSettings={userSettings}
            contentType={contentType}
          />
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
