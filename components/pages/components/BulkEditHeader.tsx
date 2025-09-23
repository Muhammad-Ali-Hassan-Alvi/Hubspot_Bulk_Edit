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
import { ContentTypeT } from '@/lib/content-types'
import Link from 'next/link'

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
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStatus, setCurrentStatus] = useState('')
  const [uploadResults, setUploadResults] = useState({ success: 0, failed: 0 })
  const [dynamicFields, setDynamicFields] = useState<EditableField[]>([])
  const [loadingFields, setLoadingFields] = useState(false)
  const { toast } = useToast()

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

      if (data.success) {
        setDynamicFields(data.headers)
      } else {
        console.error('Failed to fetch headers:', data.error)
        toast({
          title: 'Error Loading Fields',
          description: 'Failed to load editable fields. Using fallback fields.',
          variant: 'destructive',
        })
        // No fallback - keep dynamic fields empty if API fails
        setDynamicFields([])
      }
    } catch (error) {
      console.error('Error fetching headers:', error)
      toast({
        title: 'Error Loading Fields',
        description: 'Failed to load editable fields.',
        variant: 'destructive',
      })
      // No fallback - keep dynamic fields empty if API fails
      setDynamicFields([])
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
    const combinedOptions: { [key: string]: string[] } = { ...hubspotDropdownOptions }

    // Add options from dynamic fields (headers API)
    dynamicFields.forEach(field => {
      if (field.options && field.options.length > 0) {
        combinedOptions[field.key] = [...field.options]
      }
    })

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

        const isArrayField = dynamicFields.some(
          field => field.key === fieldKey && field.type === 'array'
        )
        if (!isArrayField) {
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
        }

        const uniqueOptions = Array.from(values)
        if (uniqueOptions.length > 0) {
          combinedOptions[fieldKey] = uniqueOptions.sort((a, b) => a.localeCompare(b))
        }
      })
    }

    return combinedOptions
  }, [hubspotDropdownOptions, allContent, dynamicFields])

  // Use dynamic fields from database only
  const fieldsToUse = useMemo(() => {
    return dynamicFields
  }, [dynamicFields])

  useEffect(() => {
    setUpdates({})
  }, [fieldsToUse])

  const handleValueChange = (key: string, value: any) => {
    console.log('umar value', value)
    console.log('umar key', key)
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

    setShowConfirmation(true)
  }

  const handleConfirmChanges = () => {
    const finalUpdates = Object.entries(updates).reduce(
      (acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          acc[key] = value
        }
        return acc
      },
      {} as { [key: string]: any }
    )

    setShowConfirmation(false)
    setShowProgress(true)
    setProgress(0)
    setCurrentStatus('Initializing upload...')

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          setCurrentStatus('Upload completed!')
          setTimeout(() => {
            setShowProgress(false)
            onConfirm(finalUpdates)
            setUploadResults({ success: selectedRowCount, failed: 0 })
            setShowResults(true)
          }, 1000)
          return 100
        }

        const newProgress = prev + Math.random() * 15 + 5
        if (newProgress > 30 && prev <= 30) {
          setCurrentStatus('Processing items...')
        } else if (newProgress > 60 && prev <= 60) {
          setCurrentStatus('Applying updates...')
        } else if (newProgress > 90 && prev <= 90) {
          setCurrentStatus('Finalizing changes...')
        }

        return Math.min(newProgress, 100)
      })
    }, 200)
  }

  const renderField = (field: EditableField) => {
    const dynamicOptions = fieldOptions[field.key]
    const hasOptions = dynamicOptions && dynamicOptions.length > 0
    const isLoading = loadingAllDropdownOptions

    // Use the field type from database configuration
    const fieldType = field.type || 'string'

    switch (fieldType) {
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
      case 'dropdown':
        if (hasOptions) {
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
                  ) : (
                    dynamicOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )
        }
        // If no options available for select field, show as text input
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
      case 'datetime':
      case 'date':
        return (
          <div className="relative z-[30]">
            <DatePicker
              selected={updates[field.key] ? new Date(updates[field.key]) : null}
              onChange={(date: Date | null) => {
                if (date) {
                  // Set time to 00:00:00 and convert to ISO string format
                  date.setHours(0, 0, 0, 0)
                  const isoString = date.toISOString().replace(/\.\d{3}Z$/, 'Z')
                  handleValueChange(field.key, isoString)
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
        // For array fields, always show dropdown with all possible values from HubSpot
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
                    Loading options from HubSpot...
                  </SelectItem>
                ) : hasOptions ? (
                  dynamicOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-options" disabled>
                    No values found in HubSpot
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )
      case 'number':
      case 'integer':
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
      case 'string':
      case 'text':
      default:
        // For string/text fields, show text input
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
                disabled={loadingDropdownOptions}
                title="Refresh dropdown options from HubSpot"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingDropdownOptions ? 'animate-spin' : ''}`} />
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

          {/* {loadingDropdownOptions && (
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
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
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

                    const field = fieldsToUse.find(f => f.key === key)
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
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
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

      <Dialog open={showProgress} onOpenChange={() => {}}>
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
                  <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <p className="text-sm text-muted-foreground">
                  Processing {selectedRowCount} {selectedRowCount === 1 ? 'item' : 'items'}...
                </p>
                <p className="text-sm text-muted-foreground">{currentStatus}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showResults}>
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
                  <div className="text-2xl font-bold text-green-600">{uploadResults.success}</div>
                  <div className="text-sm text-green-600">Items Successfully Updated</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{uploadResults.failed}</div>
                  <div className="text-sm text-red-600">Items Failed to Update</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href="/reports-and-logs/logs">
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
                  </Link>
                </Button>
                <Button
                  onClick={() => {
                    setShowResults(false)
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
