// components/TopBar.tsx
import React, { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

import { Card } from '@/components/ui/card'
import { ChevronFirst, ChevronLast, Download } from 'lucide-react'

interface TopBarProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  loading: boolean
  selectedRows: string[]
  onPagination: (page: number) => void
  setItemsPerPage: (itemsPerPage: number) => void
  isExportModalOpen: boolean
  onExportModalOpenChange: (open: boolean) => void
  exportModalContent: React.ReactNode
  onSelectAll: (checked: boolean) => void
  currentContentTypeLabel?: string
}

const TopBar: React.FC<TopBarProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  loading,
  selectedRows,
  onPagination,
  // setItemsPerPage,
  isExportModalOpen,
  onExportModalOpenChange,
  exportModalContent,
  onSelectAll,
  currentContentTypeLabel,
}) => {
  const { toast } = useToast()

  // Track previous selection length to detect select all/deselect all actions
  const [prevSelectedCount, setPrevSelectedCount] = useState(selectedRows.length)

  useEffect(() => {
    const currentCount = selectedRows.length

    // Only show toast for select all or deselect all actions
    if (prevSelectedCount !== currentCount) {
      if (currentCount === totalItems && prevSelectedCount < totalItems) {
        // Select all action
        toast({
          title: `All ${totalItems} records selected`,
          description: `You have selected all ${totalItems} ${currentContentTypeLabel?.toLowerCase() || 'records'}.`,
          variant: 'default',
        })
      } else if (currentCount === 0 && prevSelectedCount > 0) {
        // Deselect all action
        toast({
          title: 'All records deselected',
          description: `You have deselected all ${currentContentTypeLabel?.toLowerCase() || 'records'}.`,
          variant: 'default',
        })
      }
      setPrevSelectedCount(currentCount)
    }
  }, [selectedRows.length, totalItems, currentContentTypeLabel, toast, prevSelectedCount])

  // Check if all records are selected
  const allRecordsSelected = selectedRows.length === totalItems

  const handleSelectToggle = () => {
    if (allRecordsSelected) {
      onSelectAll(false) // Unselect all
    } else {
      onSelectAll(true) // Select all
    }
  }
  return (
    <div className="space-y-2">
      <Card className="flex p-2 justify-between items-center gap-2 border-0 shadow-none bg-transparent">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {(currentPage - 1) * itemsPerPage + 1} -{' '}
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
          </p>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPagination(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              <ChevronFirst className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPagination(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
            >
              <ChevronLast className="h-4 w-4" />
            </Button>
          </div>
          {/* <Select value={String(itemsPerPage)} onValueChange={v => setItemsPerPage(Number(v))}>
            <SelectTrigger className="w-auto">
              <SelectValue placeholder="500 / page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="500">500 / page</SelectItem>
            </SelectContent>
          </Select> */}
        </div>
        <div className="flex items-center gap-2">
          {/* Export Button */}
          <Dialog open={isExportModalOpen} onOpenChange={onExportModalOpenChange}>
            {selectedRows.length === 0 ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      disabled={true}
                      variant="outline"
                      size="sm"
                      className="cursor-not-allowed"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Select rows to export</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto custom-scrollbar">
              <DialogHeader>
                <DialogTitle>Export Content</DialogTitle>
                <DialogDescription>
                  Choose your export method and select from all available properties to include.
                  This will export the selected rows from the current page.
                </DialogDescription>
              </DialogHeader>
              {exportModalContent}
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Selection Text */}
      {selectedRows.length > 0 && (
        <div className="text-center !-mt-10 !mb-4">
          <span className="text-sm text-muted-foreground">
            {selectedRows.length} records selected.{' '}
            <button
              onClick={handleSelectToggle}
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              {allRecordsSelected
                ? `Deselect all ${totalItems} ${currentContentTypeLabel || 'records'}`
                : `Select all ${totalItems} ${currentContentTypeLabel || 'records'}`}
            </button>
          </span>
        </div>
      )}
    </div>
  )
}

export default TopBar
