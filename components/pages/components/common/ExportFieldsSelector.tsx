'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  getAdditionalHeadersWithoutInAppEdits,
  getRecommendedHeaders,
  isHeaderReadOnly,
} from '@/lib/utils'

interface ExportFieldsSelectorProps {
  availableColumns: { key: string; label: string }[]
  selectedColumns: string[]
  setSelectedColumns: React.Dispatch<React.SetStateAction<string[]>>
  idPrefix: string
  requiredFields?: string[]
  contentType?: string
}

export default function ExportFieldsSelector({
  availableColumns,
  selectedColumns,
  setSelectedColumns,
  idPrefix,
  contentType = 'Landing Page',
}: ExportFieldsSelectorProps) {
  // Get headers from the new HubSpot system
  const recommendedHeaders = getRecommendedHeaders(contentType)
  const additionalHeaders = getAdditionalHeadersWithoutInAppEdits(contentType)

  // Categorize columns into three groups
  const requiredColumns = availableColumns
    .filter(col => col.key === 'id' || col.key === 'name') // Always required
    .sort((a, b) => a.label.localeCompare(b.label))

  const recommendedColumns = availableColumns
    .filter(col => recommendedHeaders.includes(col.key) && col.key !== 'id' && col.key !== 'name')
    .sort((a, b) => a.label.localeCompare(b.label))

  const additionalColumns = availableColumns
    .filter(col => additionalHeaders.includes(col.key))
    .sort((a, b) => a.label.localeCompare(b.label))

  // Check if any selectable fields are selected
  const hasSelectedFields = [...recommendedColumns, ...additionalColumns].some(col =>
    selectedColumns.includes(col.key)
  )

  const handleSelectAll = () => {
    const allSelectableKeys = [...recommendedColumns, ...additionalColumns].map(col => col.key)
    setSelectedColumns(allSelectableKeys)
  }

  const handleDeselectAll = () => {
    setSelectedColumns([])
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
          <div className="grid grid-cols-3 gap-4">
            {requiredColumns.map(col => (
              <div key={`${idPrefix}-${col.key}`} className="flex items-center space-x-2">
                <Checkbox id={`${idPrefix}-${col.key}`} checked={true} disabled={true} />
                <label
                  htmlFor={`${idPrefix}-${col.key}`}
                  className="text-sm font-medium text-muted-foreground"
                  title="This field is required and cannot be deselected"
                >
                  {col.label}
                </label>
              </div>
            ))}
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
              {recommendedColumns.map(col => {
                const isReadOnly = isHeaderReadOnly(col.key, contentType)
                return (
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
                            isReadOnly && 'text-gray-600 cursor-help'
                          }`}
                        >
                          {col.label}
                          {isReadOnly && (
                            <span className="text-[8px] font-bold px-1 rounded bg-gray-200 text-gray-600">
                              Read-Only
                            </span>
                          )}
                        </label>
                      </TooltipTrigger>
                      {isReadOnly && (
                        <TooltipContent>
                          <p>This field is read-only but can still be exported.</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                )
              })}
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar-thin">
            {additionalColumns.map(col => {
              const isReadOnly = isHeaderReadOnly(col.key, contentType)
              return (
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
                    className={`text-sm font-medium ${isReadOnly ? 'text-gray-600' : ''}`}
                  >
                    {col.label}
                    {isReadOnly && (
                      <span className="text-[8px] font-bold px-1 rounded bg-gray-200 text-gray-600 ml-1">
                        Read-Only
                      </span>
                    )}
                  </label>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
