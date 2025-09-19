'use client'

import { Search, CalendarIcon, Filter, Loader2 } from 'lucide-react'
import { forwardRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import React from 'react'
import { ContentTypeT } from '@/lib/content-types'
import { getHeaderInfo } from '@/lib/utils'

// ... (interfaces and other functions remain the same) ...

interface HubSpotContent {
  id: string
  name: string
  [key: string]: any
}

interface FilterProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  slugSearchTerm: string
  setSlugSearchTerm: (term: string) => void
  htmlTitleSearchTerm: string
  setHtmlTitleSearchTerm: (term: string) => void
  languageFilter: string
  setLanguageFilter: (filter: string) => void
  stateFilter: string
  setStateFilter: (filter: string) => void
  publishDateFilter: string
  setPublishDateFilter: (filter: string) => void
  createdAtFilter: string
  setCreatedAtFilter: (filter: string) => void
  dynamicFilters: { [key: string]: string }
  setDynamicFilters: (
    filters:
      | { [key: string]: string }
      | ((prev: { [key: string]: string }) => { [key: string]: string })
  ) => void
  status: string
  setStatus: (status: string) => void
  contentType?: ContentTypeT
  itemsPerPage?: number
  setItemsPerPage?: (itemsPerPage: number) => void
  currentPage?: number
  setCurrentPage?: (currentPage: number) => void
  dateRange?: [Date | null, Date | null]
  setDateRange?: (dateRange: [Date | null, Date | null]) => void
  content?: HubSpotContent[]
}

const DatePickerCustomInput = forwardRef(
  ({ value, onClick, placeholder, onClear }: any, ref: any) => (
    <div className="relative">
      <Button variant="outline" onClick={onClick} ref={ref} className="w-full justify-start pr-8">
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value || placeholder || 'Select Date'}
      </Button>
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
          aria-label="Clear date"
        >
          ×
        </button>
      )}
    </div>
  )
)
DatePickerCustomInput.displayName = 'DatePickerCustomInput'

const DROPDOWN_FIELDS = [
  'authorName',
  'domain',
  'htmlTitle',
  'language',
  'slug',
  'name',
  'destination',
  'routePrefix',
]

export default function Filters({
  searchTerm,
  setSearchTerm,
  slugSearchTerm,
  setSlugSearchTerm,
  htmlTitleSearchTerm,
  setHtmlTitleSearchTerm,
  languageFilter,
  setLanguageFilter,
  stateFilter,
  setStateFilter,
  publishDateFilter,
  setPublishDateFilter,
  createdAtFilter,
  setCreatedAtFilter,
  dynamicFilters,
  setDynamicFilters,
  contentType,
  dateRange,
  setDateRange,
  content = [],
}: FilterProps) {
  // Dynamic filterable fields from database
  const [filterableFields, setFilterableFields] = useState<string[]>([])

  // Initialize temp filter value based on current active filter
  // const filterableFields = contentType
  //   ? Array.from(getHubSpotFilterableFields(contentType?.name))
  //   : []

  const [loadingFields, setLoadingFields] = useState(false)

  // State for the selected filter field and its value (temporary until Apply is clicked)

  // Set appropriate default filter field based on content type
  const getDefaultFilterField = (contentType?: string, availableFields?: string[]): string => {
    if (!contentType) return 'name'

    // Get the first available filterable field for this content type
    if (availableFields && availableFields.length > 0) {
      return availableFields[0]
    }

    // Fallback to common fields
    switch (contentType) {
      case 'url-redirects':
        return 'destination' // Most relevant field for URL redirects
      case 'blog-posts':
        return 'htmlTitle' // More relevant than name for blog posts
      case 'site-pages':
      case 'landing-pages':
        return 'name' // Name is appropriate for pages
      default:
        return 'name'
    }
  }

  const [selectedFilterField, setSelectedFilterField] = useState<string>(
    getDefaultFilterField(contentType?.name, filterableFields)
  )
  const [tempFilterValue, setTempFilterValue] = useState<string>('')

  // Fetch filterable fields from database
  const fetchFilterableFields = async (contentType: string) => {
    setLoadingFields(true)
    try {
      const params = new URLSearchParams({
        contentType: contentType,
        filtersEnabled: 'true', // Only get headers that have filters enabled
      })

      const response = await fetch(`/api/hubspot/headers?${params}`)
      const data = await response.json()

      if (data.success) {
        // Extract the field names (api_name) from the headers
        const fields = data.headers.map((header: any) => header.key)
        setFilterableFields([...fields])
        if (fields.length > 0) {
          setSelectedFilterField(fields[0])
        }
        console.log('Fetched filterable fields:', fields)
      } else {
        console.error('Failed to fetch filterable fields:', data.error)
        // Set empty array if no database fields found
        setFilterableFields(['name', 'slug', 'htmlTitle', 'language', 'state', 'publishDate'])
      }
    } catch (error) {
      console.error('Error fetching filterable fields:', error)
      // Set empty array on error
      setFilterableFields(['name', 'slug', 'htmlTitle', 'language', 'state', 'publishDate'])
    } finally {
      setLoadingFields(false)
    }
  }

  // Fetch filterable fields when content type changes
  useEffect(() => {
    if (contentType) {
      // contentType is already in slug format (e.g., "landing-pages")
      fetchFilterableFields(contentType.slug)
    } else {
      setFilterableFields(['name', 'slug', 'htmlTitle', 'language', 'state', 'publishDate'])
    }
  }, [contentType])

  const displayedFilterFields = filterableFields.filter(field => field !== 'state')

  // Lazy loading dropdown options for filters
  const [filterDropdownOptions, setFilterDropdownOptions] = useState<{ [key: string]: string[] }>(
    {}
  )
  const [loadingFilterOptions, setLoadingFilterOptions] = useState<{ [key: string]: boolean }>({})
  const [loadedFilterFields, setLoadedFilterFields] = useState<Set<string>>(new Set())

  // Fetch specific filter dropdown options
  const fetchFilterDropdownOptions = useCallback(
    async (fieldKey: string) => {
      if (loadedFilterFields.has(fieldKey)) {
        return
      }

      setLoadingFilterOptions(prev => ({ ...prev, [fieldKey]: true }))
      try {
        const response = await fetch('/api/hubspot/dropdown-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentType: contentType || 'all-pages',
            specificField: fieldKey,
          }),
        })

        const data = await response.json()
        if (data.success && data.dropdownOptions[fieldKey]) {
          setFilterDropdownOptions(prev => ({
            ...prev,
            [fieldKey]: data.dropdownOptions[fieldKey],
          }))
          setLoadedFilterFields(prev => new Set([...prev, fieldKey]))
        }
      } catch (error) {
        console.error(`Failed to fetch filter dropdown options for ${fieldKey}:`, error)
      } finally {
        setLoadingFilterOptions(prev => ({ ...prev, [fieldKey]: false }))
      }
    },
    [contentType, loadedFilterFields]
  )

  useEffect(() => {
    // Only update if the current selected field is not available in the new content type
    if (!displayedFilterFields.includes(selectedFilterField)) {
      const defaultField = getDefaultFilterField(contentType?.name, displayedFilterFields)
      setSelectedFilterField(defaultField)
    }
    setTempFilterValue('')
  }, [contentType, displayedFilterFields, selectedFilterField]) // Added missing dependencies

  // ... (dropdownOptions and useEffect remain the same) ...

  const dropdownOptions = useMemo(() => {
    const options: { [key: string]: string[] } = {}

    DROPDOWN_FIELDS.forEach(field => {
      const uniqueValues = new Set<string>()

      // Add options from current content
      content.forEach(item => {
        const value = item[field] || item.exportHeaders?.[field] || item.allHeaders?.[field]
        if (value && typeof value === 'string' && value.trim() !== '') {
          uniqueValues.add(value.trim())
        }
      })

      // Add options from HubSpot API (if loaded)
      if (filterDropdownOptions[field]) {
        filterDropdownOptions[field].forEach(option => {
          uniqueValues.add(option)
        })
      }

      options[field] = Array.from(uniqueValues).sort()
    })

    return options
  }, [content, filterDropdownOptions])

  useEffect(() => {
    let currentValue = ''
    switch (selectedFilterField) {
      case 'name':
        currentValue = searchTerm
        break
      case 'slug':
        currentValue = slugSearchTerm
        break
      case 'htmlTitle':
        currentValue = htmlTitleSearchTerm
        break
      case 'language':
        currentValue = languageFilter === 'all' ? '' : languageFilter
        break
      case 'publishDate':
        currentValue = publishDateFilter
        break
      case 'createdAt':
        currentValue = createdAtFilter
        break
      case 'authorName':
      case 'domain':
      case 'destination':
      case 'routePrefix':
        currentValue = dynamicFilters[selectedFilterField] || 'all'
        break
      default:
        break
    }
    setTempFilterValue(currentValue)
  }, [
    selectedFilterField,
    searchTerm,
    slugSearchTerm,
    htmlTitleSearchTerm,
    languageFilter,
    stateFilter,
    publishDateFilter,
    createdAtFilter,
    dynamicFilters,
  ])

  // <<< CHANGE 1: CREATE A STATE FOR THE BUTTON'S DISABLED STATUS
  // This will determine if the "Apply" button is clickable.
  // It's enabled only if there's a temporary value that is not empty and not 'all'.
  const isApplyDisabled = useMemo(() => {
    if (!tempFilterValue || tempFilterValue.trim() === '' || tempFilterValue === 'all') {
      return true // Disable the button
    }
    return false // Enable the button
  }, [tempFilterValue])

  // ... (handleApplyFilters, handleClearFilters, etc. remain the same) ...
  const formatFieldName = (fieldName: string) => {
    return fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1')
  }

  const getFieldType = (fieldName: string) => {
    // For now, we'll use simple type inference based on field name
    // This could be enhanced later to fetch type info from the database
    // OLD
    // if (fieldName === 'publishDate') return 'date'
    // if (fieldName === 'state') return 'select'
    // if (fieldName.includes('count') || fieldName.includes('number') || fieldName.includes('id'))
    //   return 'number'
    // return 'string'
    if (!contentType) return 'string'
    const headerInfo = getHeaderInfo(fieldName, contentType?.name)
    return headerInfo?.dataType || 'string'
  }

  const handleFilterFieldChange = (fieldName: string) => {
    setSelectedFilterField(fieldName)
    setTempFilterValue('')
  }

  const handleTempFilterValueChange = (value: string) => {
    setTempFilterValue(value)
  }

  const handleApplyFilters = () => {
    // This logic stays the same, but now it's only callable when the button is enabled.
    setSearchTerm('')
    setSlugSearchTerm('')
    setHtmlTitleSearchTerm('')
    setLanguageFilter('all')
    setStateFilter('all')
    setPublishDateFilter('')
    setCreatedAtFilter('')
    setDynamicFilters({})

    switch (selectedFilterField) {
      case 'name':
        setSearchTerm(tempFilterValue)
        break
      case 'slug':
        setSlugSearchTerm(tempFilterValue)
        break
      case 'htmlTitle':
        setHtmlTitleSearchTerm(tempFilterValue)
        break
      case 'language':
        setLanguageFilter(tempFilterValue.trim() === '' ? 'all' : tempFilterValue)
        break
      case 'state':
        setStateFilter(tempFilterValue === 'all' ? 'all' : tempFilterValue)
        break
      case 'publishDate':
        setPublishDateFilter(tempFilterValue)
        break
      case 'createdAt':
        setCreatedAtFilter(tempFilterValue)
        break
      case 'authorName':
      case 'domain':
      case 'destination':
      case 'routePrefix':
        if (tempFilterValue.trim() !== '' && tempFilterValue !== 'all') {
          setDynamicFilters((prev: { [key: string]: string }) => ({
            ...prev,
            [selectedFilterField]: tempFilterValue,
          }))
        }
        break
      default:
        if (tempFilterValue.trim() !== '') {
          setDynamicFilters((prev: { [key: string]: string }) => ({
            ...prev,
            [selectedFilterField]: tempFilterValue,
          }))
        }
        break
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleApplyFilters()
    }
  }

  const handleClearFilters = () => {
    setTempFilterValue('')
    setSearchTerm('')
    setSlugSearchTerm('')
    setHtmlTitleSearchTerm('')
    setLanguageFilter('all')
    setStateFilter('all')
    setPublishDateFilter('')
    setCreatedAtFilter('')
    setDynamicFilters({})
    if (setDateRange) setDateRange([null, null])
  }

  const getPlaceholderText = (fieldName: string) => {
    const fieldDisplayName = formatFieldName(fieldName)
    return `Search by ${fieldDisplayName}...`
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex flex-1 min-w-[300px] gap-2">
        {/* ... (Select for field name remains the same) ... */}
        <Select value={selectedFilterField} onValueChange={handleFilterFieldChange}>
          <SelectTrigger className="w-[150px]">
            {loadingFields ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Loading...</span>
              </div>
            ) : (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent>
            {displayedFilterFields.map(fieldName => (
              <SelectItem key={fieldName} value={fieldName}>
                {formatFieldName(fieldName)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* ... (The value selector and input remain the same) ... */}
        {selectedFilterField !== 'publishDate' ? (
          <Select
            value={tempFilterValue}
            onValueChange={handleTempFilterValueChange}
            onOpenChange={open => {
              // Fetch options when dropdown opens if not already loaded
              if (open && !loadedFilterFields.has(selectedFilterField)) {
                fetchFilterDropdownOptions(selectedFilterField)
              }
            }}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder={`Select ${formatFieldName(selectedFilterField)}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {formatFieldName(selectedFilterField)}s</SelectItem>
              {loadingFilterOptions[selectedFilterField] ? (
                <SelectItem value="loading" disabled>
                  Loading options...
                </SelectItem>
              ) : (
                dropdownOptions[selectedFilterField]?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        ) : (
          <div className="relative w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder={getPlaceholderText(selectedFilterField)}
              value={tempFilterValue}
              onChange={e => handleTempFilterValueChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
              type={getFieldType(selectedFilterField) === 'number' ? 'number' : 'text'}
            />
          </div>
        )}

        {/* ... (Other filters like State and DatePicker remain the same) ... */}
        <Select value={stateFilter} onValueChange={value => setStateFilter(value)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="PUBLISHED_OR_SCHEDULED">Published or Scheduled</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <DatePicker
            selectsRange
            startDate={dateRange?.[0] || null}
            endDate={dateRange?.[1] || null}
            onChange={(update: [Date | null, Date | null]) => {
              if (setDateRange) setDateRange(update)
            }}
            isClearable
            placeholderText="Select Publish Date"
            customInput={<DatePickerCustomInput placeholder="Select Publish Date" />}
            className="w-[200px]"
            popperClassName="z-[50]"
            popperPlacement="bottom-start"
          />
        </div>

        <div className="flex gap-2">
          {/* <<< CHANGE 2: UPDATE THE APPLY BUTTON LOGIC */}
          {/* Use the standard `disabled` prop and our new state variable. */}
          {/* The UI library will handle the grey/black color change automatically. */}
          <Button
            onClick={handleApplyFilters}
            className="flex items-center gap-2" // Removed the custom grey background classes
            size="sm"
            disabled={isApplyDisabled} // This is the key change!
          >
            <Filter className="h-4 w-4" />
            Apply
          </Button>
          <Button onClick={handleClearFilters} variant="outline" size="sm">
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}
