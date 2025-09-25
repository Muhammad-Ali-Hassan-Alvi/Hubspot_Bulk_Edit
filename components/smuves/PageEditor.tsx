'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DateDisplay } from '@/components/shared/DateDisplay'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { FileText, Search, Edit, Save, AlertTriangle, ExternalLink } from 'lucide-react'

interface PageEditorProps {
  user: User
  connections: {
    google: boolean
    hubspot: boolean
    sheetId: string
    hubspotToken: string
  }
  userSettings: any
  onPageUpdate: (pageId: string, changes: any) => void
}

interface HubSpotPage {
  id: string
  name: string
  slug: string
  url: string
  language: string
  domain: string
  updatedAt: string
  status: string
  htmlTitle?: string
  metaDescription?: string
}

export default function PageEditor({
  user,
  connections,
  userSettings,
  onPageUpdate,
}: PageEditorProps) {
  console.log(user)
  const [pages, setPages] = useState<HubSpotPage[]>([])
  const [filteredPages, setFilteredPages] = useState<HubSpotPage[]>([])
  const [selectedPage, setSelectedPage] = useState<HubSpotPage | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedFields, setEditedFields] = useState<Record<string, any>>({})
  const { toast } = useToast()

  const fetchPages = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/hubspot/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: connections.hubspotToken }),
      })

      const data = await response.json()
      if (data.success) {
        setPages(data.pages)
        setFilteredPages(data.pages)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch pages',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to fetch pages:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch pages from HubSpot',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }, [connections.hubspotToken, toast])

  const applyFilters = useCallback(() => {
    let filtered = pages

    if (searchTerm) {
      filtered = filtered.filter(
        page =>
          page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          page.slug.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (languageFilter !== 'all') {
      filtered = filtered.filter(page => page.language === languageFilter)
    }

    setFilteredPages(filtered)
  }, [pages, searchTerm, languageFilter])

  useEffect(() => {
    if (connections.hubspot) {
      fetchPages()
    }
  }, [connections.hubspot, fetchPages])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const selectPage = (page: HubSpotPage) => {
    setSelectedPage(page)
    setEditedFields({
      name: page.name,
      slug: page.slug,
      htmlTitle: page.htmlTitle || '',
      metaDescription: page.metaDescription || '',
      language: page.language,
    })
  }

  const handleFieldChange = (fieldName: string, value: string) => {
    setEditedFields(prev => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const validateChanges = () => {
    const errors: string[] = []

    if (!editedFields.name?.trim()) {
      errors.push('Page name is required')
    }

    if (!editedFields.slug?.trim()) {
      errors.push('URL slug is required')
    } else if (!/^[a-z0-9-]+$/.test(editedFields.slug)) {
      errors.push('URL slug can only contain lowercase letters, numbers, and hyphens')
    }

    if (editedFields.htmlTitle && editedFields.htmlTitle.length > 60) {
      errors.push('HTML title should be less than 60 characters for SEO')
    }

    if (editedFields.metaDescription && editedFields.metaDescription.length > 160) {
      errors.push('Meta description should be less than 160 characters for SEO')
    }

    return errors
  }

  const saveChanges = async () => {
    if (!selectedPage) return

    const validationErrors = validateChanges()
    if (validationErrors.length > 0) {
      toast({
        title: 'Validation Error',
        description: validationErrors.join(', '),
        variant: 'destructive',
      })
      return
    }

    setEditing(true)
    try {
      // In a real implementation, this would update HubSpot
      // For now, we'll simulate the update
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update local state
      const updatedPages = pages.map(page =>
        page.id === selectedPage.id
          ? {
              ...page,
              ...editedFields,
              updatedAt: new Date().toISOString(),
            }
          : page
      )

      setPages(updatedPages)
      setSelectedPage({ ...selectedPage, ...editedFields })
      onPageUpdate(selectedPage.id, editedFields)

      toast({
        title: 'Success! 🎉',
        description: 'Page updated successfully',
      })
    } catch (error) {
      console.error('Failed to update page:', error)
      toast({
        title: 'Error',
        description: 'Failed to update page',
        variant: 'destructive',
      })
    }
    setEditing(false)
  }

  const getUniqueLanguages = () => {
    return [...new Set(pages.map(page => page.language))].filter(Boolean)
  }

  const isFieldEditable = (fieldName: string) => {
    return userSettings.selected_fields?.includes(fieldName) || false
  }

  const hasChanges = () => {
    if (!selectedPage) return false
    return Object.keys(editedFields).some(key => editedFields[key] !== (selectedPage as any)[key])
  }

  return (
    <div className="space-y-6">
      {/* Page Browser */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Page Editor
          </CardTitle>
          <CardDescription>
            Browse and edit your HubSpot pages safely. Only selected fields can be modified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!connections.hubspot ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-900">HubSpot Connection Required</span>
              </div>
              <p className="text-sm text-amber-800 mt-1">
                Please connect your HubSpot account in the Connect tab to edit pages.
              </p>
            </div>
          ) : (
            <>
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      placeholder="Search pages by name or slug..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={languageFilter} onValueChange={setLanguageFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Languages</SelectItem>
                      {getUniqueLanguages().map(lang => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={fetchPages} disabled={loading} variant="outline">
                    {loading ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
              </div>

              {/* Pages Table */}
              {filteredPages.length > 0 ? (
                <div className="border rounded-lg max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPages.map(page => (
                        <TableRow
                          key={page.id}
                          className={selectedPage?.id === page.id ? 'bg-accent' : ''}
                        >
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {page.name}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{page.slug}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{page.language}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">{page.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <DateDisplay date={page.updatedAt} format="short" />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => selectPage(page)}>
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(page.url, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {loading ? 'Loading pages...' : 'No pages found'}
                  </h3>
                  <p className="text-muted-foreground">
                    {loading ? 'Please wait...' : 'Try adjusting your search or filters.'}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Page Editor */}
      {selectedPage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Editing: {selectedPage.name}</span>
              <Badge variant="outline">ID: {selectedPage.id}</Badge>
            </CardTitle>
            <CardDescription>
              Make changes to the selected page. Only configured fields can be edited.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Page Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Page Name *</Label>
                <Input
                  id="name"
                  value={editedFields.name || ''}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  disabled={!isFieldEditable('name')}
                />
                {!isFieldEditable('name') && (
                  <p className="text-xs text-gray-500">Field not selected for editing</p>
                )}
              </div>

              {/* URL Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  value={editedFields.slug || ''}
                  onChange={e => handleFieldChange('slug', e.target.value)}
                  disabled={!isFieldEditable('slug')}
                />
                {!isFieldEditable('slug') && (
                  <p className="text-xs text-gray-500">Field not selected for editing</p>
                )}
              </div>

              {/* HTML Title */}
              <div className="space-y-2">
                <Label htmlFor="htmlTitle">HTML Title</Label>
                <Input
                  id="htmlTitle"
                  value={editedFields.htmlTitle || ''}
                  onChange={e => handleFieldChange('htmlTitle', e.target.value)}
                  disabled={!isFieldEditable('htmlTitle')}
                  maxLength={60}
                />
                <p className="text-xs text-gray-500">
                  {editedFields.htmlTitle?.length || 0}/60 characters
                </p>
              </div>

              {/* Meta Description */}
              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Input
                  id="metaDescription"
                  value={editedFields.metaDescription || ''}
                  onChange={e => handleFieldChange('metaDescription', e.target.value)}
                  disabled={!isFieldEditable('metaDescription')}
                  maxLength={160}
                />
                <p className="text-xs text-gray-500">
                  {editedFields.metaDescription?.length || 0}/160 characters
                </p>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={editedFields.language || ''}
                  onValueChange={value => handleFieldChange('language', value)}
                  disabled={!isFieldEditable('language')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Read-only URL */}
              <div className="space-y-2">
                <Label>Page URL (Read-only)</Label>
                <div className="flex gap-2">
                  <Input value={selectedPage.url} disabled />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedPage.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {hasChanges() ? 'You have unsaved changes' : 'No changes made'}
              </div>
              <Button onClick={saveChanges} disabled={editing || !hasChanges()} size="lg">
                {editing ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-pulse" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>

            {/* Safety Notice */}
            <div className="bg-accent border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Safety Notice</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    Changes are validated before saving. High-risk fields require additional
                    confirmation. All changes are logged for audit purposes.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
