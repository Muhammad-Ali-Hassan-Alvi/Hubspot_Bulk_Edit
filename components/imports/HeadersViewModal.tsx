'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Loader2, FileText } from 'lucide-react'
import { ContentTypeT } from '@/lib/content-types'

interface DynamicColumn {
  key: string
  label: string
  category: string
  readOnly: boolean
}

interface HeadersViewModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  contentType?: ContentTypeT
}

export default function HeadersViewModal({
  isOpen,
  onOpenChange,
  contentType,
}: HeadersViewModalProps) {
  const [dynamicColumns, setDynamicColumns] = useState<DynamicColumn[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch export columns from database
  const fetchExportColumns = async (contentType: ContentTypeT) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        contentType: contentType.slug,
      })

      const response = await fetch(`/api/hubspot/headers?${params}`)
      const data = await response.json()

      if (data.success) {
        const columns = data.headers.map((header: any) => ({
          key: header.key,
          label: header.label,
          category: header.category || 'Additional',
          readOnly: header.readOnly || false,
        }))

        setDynamicColumns(columns)
      } else {
        console.error('Failed to fetch export columns:', data.error)
        setDynamicColumns([])
      }
    } catch (error) {
      console.error('Error fetching export columns:', error)
      setDynamicColumns([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch columns when content type changes and modal is open
  useEffect(() => {
    if (contentType && isOpen) {
      fetchExportColumns(contentType)
    }
  }, [contentType, isOpen])

  // Categorize columns by read-only status
  const editableColumns = dynamicColumns
    .filter(col => !col.readOnly)
    .sort((a, b) => a.label.localeCompare(b.label))

  const readOnlyColumns = dynamicColumns
    .filter(col => col.readOnly)
    .sort((a, b) => a.label.localeCompare(b.label))

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Headers for {contentType?.name}
          </DialogTitle>
          <DialogDescription>
            View all available headers for this content type. Read-only fields are marked and won't
            be included in change detection during imports.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading headers...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Editable Fields Section */}
            {editableColumns.length > 0 && (
              <div className="p-4 bg-content rounded-lg border">
                <h5 className="text-base font-semibold text-green-700 mb-3">Editable Fields</h5>
                <p className="text-sm text-muted-foreground mb-4">
                  These fields can be modified and will be included in change detection during
                  imports.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <TooltipProvider>
                    {editableColumns.map(col => (
                      <div key={col.key} className="flex items-center space-x-2">
                        <Checkbox checked={true} disabled={false} />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm font-medium flex items-center gap-1">
                              {col.label}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This field is editable and will be included in imports.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    ))}
                  </TooltipProvider>
                </div>
              </div>
            )}

            {/* Read-Only Fields Section */}
            {readOnlyColumns.length > 0 && (
              <div className="p-4 bg-content rounded-lg border">
                <h5 className="text-base font-semibold text-gray-600 mb-3">Read-Only Fields</h5>
                <p className="text-sm text-muted-foreground mb-4">
                  These fields are read-only and will be excluded from change detection during
                  imports.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <TooltipProvider>
                    {readOnlyColumns.map(col => (
                      <div key={col.key} className="flex items-center space-x-2">
                        <Checkbox checked={true} disabled={true} />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm font-medium text-gray-600 flex items-center gap-1 cursor-help">
                              {col.label}
                              <span className="text-[8px] font-bold px-1 rounded bg-gray-200 text-gray-600">
                                Read-Only
                              </span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This field is read-only and excluded from imports.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    ))}
                  </TooltipProvider>
                </div>
              </div>
            )}

            {/* No fields message */}
            {editableColumns.length === 0 && readOnlyColumns.length === 0 && !loading && (
              <div className="p-4 bg-content rounded-lg border text-center">
                <p className="text-sm text-muted-foreground">
                  No headers configured for this content type.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
