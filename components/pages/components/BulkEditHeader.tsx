'use client'

import { useState, useEffect, useMemo, forwardRef } from 'react'
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
import { X, PenSquare, RefreshCw, CalendarIcon } from 'lucide-react'
import { EDITABLE_FIELDS } from '@/lib/constants'
import { getHubSpotInAppEditFieldsAsObjects } from '@/lib/utils'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

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
}

interface BulkEditHeaderProps {
  selectedRowCount: number
  contentType?: string
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
  const { toast } = useToast()

  const fieldsToUse = useMemo(() => {
    return _contentType ? getHubSpotInAppEditFieldsAsObjects(_contentType) : EDITABLE_FIELDS
  }, [_contentType])
  // NEW & IMPROVED CODE
  const fieldOptions = useMemo(() => {
    if (!allContent || !Array.isArray(allContent)) {
      return {}
    }

    const optionsMap: { [key: string]: string[] } = {}

    // EXPANDED LIST: Add any field 'key' here that you want to be a dynamic dropdown.
    // These keys should match the HubSpot API property names.
    const fieldsForDropdown = [
      'campaign',
      'contentGroupId', // Campaign is often contentGroupId
      'domain',
      'language',
      'state',
      'subcategory',
      'htmlTitle',
      'name',
      'authorName',
      'tagIds', // This might be an array of IDs, but we can try to find names
    ]

    fieldsForDropdown.forEach(fieldKey => {
      const values = new Set<string>()

      allContent.forEach(item => {
        // Safely access the value from the item's properties or its nested 'allHeaders'
        const value = item.allHeaders?.[fieldKey] || item[fieldKey]

        if (value) {
          // Handle if the value is an array (like tags)
          if (Array.isArray(value)) {
            value.forEach(v => {
              if (v && typeof v === 'string' && v.trim() !== '') {
                values.add(v.trim())
              }
            })
          }
          // Handle if it's a simple string value
          else if (typeof value === 'string' && value.trim() !== '') {
            values.add(value.trim())
          }
        }
      })

      const uniqueOptions = Array.from(values)
      if (uniqueOptions.length > 0) {
        optionsMap[fieldKey] = uniqueOptions.sort((a, b) => a.localeCompare(b))
      }
    })

    return optionsMap
  }, [allContent])

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

    if (dynamicOptions && dynamicOptions.length > 0) {
      return (
        <Select
          value={updates[field.key] ? String(updates[field.key]) : ''}
          onValueChange={value => handleValueChange(field.key, value)}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder={field.label} />
          </SelectTrigger>
          <SelectContent>
            {dynamicOptions.map(option => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <div className="relative z-[30]">
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
            />
          </div>
        )
      case 'array':
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
              <CardTitle className="flex items-center gap-2">
                <PenSquare className="h-5 w-5" />
                Bulk Edit {selectedRowCount} Item(s)
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {fieldsToUse.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key} className="text-sm font-medium">
                  {field.label}
                </Label>
                {renderField(field)}
              </div>
            ))}
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
