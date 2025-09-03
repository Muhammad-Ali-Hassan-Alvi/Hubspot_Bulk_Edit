'use client'

import { useState, useCallback, useEffect, forwardRef, useRef, useMemo } from 'react' // BRO: Added useMemo
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ArrowUpDown, Move, ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ... (interfaces and helper functions remain the same)

interface HubSpotContent {
  id: string
  name: string
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
  loadingMore?: boolean
  hasMore?: boolean
  currentContentTypeLabel: string
  onSelectAll: (checked: boolean) => void
  onSelectRow: (id: string) => void
  onLoadMore?: () => void
  onPagination?: (page: number) => void
  onRecordUpdate?: (recordId: string, field: string, value: any) => void
  dropdownOptions?: { [key: string]: string[] }
  editableTextFields?: Set<string>
  onColumnReorder?: (newOrder: string[]) => void
  topBar?: boolean
  isExportModalOpen?: boolean
  onExportModalOpenChange?: (open: boolean) => void
  exportModalContent?: React.ReactNode
  setItemsPerPage?: (itemsPerPage: number) => void
  showPagination?: boolean
}

const formatColumnLabel = (key: string) => {
  const result = key.replace(/([A-Z])/g, ' $1')
  return result.charAt(0).toUpperCase() + result.slice(1)
}

const renderCellContent = (item: HubSpotContent, columnKey: string) => {
  const sourceData = item.exportHeaders || item
  const value = sourceData[columnKey]

  if (value === null || typeof value === 'undefined' || value === '') {
    return <span className="text-muted-foreground">N/A</span>
  }
  if (['updatedAt', 'createdAt', 'publishDate'].includes(columnKey)) {
    return new Date(value).toLocaleDateString()
  }
  if (columnKey === 'state') {
    return (
      <Badge
        className="bg-primary text-primary-foreground hover:bg-muted hover:text-primary"
        variant={value === 'PUBLISHED' ? 'default' : 'secondary'}
      >
        {value}
      </Badge>
    )
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return (
      <span
        className="text-muted-foreground text-xs cursor-help"
        title={JSON.stringify(value, null, 2)}
      >
        [Complex Value]
      </span>
    )
  }

  return String(value)
}

const DataTable = forwardRef<HTMLDivElement, DataTableProps>(
  (
    {
      filteredContent,
      displayColumns,
      selectedRows,
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      loading,
      loadingMore = false,
      hasMore = false,
      currentContentTypeLabel,
      onSelectAll,
      onSelectRow,
      onLoadMore,
      onPagination,
      onRecordUpdate,
      dropdownOptions = {},
      editableTextFields = new Set(),
      onColumnReorder,
      showPagination = false,
    },
    ref
  ) => {
    // ... (sorting, resizing, dragging state remains the same)
    const [sortConfig, setSortConfig] = useState<{
      key: string | null
      direction: 'asc' | 'desc'
    }>({ key: null, direction: 'asc' })
    const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({})
    const [isResizing, setIsResizing] = useState<string | null>(null)
    const [dragStartX, setDragStartX] = useState(0)
    const [dragStartWidth, setDragStartWidth] = useState(0)
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

    const observerRef = useRef<IntersectionObserver | null>(null)
    const loadingRef = useRef<HTMLDivElement>(null)

    // BRO: Renamed bottomScrollRef to tableContainerRef for clarity
    const topScrollRef = useRef<HTMLDivElement>(null)
    const tableContainerRef = useRef<HTMLDivElement>(null)

    // BRO: Using a single ref to prevent scroll event loops.
    // This is more robust than using two separate boolean refs.
    const isSyncingScroll = useRef(false)

    // ... (sorting function remains the same)
    const sortedContent = useCallback(() => {
      if (!sortConfig.key) return filteredContent

      return [...filteredContent].sort((a, b) => {
        const aValue = a.exportHeaders?.[sortConfig.key!] || a[sortConfig.key!]
        const bValue = b.exportHeaders?.[sortConfig.key!] || b[sortConfig.key!]

        if (aValue === bValue) return 0
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        const comparison = String(aValue).localeCompare(String(bValue))
        return sortConfig.direction === 'asc' ? comparison : -comparison
      })
    }, [filteredContent, sortConfig])

    // ... (handleSort, handleResizeStart, handleDrag events remain the same)
    const handleSort = (key: string) => {
      setSortConfig(prev => ({
        key,
        direction: (prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc') as
          | 'asc'
          | 'desc',
      }))
    }
    const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(columnKey)
      setDragStartX(e.clientX)
      setDragStartWidth(columnWidths[columnKey] || 200) // Default width of 200px
    }
    const handleResizeMove = useCallback(
      (e: MouseEvent) => {
        if (!isResizing) return

        const deltaX = e.clientX - dragStartX
        const newWidth = Math.max(80, Math.min(500, dragStartWidth + deltaX)) // Min 80px, Max 500px

        setColumnWidths(prev => ({
          ...prev,
          [isResizing]: newWidth,
        }))
      },
      [isResizing, dragStartX, dragStartWidth]
    )
    const handleResizeEnd = useCallback(() => {
      if (isResizing) {
        setIsResizing(null)
        localStorage.setItem('contentManagerColumnWidths', JSON.stringify(columnWidths))
      }
    }, [isResizing, columnWidths])
    const resetColumnWidths = () => {
      const defaultWidths: { [key: string]: number } = {}
      displayColumns.forEach(column => {
        defaultWidths[column] = 200 // Default width
      })
      setColumnWidths(defaultWidths)
      localStorage.removeItem('contentManagerColumnWidths')
    }
    const handleDragStart = (e: React.DragEvent, columnKey: string) => {
      setDraggedColumn(columnKey)
      e.dataTransfer.effectAllowed = 'move'
    }
    const handleDragOver = (e: React.DragEvent, columnKey: string) => {
      e.preventDefault()
      if (draggedColumn && draggedColumn !== columnKey) {
        setDragOverColumn(columnKey)
      }
    }
    const handleDrop = (e: React.DragEvent, columnKey: string) => {
      e.preventDefault()
      if (draggedColumn && draggedColumn !== columnKey && onColumnReorder) {
        const newOrder = [...displayColumns]
        const draggedIndex = newOrder.indexOf(draggedColumn)
        const dropIndex = newOrder.indexOf(columnKey)

        newOrder.splice(draggedIndex, 1)
        newOrder.splice(dropIndex, 0, draggedColumn)

        onColumnReorder(newOrder)
      }
      setDraggedColumn(null)
      setDragOverColumn(null)
    }

    // BRO: Updated scroll synchronization logic
    const handleScroll = (source: 'top' | 'bottom') => {
      if (isSyncingScroll.current) return

      isSyncingScroll.current = true

      const top = topScrollRef.current
      const bottom = tableContainerRef.current

      if (top && bottom) {
        if (source === 'top') {
          bottom.scrollLeft = top.scrollLeft
        } else {
          top.scrollLeft = bottom.scrollLeft
        }
      }

      // Use requestAnimationFrame to reset the lock after the browser has painted the change
      requestAnimationFrame(() => {
        isSyncingScroll.current = false
      })
    }

    // ... (useEffect for infinite scroll remains the same)
    useEffect(() => {
      if (onLoadMore && hasMore) {
        const observer = new IntersectionObserver(
          entries => {
            const [entry] = entries
            if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
              onLoadMore()
            }
          },
          {
            rootMargin: '100px',
            threshold: 0.1,
          }
        )

        if (loadingRef.current) {
          observer.observe(loadingRef.current)
        }

        observerRef.current = observer

        return () => {
          if (observerRef.current) {
            observerRef.current.disconnect()
          }
        }
      }
    }, [hasMore, loadingMore, loading, onLoadMore])

    // ... (useEffect for resizing remains the same)
    useEffect(() => {
      if (isResizing) {
        document.addEventListener('mousemove', handleResizeMove)
        document.addEventListener('mouseup', handleResizeEnd)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'

        return () => {
          document.removeEventListener('mousemove', handleResizeMove)
          document.removeEventListener('mouseup', handleResizeEnd)
          document.body.style.cursor = ''
          document.body.style.userSelect = ''
        }
      }
    }, [isResizing, handleResizeMove, handleResizeEnd])

    const getColumnWidth = useCallback(
      (columnKey: string) => {
        return columnWidths[columnKey] || 200
      },
      [columnWidths]
    )

    // ... (useEffect for initializing column widths remains the same)
    useEffect(() => {
      if (displayColumns.length > 0) {
        const savedWidths = localStorage.getItem('contentManagerColumnWidths')
        const initialWidths: { [key: string]: number } = {}

        if (savedWidths) {
          try {
            const parsedWidths = JSON.parse(savedWidths)
            displayColumns.forEach(column => {
              initialWidths[column] = parsedWidths[column] || 250
            })
          } catch (error) {
            console.warn('Failed to parse saved column widths, using defaults.', error)
            displayColumns.forEach(column => {
              initialWidths[column] = 250
            })
          }
        } else {
          displayColumns.forEach(column => {
            initialWidths[column] = 250
          })
        }
        setColumnWidths(initialWidths)
      }
    }, [displayColumns])

    // BRO: Calculate the total width of the table dynamically.
    // This is crucial for making the top scrollbar's width match the table's width.
    const CHECKBOX_COLUMN_WIDTH = 48 // Corresponds to `w-12` in Tailwind
    const tableWidth = useMemo(() => {
      const columnsTotalWidth = displayColumns.reduce(
        (total, key) => total + getColumnWidth(key),
        0
      )
      return columnsTotalWidth + CHECKBOX_COLUMN_WIDTH
    }, [displayColumns, getColumnWidth])

    return (
      <div
        ref={ref}
        className={cn(
          'transition-all duration-300 ease-in-out',
          loading ? 'opacity-50' : 'opacity-100',
          isResizing && 'cursor-col-resize'
        )}
      >
        {filteredContent.length > 0 ? (
          <div className="space-y-4 w-full">
            <div className="border rounded-lg w-full overflow-hidden">
              {/* BRO: This is your new top scrollbar. */}
              <div
                ref={topScrollRef}
                onScroll={() => handleScroll('top')}
                className="overflow-x-auto overflow-y-hidden"
              >
                {/* This inner div has the same width as the table, creating the scroll space. */}
                <div style={{ width: tableWidth, height: '1px' }}></div>
              </div>

              {/* BRO: This is now the main table container. I've added the ref, scroll handler,
                  and combined overflow properties here for better control. */}
              <div
                ref={tableContainerRef}
                onScroll={() => handleScroll('bottom')}
                className="max-h-[600px] overflow-auto" // overflow-auto handles both x and y
              >
                <table
                  className="text-sm text-left table-fixed relative"
                  // BRO: Set the minWidth of the table to ensure it expands and causes overflow
                  style={{ minWidth: tableWidth }}
                >
                  <thead className="border-b sticky top-0 bg-background z-30">
                    <tr>
                      <th className="px-4 py-3 sticky left-0 bg-background z-50 w-12">
                        <Checkbox
                          checked={
                            filteredContent.length > 0 &&
                            selectedRows.length === filteredContent.length
                          }
                          onCheckedChange={onSelectAll}
                        />
                      </th>
                      {displayColumns.map(key => (
                        <th
                          key={key}
                          draggable
                          onDragStart={e => handleDragStart(e, key)}
                          onDragOver={e => handleDragOver(e, key)}
                          onDrop={e => handleDrop(e, key)}
                          className={cn(
                            'px-4 py-3 font-medium whitespace-nowrap relative cursor-pointer select-none transition-all group',
                            key === 'name'
                              ? 'sticky left-12 bg-background z-50 shadow-[2px_0_4px_rgba(0,0,0,0.1)]'
                              : 'z-20',
                            draggedColumn === key && 'opacity-50 bg-muted/50',
                            dragOverColumn === key && 'border-l-4 border-primary bg-muted/50'
                          )}
                          style={{ width: getColumnWidth(key) }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Move className="h-3 w-3 text-muted-foreground cursor-grab shrink-0" />
                              <span
                                onClick={() => handleSort(key)}
                                className="flex items-center gap-1 cursor-pointer hover:text-primary truncate"
                                title={formatColumnLabel(key)}
                              >
                                {formatColumnLabel(key)}
                                {sortConfig.key === key ? (
                                  sortConfig.direction === 'asc' ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                )}
                              </span>
                            </div>
                          </div>
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            className={cn(
                              'absolute right-0 top-0 h-full w-px cursor-col-resize select-none touch-none bg-border transition-colors group-hover:bg-primary',
                              isResizing === key && 'bg-primary'
                            )}
                            onMouseDown={e => handleResizeStart(e, key)}
                          >
                            <div className="absolute -right-1 top-0 h-full w-2" />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedContent().map(item => (
                      <tr
                        key={item.id}
                        className={cn(
                          'group',
                          selectedRows.includes(item.id) ? 'bg-muted/50' : 'hover:bg-muted/50'
                        )}
                      >
                        <td className="px-4 py-2 sticky left-0 z-40 bg-background group-hover:bg-muted/50 w-12">
                          <Checkbox
                            checked={selectedRows.includes(item.id)}
                            onCheckedChange={() => onSelectRow(item.id)}
                          />
                        </td>
                        {displayColumns.map(key => (
                          <td
                            key={key}
                            className={cn(
                              'px-4 py-2 truncate relative',
                              key === 'name'
                                ? 'sticky left-12 z-40 bg-background font-semibold shadow-[2px_0_4px_rgba(0,0,0,0.1)] group-hover:bg-muted/50'
                                : 'z-10'
                            )}
                            style={{ width: getColumnWidth(key) }}
                            title={String(item.exportHeaders?.[key] || item[key] || '')}
                          >
                            {onRecordUpdate && dropdownOptions[key] ? (
                              <Select
                                value={String(
                                  item.allHeaders?.[key] || item.exportHeaders?.[key] || ''
                                )}
                                onValueChange={newValue => onRecordUpdate(item.id, key, newValue)}
                              >
                                <SelectTrigger className="w-full">
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
                            ) : onRecordUpdate && editableTextFields.has(key) ? (
                              <Input
                                value={String(
                                  item.allHeaders?.[key] || item.exportHeaders?.[key] || ''
                                )}
                                onChange={e => onRecordUpdate(item.id, key, e.target.value)}
                                className="w-full"
                              />
                            ) : (
                              renderCellContent(item, key)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {loadingMore && (
                      <tr>
                        <td colSpan={displayColumns.length + 1} className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">
                              Loading more records...
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {hasMore && <div ref={loadingRef} className="h-4 w-full" />}
              </div>
            </div>
            {/* ... (pagination and footer controls remain the same) ... */}
            <div className="flex justify-between items-center gap-2 mt-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {showPagination
                    ? `Showing ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} items`
                    : `Showing ${filteredContent.length} of ${totalItems} items`}
                </p>
                <Button variant="outline" size="sm" onClick={resetColumnWidths} className="text-xs">
                  Reset Column Widths
                </Button>
              </div>
              {showPagination ? (
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPagination?.(currentPage - 1)}
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
                      onClick={() => onPagination?.(currentPage + 1)}
                      disabled={currentPage >= totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                  {/* <div className="text-sm text-muted-foreground">
                    All records loaded for this page
                  </div> */}
                </div>
              ) : (
                <></>
              )}
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
)

DataTable.displayName = 'DataTable'

export default DataTable
