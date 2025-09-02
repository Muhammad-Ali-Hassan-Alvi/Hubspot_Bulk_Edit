// components/TopBar.tsx
import React from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  setItemsPerPage,
  isExportModalOpen,
  onExportModalOpenChange,
  exportModalContent,
  onSelectAll,
  currentContentTypeLabel,
}) => {
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
          <Select value={String(itemsPerPage)} onValueChange={v => setItemsPerPage(Number(v))}>
            <SelectTrigger className="w-auto">
              <SelectValue placeholder="500 / page" />
            </SelectTrigger>
            <SelectContent>
              {/* <SelectItem value="100">100 / page</SelectItem> */}
              {/* <SelectItem value="250">250 / page</SelectItem> */}
              <SelectItem value="500">500 / page</SelectItem>
            </SelectContent>
          </Select>
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
              onClick={() => onSelectAll(true)}
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              Select all {totalItems} {currentContentTypeLabel || 'records'}
            </button>
          </span>
        </div>
      )}
    </div>
  )
}

export default TopBar
