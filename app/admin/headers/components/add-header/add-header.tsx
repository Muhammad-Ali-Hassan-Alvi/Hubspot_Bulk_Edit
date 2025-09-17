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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Plus } from 'lucide-react'

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

interface AddHeaderProps {
  data: HeaderConfig[]
  setData: (data: HeaderConfig[]) => void
  setFilteredData: (data: HeaderConfig[]) => void
  checkForChanges: (data: HeaderConfig[]) => void
}

const AddHeader = ({ data, setData, setFilteredData, checkForChanges }: AddHeaderProps) => {
  const { toast } = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newHeader, setNewHeader] = useState<Partial<HeaderConfig>>({
    header: '',
    displayName: '',
    headerType: 'string',
    category: 'Additional',
    filters: false,
    read_only: false,
    in_app_edit: false,
    contentTypes: {
      'site-pages': false,
      'landing-pages': false,
      'blog-posts': false,
      blogs: false,
      tags: false,
      authors: false,
      'url-redirects': false,
      'hubdb-tables': false,
    },
  })

  // Helper function to validate camelCase
  const isValidCamelCase = (str: string): boolean => {
    return /^[a-z][a-zA-Z0-9]*$/.test(str) && !str.includes(' ')
  }

  const handleAddHeader = () => {
    alert('This header is not saving in DB, Please use the API to add it')
    // Validate required fields
    if (!newHeader.header || !newHeader.displayName) {
      toast({
        title: 'Validation Error',
        description: 'API Name and Display Name are required',
        variant: 'destructive',
      })
      return
    }

    if (!isValidCamelCase(newHeader.header)) {
      toast({
        title: 'Validation Error',
        description: 'API Name must be in camelCase format (e.g., myHeaderName)',
        variant: 'destructive',
      })
      return
    }

    // Check if header already exists
    if (data.some(item => item.header === newHeader.header)) {
      toast({
        title: 'Validation Error',
        description: 'A header with this API Name already exists',
        variant: 'destructive',
      })
      return
    }

    const newRow: HeaderConfig = {
      ...newHeader,
      lastUpdated: null, // Will be set by database when saved
    } as HeaderConfig

    const newData = [...data, newRow]
    setData(newData)
    setFilteredData(newData)
    checkForChanges(newData)

    // Reset modal state
    setNewHeader({
      header: '',
      displayName: '',
      headerType: 'string',
      category: 'Additional',
      filters: false,
      read_only: false,
      in_app_edit: false,
      contentTypes: {
        'site-pages': false,
        'landing-pages': false,
        'blog-posts': false,
        blogs: false,
        tags: false,
        authors: false,
        'url-redirects': false,
        'hubdb-tables': false,
      },
    })
    setIsModalOpen(false)

    toast({
      title: 'Success',
      description: 'New header added successfully!',
    })
  }

  const resetModal = () => {
    setNewHeader({
      header: '',
      displayName: '',
      headerType: 'string',
      category: 'Additional',
      filters: false,
      read_only: false,
      in_app_edit: false,
      contentTypes: {
        'site-pages': false,
        'landing-pages': false,
        'blog-posts': false,
        blogs: false,
        tags: false,
        authors: false,
        'url-redirects': false,
        'hubdb-tables': false,
      },
    })
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add New Header
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Header</DialogTitle>
          <DialogDescription>
            Create a new header configuration with all required fields and settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Header's Definition */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Header's Definition</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apiName">API Name *</Label>
                <Input
                  id="apiName"
                  placeholder="myHeaderName"
                  value={newHeader.header || ''}
                  onChange={e => {
                    const value = e.target.value
                    setNewHeader(prev => ({ ...prev, header: value }))
                  }}
                  className={
                    !isValidCamelCase(newHeader.header || '') && newHeader.header
                      ? 'border-red-500'
                      : ''
                  }
                />
                {newHeader.header && !isValidCamelCase(newHeader.header) && (
                  <p className="text-sm text-red-500">
                    Must be in camelCase format (e.g., myHeaderName)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  placeholder="My Header Name"
                  value={newHeader.displayName || ''}
                  onChange={e => setNewHeader(prev => ({ ...prev, displayName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="headerType">Header Type</Label>
                <Select
                  value={newHeader.headerType || 'string'}
                  onValueChange={value => setNewHeader(prev => ({ ...prev, headerType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select header type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="array">Array</SelectItem>
                    <SelectItem value="object">Object</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Configurations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configurations</h3>

            {/* Content Types - Always visible */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Content Types *</Label>
              <p className="text-sm text-muted-foreground">
                Select which content types this header should be available for:
              </p>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(newHeader.contentTypes || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`content-${key}`}
                      checked={value}
                      onCheckedChange={checked =>
                        setNewHeader(prev => ({
                          ...prev,
                          contentTypes: {
                            ...prev.contentTypes,
                            [key]: checked,
                          },
                        }))
                      }
                    />
                    <Label htmlFor={`content-${key}`} className="text-sm">
                      {key
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Category - Only show if at least one content type is selected */}
            {Object.values(newHeader.contentTypes || {}).some(Boolean) && (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newHeader.category || 'Additional'}
                  onValueChange={value => setNewHeader(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Required">Required</SelectItem>
                    <SelectItem value="Recommended">Recommended</SelectItem>
                    <SelectItem value="Additional">Additional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Settings - Only show if at least one content type is selected */}
            {Object.values(newHeader.contentTypes || {}).some(Boolean) && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">Settings</Label>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filters"
                      checked={newHeader.filters || false}
                      onCheckedChange={checked =>
                        setNewHeader(prev => ({ ...prev, filters: checked }))
                      }
                    />
                    <Label htmlFor="filters" className="text-sm">
                      Enable Filters
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="readOnly"
                      checked={newHeader.read_only || false}
                      onCheckedChange={checked =>
                        setNewHeader(prev => ({ ...prev, read_only: checked }))
                      }
                    />
                    <Label htmlFor="readOnly" className="text-sm">
                      Read Only
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="inAppEdit"
                      checked={newHeader.in_app_edit || false}
                      onCheckedChange={checked =>
                        setNewHeader(prev => ({ ...prev, in_app_edit: checked }))
                      }
                    />
                    <Label htmlFor="inAppEdit" className="text-sm">
                      In App Edit
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetModal()
              setIsModalOpen(false)
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleAddHeader}>Add Header</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddHeader
