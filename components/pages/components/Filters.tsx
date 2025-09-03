'use client'

import { forwardRef, useState, useEffect, useMemo } from 'react' // No change here
import { Search, CalendarIcon, Filter } from 'lucide-react'
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
import { getHubSpotFilterableFields, getHeaderInfo } from '@/lib/utils'
import React from 'react'

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
  contentType?: string
  itemsPerPage?: number
  setItemsPerPage?: (itemsPerPage: number) => void
  currentPage?: number
  setCurrentPage?: (currentPage: number) => void
  dateRange?: [Date | null, Date | null]
  setDateRange?: (dateRange: [Date | null, Date | null]) => void
  content?: HubSpotContent[]
}

const DatePickerCustomInput = forwardRef(({ value, onClick, placeholder }: any, ref: any) => (
  <Button variant="outline" onClick={onClick} ref={ref}>
    <CalendarIcon className="mr-2 h-4 w-4" />
    {value || placeholder || 'Select Date'}
  </Button>
))
DatePickerCustomInput.displayName = 'DatePickerCustomInput'

const DROPDOWN_FIELDS = ['authorName', 'domain', 'htmlTitle', 'language', 'slug', 'name']


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
  const filterableFields = contentType ? Array.from(getHubSpotFilterableFields(contentType)) : []
  const displayedFilterFields = filterableFields.filter(field => field !== 'state')

  const [selectedFilterField, setSelectedFilterField] = useState<string>('name')
  const [tempFilterValue, setTempFilterValue] = useState<string>('')

  // ... (dropdownOptions and useEffect remain the same) ...

  const dropdownOptions = useMemo(() => {
    const options: { [key: string]: string[] } = {}

    DROPDOWN_FIELDS.forEach(field => {
      const uniqueValues = new Set<string>()

      content.forEach(item => {
        const value = item[field] || item.exportHeaders?.[field] || item.allHeaders?.[field]
        if (value && typeof value === 'string' && value.trim() !== '') {
          uniqueValues.add(value.trim())
        }
      })

      options[field] = Array.from(uniqueValues).sort()
    })

    return options
  }, [content])

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
    if (!contentType) return 'string'
    const headerInfo = getHeaderInfo(fieldName, contentType)
    return headerInfo?.dataType || 'string'
  }

  const shouldUseDropdown = (fieldName: string) => {
    return DROPDOWN_FIELDS.includes(fieldName) && dropdownOptions[fieldName]?.length > 0
  }

  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm !== '' ||
      slugSearchTerm !== '' ||
      htmlTitleSearchTerm !== '' ||
      languageFilter !== 'all' ||
      stateFilter !== 'all' ||
      publishDateFilter !== '' ||
      createdAtFilter !== '' ||
      Object.values(dynamicFilters).some(value => value !== 'all') ||
      (dateRange && (dateRange[0] || dateRange[1]))
    )
  }, [
    searchTerm,
    slugSearchTerm,
    htmlTitleSearchTerm,
    languageFilter,
    stateFilter,
    publishDateFilter,
    createdAtFilter,
    dynamicFilters,
    dateRange,
  ])

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
            <SelectValue />
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
          <Select value={tempFilterValue} onValueChange={handleTempFilterValueChange}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder={`Select ${formatFieldName(selectedFilterField)}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {formatFieldName(selectedFilterField)}s</SelectItem>
              {dropdownOptions[selectedFilterField]?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
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

        <div className="relative !z-0">
          <DatePicker
            selectsRange
            startDate={dateRange?.[0] || null}
            endDate={dateRange?.[1] || null}
            onChange={(update: [Date | null, Date | null]) => {
              if (setDateRange) setDateRange(update)
            }}
            isClearable
            placeholderText="Select Date"
            customInput={<DatePickerCustomInput placeholder="Select Date" />}
            className="w-[200px]"
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