'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface HeaderConfig {
  id?: number
  header: string
  displayName?: string
  headerType: string
  category: string
  filters: boolean
  read_only: boolean
  in_app_edit: boolean
  prefetch_options: boolean
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

interface FiltersProps {
  data: HeaderConfig[]
  filteredData: HeaderConfig[]
  setFilteredData: (data: HeaderConfig[]) => void
}

const Filters = ({ data, filteredData, setFilteredData }: FiltersProps) => {
  // Filter states
  const [filters, setFilters] = useState({
    displayName: '',
    contentType: 'all',
    category: 'all',
    readOnly: 'all',
    inAppEdit: 'all',
    filters: 'all',
  })

  // Apply filters function
  const applyFilters = () => {
    let filtered = [...data]

    // Filter by display name
    if (filters.displayName.trim()) {
      filtered = filtered.filter(
        item =>
          item.displayName?.toLowerCase().includes(filters.displayName.toLowerCase()) ||
          item.header?.toLowerCase().includes(filters.displayName.toLowerCase())
      )
    }

    // Filter by content type
    if (filters.contentType !== 'all') {
      filtered = filtered.filter(
        item =>
          item.contentTypes &&
          item.contentTypes[filters.contentType as keyof typeof item.contentTypes]
      )
    }

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category)
    }

    // Filter by read only
    if (filters.readOnly !== 'all') {
      const isReadOnly = filters.readOnly === 'true'
      filtered = filtered.filter(item => item.read_only === isReadOnly)
    }

    // Filter by in app edit
    if (filters.inAppEdit !== 'all') {
      const isInAppEdit = filters.inAppEdit === 'true'
      filtered = filtered.filter(item => item.in_app_edit === isInAppEdit)
    }

    // Filter by filters
    if (filters.filters !== 'all') {
      const hasFilters = filters.filters === 'true'
      filtered = filtered.filter(item => item.filters === hasFilters)
    }

    setFilteredData(filtered)
  }

  // Clear filters function
  const clearFilters = () => {
    setFilters({
      displayName: '',
      contentType: 'all',
      category: 'all',
      readOnly: 'all',
      inAppEdit: 'all',
      filters: 'all',
    })
    setFilteredData(data)
  }

  // Update filter state
  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="mb-6 p-4 border rounded-lg bg-muted/20">
      <h3 className="text-lg font-semibold mb-4">Filters</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Display Name Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Display Name</label>
          <Input
            placeholder="Search headers..."
            value={filters.displayName}
            onChange={e => updateFilter('displayName', e.target.value)}
            className="w-full"
          />
        </div>

        {/* Content Type Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Content Type</label>
          <Select
            value={filters.contentType}
            onValueChange={value => updateFilter('contentType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Content Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Content Types</SelectItem>
              <SelectItem value="site-pages">Site Pages</SelectItem>
              <SelectItem value="landing-pages">Landing Pages</SelectItem>
              <SelectItem value="blog-posts">Blog Posts</SelectItem>
              <SelectItem value="blogs">Blogs</SelectItem>
              <SelectItem value="tags">Tags</SelectItem>
              <SelectItem value="authors">Authors</SelectItem>
              <SelectItem value="url-redirects">URL Redirects</SelectItem>
              <SelectItem value="hubdb-tables">HubDB Tables</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Category</label>
          <Select value={filters.category} onValueChange={value => updateFilter('category', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Recommended">Recommended</SelectItem>
              <SelectItem value="Additional">Additional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Read Only Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Read Only</label>
          <Select value={filters.readOnly} onValueChange={value => updateFilter('readOnly', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Read Only</SelectItem>
              <SelectItem value="false">Editable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* In App Edit Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">In App Edit</label>
          <Select
            value={filters.inAppEdit}
            onValueChange={value => updateFilter('inAppEdit', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Enabled</SelectItem>
              <SelectItem value="false">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filters Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Filters</label>
          <Select value={filters.filters} onValueChange={value => updateFilter('filters', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Enabled</SelectItem>
              <SelectItem value="false">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter Actions */}
      <div className="flex gap-2 mt-4">
        <Button onClick={applyFilters} size="sm">
          Apply Filters
        </Button>
        <Button onClick={clearFilters} variant="outline" size="sm">
          Clear Filters
        </Button>
        <span className="text-sm text-muted-foreground self-center ml-4">
          Showing {filteredData.length} of {data.length} headers
        </span>
      </div>
    </div>
  )
}

export default Filters
