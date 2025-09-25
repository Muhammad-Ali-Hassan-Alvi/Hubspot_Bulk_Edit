'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'
import { DateDisplay } from '@/components/shared/DateDisplay'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface HubSpotContent {
  id: string
  name: string
  allHeaders: { [key: string]: any }
  [key: string]: any
}

interface DataTableProps {
  filteredContent: HubSpotContent[]
  displayColumns: string[]
  selectedRows: string[]
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  loading: boolean
  currentContentTypeLabel: string
  onSelectAll: (checked: boolean) => void
  onSelectRow: (id: string) => void
  onPagination: (page: number) => void
  onRecordUpdate: (recordId: string, field: string, value: any) => void
  dropdownOptions: { [key: string]: string[] }
  editableTextFields: Set<string>
}

const formatColumnLabel = (key: string) => {
  const result = key.replace(/([A-Z])/g, ' $1')
  return result.charAt(0).toUpperCase() + result.slice(1)
}

const renderCellContent = (dataObject: { [key: string]: any }, columnKey: string) => {
  const value = dataObject[columnKey]

  if (value === null || typeof value === 'undefined' || value === '') {
    return <span className="text-muted-foreground">N/A</span>
  }
  if (['updatedAt', 'createdAt', 'publishDate'].includes(columnKey)) {
    return <DateDisplay date={value} format="short" />
  }
  if (columnKey === 'state') {
    return (
      <Badge
        className="bg-primary text-primary-foreground hover:bg-muted hover:text-primary"
        variant={value === 'PUBLISHED' ? 'default' : 'secondary'}
      >
        {String(value)}
      </Badge>
    )
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return (
      <span className="text-muted-foreground text-xs" title={JSON.stringify(value, null, 2)}>
        [Complex Value]
      </span>
    )
  }
  return String(value)
}

export default function DataTable({
  filteredContent,
  displayColumns,
  selectedRows,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  loading,
  currentContentTypeLabel,
  onSelectAll,
  onSelectRow,
  onPagination,
  onRecordUpdate,
  dropdownOptions = {},
  editableTextFields = new Set(),
}: DataTableProps) {
  return (
    <div
      className={cn(
        'transition-all duration-300 ease-in-out',
        loading ? 'opacity-50' : 'opacity-100'
      )}
    >
      {filteredContent.length > 0 ? (
        <div className="space-y-4 w-full">
          <div className="overflow-x-auto bg-background border rounded-lg w-full">
            <table className="w-full text-sm text-left">
              <thead className="border-b ">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-background z-30">
                    <Checkbox
                      checked={
                        filteredContent.length > 0 && selectedRows.length === filteredContent.length
                      }
                      onCheckedChange={onSelectAll}
                    />
                  </th>
                  {displayColumns.map(key => (
                    <th
                      key={key}
                      className={cn(
                        'px-4 py-3 font-medium whitespace-nowrap',
                        key === 'name' &&
                          'sticky left-12 bg-background z-20 shadow-[2px_0_4px_rgba(0,0,0,0.1)]'
                      )}
                    >
                      {formatColumnLabel(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredContent.map(item => (
                  <tr
                    key={item.id}
                    className={cn(
                      'group',
                      selectedRows.includes(item.id) ? 'bg-muted/50' : 'hover:bg-muted/50'
                    )}
                  >
                    <td className="px-4 py-2 sticky left-0 z-10 bg-background group-hover:bg-muted/50">
                      <Checkbox
                        checked={selectedRows.includes(item.id)}
                        onCheckedChange={() => onSelectRow(item.id)}
                      />
                    </td>
                    {displayColumns.map(key => (
                      <td
                        key={`${item.id}-${key}`}
                        className={cn(
                          'px-4 py-2 whitespace-nowrap',
                          key === 'name' &&
                            'sticky left-12 bg-background font-semibold shadow-[2px_0_4px_rgba(0,0,0,0.1)] group-hover:bg-muted/50 z-10'
                        )}
                      >
                        {dropdownOptions[key] ? (
                          <Select
                            value={String(item.allHeaders[key] || '')}
                            onValueChange={newValue => onRecordUpdate(item.id, key, newValue)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder={`Select ${key}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {dropdownOptions[key].map(option => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : editableTextFields.has(key) ? (
                          <Input
                            value={String(item.allHeaders[key] || '')}
                            onChange={e => onRecordUpdate(item.id, key, e.target.value)}
                            className="min-w-[200px]"
                          />
                        ) : (
                          renderCellContent(item.allHeaders, key)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center gap-2 mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPagination(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPagination(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Content Found</h3>
            <p className="text-muted-foreground mb-4">
              No {currentContentTypeLabel.toLowerCase()} found. Try changing the content type or
              filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
