'use client'

import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Loader2 } from 'lucide-react'
import { ContentTypeT } from '@/lib/content-types'

interface DynamicColumn {
  key: string
  label: string
  category: string
  readOnly: boolean
}

interface DynamicExportFieldsSelectorProps {
  selectedColumns: string[]
  setSelectedColumns: React.Dispatch<React.SetStateAction<string[]>>
  idPrefix: string
  contentType?: ContentTypeT
  loadingColumns?: boolean
}

export default function DynamicExportFieldsSelector({
  selectedColumns,
  setSelectedColumns,
  idPrefix,
  contentType,
  loadingColumns = false,
}: DynamicExportFieldsSelectorProps) {
  const [dynamicColumns, setDynamicColumns] = useState<DynamicColumn[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch export columns from database
  const fetchExportColumns = async (contentType: ContentTypeT) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        contentType: contentType.name,
        // Get all headers for export - no specific filtering
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
        console.log('Fetched export columns:', columns)
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

  // Fetch columns when content type changes
  useEffect(() => {
    if (contentType) {
      fetchExportColumns(contentType)
    }
  }, [contentType])

  // Categorize columns dynamically based on database configuration
  const requiredColumns = dynamicColumns
    .filter(col => col.category === 'Required')
    .sort((a, b) => a.label.localeCompare(b.label))

  const recommendedColumns = dynamicColumns
    .filter(col => col.category === 'Recommended')
    .sort((a, b) => a.label.localeCompare(b.label))

  const additionalColumns = dynamicColumns
    .filter(col => col.category === 'Additional')
    .sort((a, b) => a.label.localeCompare(b.label))

  // Automatically add required fields to selected columns
  useEffect(() => {
    if (requiredColumns.length > 0) {
      const requiredKeys = requiredColumns.map(col => col.key)
      setSelectedColumns(prev => {
        // Only add required keys that aren't already selected
        const newRequiredKeys = requiredKeys.filter(key => !prev.includes(key))
        return newRequiredKeys.length > 0 ? [...prev, ...newRequiredKeys] : prev
      })
    }
  }, [requiredColumns, setSelectedColumns])

  // Check if any selectable fields are selected (excluding required fields)
  const hasSelectedFields = [...recommendedColumns, ...additionalColumns].some(col =>
    selectedColumns.includes(col.key)
  )

  const handleSelectAll = () => {
    const allSelectableKeys = [...recommendedColumns, ...additionalColumns].map(col => col.key)
    // Always include required fields
    const requiredKeys = requiredColumns.map(col => col.key)
    setSelectedColumns([...requiredKeys, ...allSelectableKeys])
  }

  const handleDeselectAll = () => {
    // Keep required fields selected, only deselect optional fields
    const requiredKeys = requiredColumns.map(col => col.key)
    setSelectedColumns(requiredKeys)
  }

  const handleSelectAllRecommended = () => {
    const recommendedKeys = recommendedColumns.map(col => col.key)
    setSelectedColumns(prev => [...new Set([...prev, ...recommendedKeys])])
  }

  const handleDeselectAllRecommended = () => {
    const recommendedKeys = recommendedColumns.map(col => col.key)
    setSelectedColumns(prev => prev.filter(key => !recommendedKeys.includes(key)))
  }

  const handleSelectAllAdditional = () => {
    const additionalKeys = additionalColumns.map(col => col.key)
    setSelectedColumns(prev => [...new Set([...prev, ...additionalKeys])])
  }

  const handleDeselectAllAdditional = () => {
    const additionalKeys = additionalColumns.map(col => col.key)
    setSelectedColumns(prev => prev.filter(key => !additionalKeys.includes(key)))
  }

  // Check if all recommended fields are selected
  const allRecommendedSelected =
    recommendedColumns.length > 0 &&
    recommendedColumns.every(col => selectedColumns.includes(col.key))

  // Check if all additional fields are selected
  const allAdditionalSelected =
    additionalColumns.length > 0 &&
    additionalColumns.every(col => selectedColumns.includes(col.key))

  if (loading || loadingColumns) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Loading export fields...</span>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">Select Fields to Export</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={hasSelectedFields ? handleDeselectAll : handleSelectAll}
          className="text-xs"
        >
          {hasSelectedFields ? 'Deselect All' : 'Select All'}
        </Button>
      </div>

      {/* Required Fields Section */}
      {requiredColumns.length > 0 && (
        <div className="mb-6 p-4 bg-content rounded-lg border">
          <h5 className="text-base font-semibold text-muted-foreground mb-3">Required Fields</h5>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <TooltipProvider>
              {requiredColumns.map(col => (
                <div key={`${idPrefix}-${col.key}`} className="flex items-center space-x-2">
                  <Checkbox id={`${idPrefix}-${col.key}`} checked={true} disabled={true} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label
                        htmlFor={`${idPrefix}-${col.key}`}
                        className={`text-sm font-medium text-muted-foreground flex items-center gap-1 ${
                          col.readOnly && 'cursor-help'
                        }`}
                        title="This field is required and cannot be deselected"
                      >
                        {col.label}
                        {col.readOnly && (
                          <span className="text-[8px] font-bold px-1 rounded bg-gray-200 text-gray-600">
                            Read-Only
                          </span>
                        )}
                      </label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This field is required and cannot be deselected.</p>
                      {col.readOnly && <p>This field is also read-only.</p>}
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Recommended Fields Section */}
      {recommendedColumns.length > 0 && (
        <div className="mb-6 p-4 bg-content rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-base font-semibold">Recommended Fields</h5>
            <Button
              variant="outline"
              size="sm"
              onClick={
                allRecommendedSelected ? handleDeselectAllRecommended : handleSelectAllRecommended
              }
              className="text-xs"
            >
              {allRecommendedSelected ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <TooltipProvider>
              {recommendedColumns.map(col => (
                <div key={`${idPrefix}-${col.key}`} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${idPrefix}-${col.key}`}
                    checked={selectedColumns.includes(col.key)}
                    onCheckedChange={checked =>
                      setSelectedColumns(prev =>
                        checked ? [...prev, col.key] : prev.filter(key => key !== col.key)
                      )
                    }
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label
                        htmlFor={`${idPrefix}-${col.key}`}
                        className={`text-sm font-medium flex items-center gap-1 ${
                          col.readOnly && 'text-gray-600 cursor-help'
                        }`}
                      >
                        {col.label}
                        {col.readOnly && (
                          <span className="text-[8px] font-bold px-1 rounded bg-gray-200 text-gray-600">
                            Read-Only
                          </span>
                        )}
                      </label>
                    </TooltipTrigger>
                    {col.readOnly && (
                      <TooltipContent>
                        <p>This field is read-only but can still be exported.</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
              ))}
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Additional Fields Section */}
      {additionalColumns.length > 0 && (
        <div className="p-4 bg-content rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-base font-semibold">Additional Fields</h5>
            <Button
              variant="outline"
              size="sm"
              onClick={
                allAdditionalSelected ? handleDeselectAllAdditional : handleSelectAllAdditional
              }
              className="text-xs"
            >
              {allAdditionalSelected ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2">
            {additionalColumns.map(col => (
              <div key={`${idPrefix}-${col.key}`} className="flex items-center space-x-2">
                <Checkbox
                  id={`${idPrefix}-${col.key}`}
                  checked={selectedColumns.includes(col.key)}
                  onCheckedChange={checked =>
                    setSelectedColumns(prev =>
                      checked ? [...prev, col.key] : prev.filter(key => key !== col.key)
                    )
                  }
                />
                <label
                  htmlFor={`${idPrefix}-${col.key}`}
                  className={`text-sm font-medium ${col.readOnly ? 'text-gray-600' : ''}`}
                >
                  {col.label}
                  {col.readOnly && (
                    <span className="text-[8px] font-bold px-1 rounded bg-gray-200 text-gray-600 ml-1">
                      Read-Only
                    </span>
                  )}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No fields message */}
      {requiredColumns.length === 0 &&
        recommendedColumns.length === 0 &&
        additionalColumns.length === 0 &&
        !loading && (
          <div className="p-4 bg-content rounded-lg border text-center">
            <p className="text-sm text-muted-foreground">
              No export fields configured for this content type.
            </p>
          </div>
        )}
    </div>
  )
}
