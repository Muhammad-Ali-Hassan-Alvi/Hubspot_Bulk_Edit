'use client'

import { useState, useEffect, useMemo, forwardRef, useRef } from 'react'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { X, PenSquare, RefreshCw, CalendarIcon, Loader2 } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import ConfirmChangesModal from '@/components/modals/ConfirmChangesModal'
import UploadingModal from '@/components/modals/UploadingModal'
import UploadResultsModal from '@/components/modals/UploadResultsModal'
import { useUploadFlow } from '@/hooks/useUploadFlow'
import { ContentTypeT } from '@/lib/content-types'
import { EDITABLE_FIELDS } from '@/lib/constants'

const DatePickerCustomInput = forwardRef(({ value, onClick }: any, ref: any) => (
  <Button variant="outline" onClick={onClick} ref={ref} className="w-full justify-start">
    <CalendarIcon className="mr-2 h-4 w-4" />
    {value || 'Select date'}
  </Button>
))
DatePickerCustomInput.displayName = 'DatePickerCustomInput'

interface EditableField {
  key: string
  label: string
  type: string
  options?: readonly string[]
  category?: string
  contentType?: string
  readOnly?: boolean
  inAppEdit?: boolean
  filters?: boolean
}

interface BulkEditHeaderProps {
  selectedRowCount: number
  contentType?: ContentTypeT
  onConfirm: (updates: { [key: string]: any }) => void
  onClearSelection: () => void
  isPublishing?: boolean
  refreshCurrentPage: () => void
  allContent: any[]
}

export default function BulkEditHeader({
  selectedRowCount,
  contentType: _contentType,
  onConfirm,
  onClearSelection,
  refreshCurrentPage,
  isPublishing = false,
  allContent,
}: BulkEditHeaderProps) {
  const [updates, setUpdates] = useState<{ [key: string]: any }>({})
  const [dynamicFields, setDynamicFields] = useState<EditableField[]>([])
  const [loadingFields, setLoadingFields] = useState(false)
  const { toast } = useToast()
  const uploadFlow = useUploadFlow()

  // Fetch headers dynamically from database
  const fetchHeaders = async (contentType: string) => {
    setLoadingFields(true)
    try {
      const params = new URLSearchParams({
        contentType: contentType,
        inAppEdit: 'true', // Only fetch headers that are enabled for in-app editing
      })

      const response = await fetch(`/api/hubspot/headers?${params}`)
      const data = await response.json()

      console.log('umar data', data)
      if (data.success) {
        setDynamicFields(data.headers)
        console.log('Fetched dynamic headers:', data.headers)
      } else {
        console.error('Failed to fetch headers:', data.error)
        toast({
          title: 'Error Loading Fields',
          description: 'Failed to load editable fields. Using fallback fields.',
          variant: 'destructive',
        })
        // Fallback to constants if API fails
        setDynamicFields([...EDITABLE_FIELDS])
      }
    } catch (error) {
      console.error('Error fetching headers:', error)
      toast({
        title: 'Error Loading Fields',
        description: 'Failed to load editable fields. Using fallback fields.',
        variant: 'destructive',
      })
      // Fallback to constants if API fails
      setDynamicFields([...EDITABLE_FIELDS])
    } finally {
      setLoadingFields(false)
    }
  }

  // Fetch headers when content type changes
  useEffect(() => {
    if (_contentType) {
      fetchHeaders(_contentType.slug)
    }
  }, [_contentType])

  // Use dynamic fields from database or fallback to constants
  const fieldsToUse = useMemo(() => {
    return dynamicFields.length > 0 ? dynamicFields : EDITABLE_FIELDS
  }, [dynamicFields])
  // Fetch all dropdown options upfront
  const [hubspotDropdownOptions, setHubspotDropdownOptions] = useState<{ [key: string]: string[] }>(
    {}
  )
  const [loadingAllDropdownOptions, setLoadingAllDropdownOptions] = useState(false)
  const loadedContentTypeRef = useRef<string | null>(null)

  // Fetch all dropdown options when content type changes
  useEffect(() => {
    if (_contentType && _contentType.slug !== loadedContentTypeRef.current) {
      setHubspotDropdownOptions({})
      loadedContentTypeRef.current = _contentType.slug
      
      setLoadingAllDropdownOptions(true)
      fetch('/api/hubspot/dropdown-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: _contentType?.name || '',
          useCache: true,
        }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.success && data.dropdownOptions) {
            setHubspotDropdownOptions(data.dropdownOptions)
            console.log('Fetched all dropdown options:', data.dropdownOptions)
          } else {
            console.error('Failed to fetch dropdown options:', data.error)
            toast({
              title: 'Error Loading Options',
              description: 'Failed to load dropdown options. Some fields may be disabled.',
              variant: 'destructive',
            })
          }
        })
        .catch(error => {
          console.error('Failed to fetch dropdown options:', error)
          toast({
            title: 'Error Loading Options',
            description: 'Failed to load dropdown options. Some fields may be disabled.',
            variant: 'destructive',
          })
        })
        .finally(() => {
          setLoadingAllDropdownOptions(false)
        })
    }
  }, [_contentType?.slug, _contentType?.name, toast])

  const fieldOptions = useMemo(() => {
    // Combine HubSpot options with local content options for better coverage
    const combinedOptions = { ...hubspotDropdownOptions }

    // Add default options for certain fields
    if (!combinedOptions.state) {
      combinedOptions.state = ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']
    }
    if (!combinedOptions.redirectStyle) {
      combinedOptions.redirectStyle = ['301', '302', '307', '308']
    }
    if (!combinedOptions.precedence) {
      combinedOptions.precedence = ['1', '2', '3', '4', '5', '10', '20', '50', '100']
    }
    if (!combinedOptions.language) {
      combinedOptions.language = [
        'English - en',
        'Spanish - es',
        'French - fr',
        'German - de',
        'Italian - it',
        'Portuguese - pt',
        'Japanese - ja',
        'Chinese - zh',
        'Korean - ko',
        'Arabic - ar',
        'Hindi - hi',
        'Russian - ru',
      ]
    }
    if (!combinedOptions.archivedInDashboard) {
      combinedOptions.archivedInDashboard = ['true', 'false']
    }

    if (allContent && Array.isArray(allContent)) {
      const fieldsForDropdown = [
        'campaign',
        'contentGroupId',
        'domain',
        'language',
        'state',
        'subcategory',
        'htmlTitle',
        'name',
        'authorName',
        'tagIds',
        'blogAuthorId',
        'redirectStyle',
        'precedence',
        'linkRelCanonicalUrl',
        'metaDescription',
        'url',
        'widgets',
        'featuredImage',
        'footerHtml',
        'headHtml',
        'publicAccessRules',
        'slug',
        'archivedInDashboard',
        'archivedAt',
        'pageTitle',
        'pageDescription',
        'ogTitle',
        'ogDescription',
        'ogImage',
        'twitterTitle',
        'twitterDescription',
        'twitterImage',
      ]

      fieldsForDropdown.forEach(fieldKey => {
        const values = new Set<string>()

        // Add existing HubSpot options
        if (combinedOptions[fieldKey]) {
          combinedOptions[fieldKey].forEach(option => values.add(option))
        }

        // Add options from current content
        allContent.forEach(item => {
          const value = item.allHeaders?.[fieldKey] || item[fieldKey]
          if (value) {
            if (Array.isArray(value)) {
              value.forEach(v => {
                if (v && typeof v === 'string' && v.trim() !== '') {
                  values.add(v.trim())
                }
              })
            } else if (typeof value === 'string' && value.trim() !== '') {
              values.add(value.trim())
            }
          }
        })

        const uniqueOptions = Array.from(values)
        if (uniqueOptions.length > 0) {
          combinedOptions[fieldKey] = uniqueOptions.sort((a, b) => a.localeCompare(b))
        }
      })
    }

    return combinedOptions
  }, [hubspotDropdownOptions, allContent])

  useEffect(() => {
    setUpdates({})
  }, [fieldsToUse])

  const handleValueChange = (key: string, value: any) => {
    setUpdates(prev => {
      const newUpdates = { ...prev, [key]: value }
      return newUpdates
    })
  }

  const handleConfirm = () => {
    const finalUpdates = Object.entries(updates).reduce(
      (acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          acc[key] = value
        }
        return acc
      },
      {} as { [key: string]: any }
    )

    if (Object.keys(finalUpdates).length === 0) {
      toast({
        title: 'No Changes Entered',
        description: 'Please modify at least one field to confirm an update.',
        variant: 'destructive',
      })
      return
    }

    uploadFlow.startConfirmation()
  }

  const handleConfirmChanges = async () => {
    const finalUpdates = Object.entries(updates).reduce(
      (acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          acc[key] = value
        }
        return acc
      },
      {} as { [key: string]: any }
    )

    await uploadFlow.confirmChanges(async () => {
      // Simulate the actual upload process
      await new Promise(resolve => setTimeout(resolve, 2000))
      onConfirm(finalUpdates)
      uploadFlow.completeUpload(selectedRowCount, 0)
    })
  }

  const renderField = (field: EditableField) => {
    const dynamicOptions = fieldOptions[field.key]
    const hasOptions = dynamicOptions && dynamicOptions.length > 0
      const isLoading = loadingAllDropdownOptions

    // Fields that should always be dropdowns
    const alwaysDropdownFields = [
      'language',
      'domain',
      'tagIds',
      'precedence',
      'redirectStyle',
      'campaign',
      'authorName',
      'blogAuthorId',
      'contentGroupId',
      'state',
      'archived',
    ]

    // Special case: publishDate should always show calendar
    if (field.key === 'publishDate') {
      return (
        <div className="relative z-[60]">
          <DatePicker
            selected={updates[field.key] ? new Date(updates[field.key]) : null}
            onChange={(date: Date | null) => {
              if (date) {
                const year = date.getFullYear()
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const day = String(date.getDate()).padStart(2, '0')
                handleValueChange(field.key, `${year}-${month}-${day}`)
              } else {
                handleValueChange(field.key, '')
              }
            }}
            dateFormat="MMMM d, yyyy"
            isClearable
            placeholderText="Select date"
            customInput={<DatePickerCustomInput />}
            className="w-full"
            wrapperClassName="w-full"
            popperClassName="z-[60]"
            popperPlacement="bottom-start"
          />
        </div>
      )
    }

    // Show dropdown if we have options OR if it's a field that should always be a dropdown
    if (hasOptions || alwaysDropdownFields.includes(field.key)) {
      return (
        <div className="space-y-1">
          <Select
            value={updates[field.key] ? String(updates[field.key]) : ''}
            onValueChange={value => handleValueChange(field.key, value)}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={field.label} />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <SelectItem value="loading" disabled>
                  Loading options...
                </SelectItem>
              ) : hasOptions ? (
                dynamicOptions.map(option => {
                  // Special handling for archivedInDashboard to show Yes/No but send true/false
                  if (field.key === 'archivedInDashboard') {
                    const displayValue = option === 'true' ? 'Yes' : option === 'false' ? 'No' : option
                    return (
                      <SelectItem key={option} value={option}>
                        {displayValue}
                      </SelectItem>
                    )
                  }
                  return (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  )
                })
              ) : (
                <SelectItem value="no-options" disabled>
                  No Value
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )
    }

    // If no options available, show disabled field with "No Value"
    if (!hasOptions && !isLoading) {
      return (
        <div className="space-y-1">
          <Select disabled>
            <SelectTrigger className="bg-background opacity-50">
              <SelectValue placeholder="No Value" />
            </SelectTrigger>
          </Select>
          {/* <p className="text-xs text-muted-foreground">
            No data found for this field in your HubSpot account
          </p> */}
        </div>
      )
    }

    switch (field.type) {
      case 'boolean':
        return (
          <Select
            value={
              updates[field.key] === true ? 'true' : updates[field.key] === false ? 'false' : ''
            }
            onValueChange={value => handleValueChange(field.key, value === 'true')}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={field.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        )
      case 'select':
        return (
          <Select
            value={updates[field.key] ? String(updates[field.key]) : ''}
            onValueChange={value => handleValueChange(field.key, value)}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={field.label} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'datetime':
        return (
          <div className="relative z-[60]">
            <DatePicker
              selected={updates[field.key] ? new Date(updates[field.key]) : null}
              onChange={(date: Date | null) => {
                if (date) {
                  const year = date.getFullYear()
                  const month = String(date.getMonth() + 1).padStart(2, '0')
                  const day = String(date.getDate()).padStart(2, '0')
                  handleValueChange(field.key, `${year}-${month}-${day}`)
                } else {
                  handleValueChange(field.key, '')
                }
              }}
              dateFormat="MMMM d, yyyy"
              isClearable
              placeholderText="Select date"
              customInput={<DatePickerCustomInput />}
              className="w-full"
              wrapperClassName="w-full"
              popperClassName="z-[60]"
              popperPlacement="bottom-start"
            />
          </div>
        )
      case 'array':
        // Check if this array field should be a dropdown
        if (alwaysDropdownFields.includes(field.key)) {
          return (
            <div className="space-y-1">
              <Select
                value={updates[field.key] ? String(updates[field.key]) : ''}
                onValueChange={value => handleValueChange(field.key, value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={field.label} />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading options...
                    </SelectItem>
                  ) : dynamicOptions && dynamicOptions.length > 0 ? (
                    dynamicOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-options" disabled>
                      Click to load options...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )
        }
        // Default array input for non-dropdown array fields
        return (
          <Input
            className="bg-background"
            placeholder={field.label + ' (comma-separated)'}
            value={updates[field.key] || ''}
            onChange={e =>
              handleValueChange(
                field.key,
                e.target.value.split(',').map(item => item.trim())
              )
            }
          />
        )
      case 'number':
        return (
          <Input
            className="bg-background"
            type="number"
            placeholder={field.label}
            value={
              updates[field.key] !== undefined && updates[field.key] !== null
                ? String(updates[field.key])
                : ''
            }
            onChange={e => handleValueChange(field.key, Number(e.target.value))}
          />
        )
      default:
        return (
          <Input
            className="bg-background"
            placeholder={field.label}
            value={
              updates[field.key] !== undefined && updates[field.key] !== null
                ? String(updates[field.key])
                : ''
            }
            onChange={e => handleValueChange(field.key, e.target.value)}
          />
        )
    }
  }

  // The rest of the component remains the same...
  return (
    <>
      <Card className="bg-card text-card-foreground !rounded-t-lg rounded-none shadow-sm transition-all">
        <CardContent className="p-5 space-y-5">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <CardTitle className="flex text-xl items-center gap-2">
                <PenSquare className="h-4 w-4" />
                Bulk Edit {selectedRowCount} Item(s)
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {/* <Button 
                onClick={fetchHubspotDropdownOptions} 
                size="sm" 
                variant="outline"
                disabled={loadingAllDropdownOptions}
                title="Refresh dropdown options from HubSpot"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingAllDropdownOptions ? 'animate-spin' : ''}`} />
                Refresh Options
              </Button> */}
              <Button onClick={handleConfirm} size="sm" disabled={isPublishing}>
                Upload Changes to HubSpot
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearSelection}
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* {loadingAllDropdownOptions && (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Loading dropdown options from HubSpot...
            </div>
          )}
           */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {loadingFields || loadingAllDropdownOptions ? (
              <div className="col-span-full flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">
                  {loadingFields ? 'Loading editable fields...' : 'Loading dropdown options...'}
                </span>
              </div>
            ) : fieldsToUse.length === 0 ? (
              <div className="col-span-full flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground text-center">
                  No In App Bulk Edit Headers for the selected content type
                </span>
              </div>
            ) : (
              fieldsToUse.map(field => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={field.key} className="text-sm font-medium">
                    {field.label}
                  </Label>
                  {renderField(field)}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs... */}
      <ConfirmChangesModal
        isOpen={uploadFlow.showConfirmation}
        onClose={() => uploadFlow.reset()}
        onConfirm={handleConfirmChanges}
        changes={updates}
        selectedCount={selectedRowCount}
        isProcessing={uploadFlow.isProcessing}
      />

      {/* Old modal - to be removed */}
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
            <DialogDescription>
              Review and confirm the changes that will be applied to your selected items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The following changes will be uploaded to HubSpot for {selectedRowCount} selected{' '}
              {selectedRowCount === 1 ? 'item' : 'items'}:
            </p>

            <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Field</th>
                    <th className="text-left p-3 font-medium">New Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(updates).map(([key, value]) => {
                    if (value === '' || value === null || value === undefined) return null

                    const field = fieldsToUse.find((f: EditableField) => f.key === key)
                    const fieldLabel = field?.label || key

                    return (
                      <tr key={key} className="border-t">
                        <td className="p-3 font-medium">{fieldLabel}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {typeof value === 'boolean'
                            ? value
                              ? 'Yes'
                              : 'No'
                            : Array.isArray(value)
                              ? value.join(', ')
                              : String(value)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm">
                <span className="font-semibold text-orange-800">Note:</span>
                <span className="text-orange-700 ml-1">
                  These changes will be permanently applied to your HubSpot content. Make sure you
                  have reviewed all changes before proceeding.
                </span>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => uploadFlow.reset()}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmChanges}
              disabled={isPublishing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UploadingModal
        isOpen={uploadFlow.showProgress}
        progress={uploadFlow.progress}
        currentStatus={uploadFlow.currentStatus}
        selectedCount={selectedRowCount}
      />

      {/* Old modal - to be removed */}
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Uploading to HubSpot</DialogTitle>
            <DialogDescription>
              Please wait while your changes are being uploaded to HubSpot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Uploading Changes to HubSpot</h3>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(uploadFlow.progress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadFlow.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <p className="text-sm text-muted-foreground">
                  Processing {selectedRowCount} {selectedRowCount === 1 ? 'item' : 'items'}...
                </p>
                <p className="text-sm text-muted-foreground">{uploadFlow.currentStatus}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UploadResultsModal
        isOpen={uploadFlow.showResults}
        onClose={() => {
          uploadFlow.closeResults()
          uploadFlow.reset()
          onClearSelection()
          refreshCurrentPage()
        }}
        onViewLogs={() => window.open('/reports-and-logs/logs', '_blank')}
        successCount={uploadFlow.uploadResults.success}
        failedCount={uploadFlow.uploadResults.failed}
        showViewLogs={true}
      />

      {/* Old modal - to be removed */}
      <Dialog open={false}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Results</DialogTitle>
            <DialogDescription>Review the results of your bulk upload operation.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>

              <h3 className="text-xl font-bold text-green-600 mb-2">Upload Complete!</h3>
              <p className="text-sm text-green-600 mb-6">
                All changes successfully applied to HubSpot
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {uploadFlow.uploadResults.success}
                  </div>
                  <div className="text-sm text-green-600">Items Successfully Updated</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {uploadFlow.uploadResults.failed}
                  </div>
                  <div className="text-sm text-red-600">Items Failed to Update</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" asChild>
                  <a href="/reports-and-logs/logs">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    View Detailed Logs
                  </a>
                </Button>
                <Button
                  onClick={() => {
                    uploadFlow.closeResults()
                    uploadFlow.reset()
                    // Clear selection after user closes the modal
                    onClearSelection()
                    refreshCurrentPage()
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
