'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface HeaderConfig {
  id?: number
  header: string
  displayName?: string
  headerType: string
  category: string
  filters: boolean
  read_only: boolean
  in_app_edit: boolean
  lastUpdated: string | null
  updatedBy?: number
  contentTypes: {
    'site-pages': boolean
    'landing-pages': boolean
    'blog-posts': boolean
    blogs: boolean
    tags: boolean
    authors: boolean
    'url-redirects': boolean
    'hubdb-tables': boolean
  }
  [key: string]: any
}

type SortDirection = 'asc' | 'desc' | null

interface SortConfig {
  key: string
  direction: SortDirection
}

interface ConfigurationsProps {
  data: HeaderConfig[]
  filteredData: HeaderConfig[]
  isUpdating: boolean
  isSaving: boolean
  isRefreshing?: boolean
  updateField: (index: number, field: string, value: any) => void
  removeRow: (index: number) => void
  sortConfig: SortConfig
  onSort: (key: string) => void
}

const Configurations = ({
  data,
  filteredData,
  isUpdating,
  isSaving,
  isRefreshing = false,
  updateField,
  removeRow,
  sortConfig,
  onSort,
}: ConfigurationsProps) => {
  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }

    switch (sortConfig.direction) {
      case 'asc':
        return <ArrowUp className="h-4 w-4 text-blue-600" />
      case 'desc':
        return <ArrowDown className="h-4 w-4 text-blue-600" />
      default:
        return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }
  }

  const renderSortableHeader = (title: string, sortKey: string) => (
    <TableHead className="px-4 bg-background">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center hover:text-blue-600 transition-colors font-medium py-2 whitespace-nowrap w-full"
      >
        <span className="mr-2">{title}</span>
        {getSortIcon(sortKey)}
      </button>
    </TableHead>
  )

  const renderCell = (
    row: any,
    field: string,
    index: number,
    type: string,
    contentTypeKey?: string
  ) => {
    switch (type) {
      case 'string':
        return (
          <Input
            value={row[field] || ''}
            onChange={e => updateField(index, field, e.target.value)}
            className="w-48"
          />
        )
      case 'date-time':
        return (
          <Input
            type="datetime-local"
            value={row[field] || ''}
            onChange={e => updateField(index, field, e.target.value)}
            className="w-56"
          />
        )
      case 'number':
        return (
          <Input
            type="number"
            value={row[field] || ''}
            onChange={e => updateField(index, field, Number(e.target.value))}
            className="w-32"
          />
        )
      case 'boolean':
        return (
          <Checkbox
            checked={!!row[field]}
            onCheckedChange={checked => updateField(index, field, checked)}
          />
        )
      case 'contentType':
        return (
          <Checkbox
            disabled={true}
            checked={!!(row[field] && row[field][contentTypeKey!])}
            onCheckedChange={checked => {
              const newData = [...data]
              newData[index] = {
                ...newData[index],
                [field]: {
                  ...newData[index][field],
                  [contentTypeKey!]: checked,
                },
              }
              updateField(index, field, newData[index][field])
            }}
          />
        )
      case 'array':
        return (
          <Input
            placeholder="Comma separated"
            value={Array.isArray(row[field]) ? row[field].join(', ') : ''}
            onChange={e =>
              updateField(
                index,
                field,
                e.target.value.split(',').map(v => v.trim())
              )
            }
            className="w-56"
          />
        )
      case 'object':
        return (
          <Input
            value={row[field] ? JSON.stringify(row[field], null, 2) : ''}
            onChange={e => {
              try {
                updateField(index, field, JSON.parse(e.target.value))
              } catch {
                updateField(index, field, e.target.value) // fallback
              }
            }}
            className="w-64"
          />
        )
      default:
        return (
          <Input
            value={row[field] || ''}
            onChange={e => updateField(index, field, e.target.value)}
            className="w-48"
          />
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Informational Note */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="text-blue-600 mt-0.5">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-blue-800 font-medium">Important Note</p>
            <p className="text-sm text-blue-700">
              Header configurations (category, filters, read-only, in-app edit) are only saved when
              at least one content type is selected. Make sure to enable the header for the desired
              content types before configuring its settings.
            </p>
          </div>
        </div>
      </div>

      <div className="relative border rounded-lg">
        {(isUpdating || isSaving || isRefreshing) && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isSaving ? 'Saving...' : isRefreshing ? 'Refreshing...' : 'Updating...'}
            </div>
          </div>
        )}
        <Table>
          <TableHeader className=" bg-background">
            <TableRow className="border-b">
              {renderSortableHeader('Header', 'header')}
              {renderSortableHeader('Display Name', 'displayName')}
              {renderSortableHeader('Header Type', 'headerType')}
              {renderSortableHeader('Site Pages', 'contentTypes.site-pages')}
              {renderSortableHeader('Landing Pages', 'contentTypes.landing-pages')}
              {renderSortableHeader('Blog Posts', 'contentTypes.blog-posts')}
              {renderSortableHeader('Blogs', 'contentTypes.blogs')}
              {renderSortableHeader('Tags', 'contentTypes.tags')}
              {renderSortableHeader('Authors', 'contentTypes.authors')}
              {renderSortableHeader('URL Redirects', 'contentTypes.url-redirects')}
              {renderSortableHeader('HubDB Tables', 'contentTypes.hubdb-tables')}
              {renderSortableHeader('Category', 'category')}
              {renderSortableHeader('Read Only', 'read_only')}
              {renderSortableHeader('In App Edit', 'in_app_edit')}
              {renderSortableHeader('Filters', 'filters')}
              {renderSortableHeader('Last Updated', 'lastUpdated')}
              <TableHead className="px-4 bg-background">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, index) => {
              // Find the original index in the data array
              const originalIndex = data.findIndex(
                item =>
                  item.id === row.id ||
                  (item.header === row.header && item.displayName === row.displayName)
              )
              return (
                <TableRow key={row.id || index}>
                  {/* Header Name */}
                  <TableCell>
                    <div className="w-48 p-2 text-sm text-muted-foreground bg-muted/30 rounded border">
                      {row.header || ''}
                    </div>
                  </TableCell>
                  {/* <TableCell>{renderCell(row, 'header', originalIndex, 'string')}</TableCell> */}

                  {/* Display Name */}
                  <TableCell>
                    <div className="w-48 p-2 text-sm text-muted-foreground bg-muted/30 rounded border">
                      {row.displayName || ''}
                    </div>
                  </TableCell>
                  {/* <TableCell>{renderCell(row, 'displayName', originalIndex, 'string')}</TableCell> */}

                  {/* Header Type */}
                  <TableCell>
                    <div className="w-48 p-2 text-sm text-muted-foreground bg-muted/30 rounded border">
                      {row.headerType || ''}
                    </div>
                    {/* <Select
                      value={row.headerType}
                      onValueChange={value => updateField(originalIndex, 'headerType', value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['string', 'date-time', 'number', 'boolean', 'array', 'object'].map(t => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select> */}
                  </TableCell>

                  {/* Site Pages */}
                  <TableCell>
                    {renderCell(row, 'contentTypes', originalIndex, 'contentType', 'site-pages')}
                  </TableCell>

                  {/* Landing Pages */}
                  <TableCell>
                    {renderCell(row, 'contentTypes', originalIndex, 'contentType', 'landing-pages')}
                  </TableCell>

                  {/* Blog Posts */}
                  <TableCell>
                    {renderCell(row, 'contentTypes', originalIndex, 'contentType', 'blog-posts')}
                  </TableCell>

                  {/* Blogs */}
                  <TableCell>
                    {renderCell(row, 'contentTypes', originalIndex, 'contentType', 'blogs')}
                  </TableCell>

                  {/* Tags */}
                  <TableCell>
                    {renderCell(row, 'contentTypes', originalIndex, 'contentType', 'tags')}
                  </TableCell>

                  {/* Authors */}
                  <TableCell>
                    {renderCell(row, 'contentTypes', originalIndex, 'contentType', 'authors')}
                  </TableCell>

                  {/* URL Redirects */}
                  <TableCell>
                    {renderCell(row, 'contentTypes', originalIndex, 'contentType', 'url-redirects')}
                  </TableCell>

                  {/* HubDB Tables */}
                  <TableCell>
                    {renderCell(row, 'contentTypes', originalIndex, 'contentType', 'hubdb-tables')}
                  </TableCell>

                  {/* Category */}
                  <TableCell>
                    <Select
                      value={row.category}
                      onValueChange={value => updateField(originalIndex, 'category', value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Required">Required</SelectItem>
                        <SelectItem value="Recommended">Recommended</SelectItem>
                        <SelectItem value="Additional">Additional</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Read Only */}
                  <TableCell>{renderCell(row, 'read_only', originalIndex, 'boolean')}</TableCell>

                  {/* In App Edit */}
                  <TableCell>{renderCell(row, 'in_app_edit', originalIndex, 'boolean')}</TableCell>

                  {/* Filters */}
                  <TableCell>{renderCell(row, 'filters', originalIndex, 'boolean')}</TableCell>

                  {/* Last Updated */}
                  <TableCell>
                    <p className="w-48">
                      {row.lastUpdated
                        ? new Date(row.lastUpdated).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          })
                        : 'Never'}
                    </p>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeRow(originalIndex)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default Configurations
