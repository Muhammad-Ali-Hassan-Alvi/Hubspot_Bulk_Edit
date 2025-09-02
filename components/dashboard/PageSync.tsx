'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Download, Filter, RefreshCw } from 'lucide-react'

interface PageSyncProps {
  userId: string
  sheetId: string
  hubspotToken: string
  onSyncComplete: () => void
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
}

export default function PageSync({ userId, sheetId, hubspotToken, onSyncComplete }: PageSyncProps) {
  const [pages, setPages] = useState<HubSpotPage[]>([])
  const [filteredPages, setFilteredPages] = useState<HubSpotPage[]>([])
  const [languageFilter, setLanguageFilter] = useState('all')
  const [domainFilter, setDomainFilter] = useState('all')
  const [tabName, setTabName] = useState('HubSpot Pages')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const { toast } = useToast()

  const applyFilters = useCallback(() => {
    let filtered = pages

    if (languageFilter !== 'all') {
      filtered = filtered.filter(page => page.language === languageFilter)
    }

    if (domainFilter !== 'all') {
      filtered = filtered.filter(page => page.domain.includes(domainFilter))
    }

    setFilteredPages(filtered)

    // Only show toast if user manually clicked apply filters
    if (pages.length > 0) {
      console.log(`Filtered: ${filtered.length} of ${pages.length} pages`)
    }
  }, [pages, languageFilter, domainFilter])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const fetchPages = async () => {
    setLoading(true)
    try {
      console.log('Fetching pages from HubSpot...')

      const response = await fetch('/api/hubspot/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: hubspotToken }),
      })

      const data = await response.json()
      console.log('Pages fetch result:', data)

      if (data.success) {
        setPages(data.pages)
        setFilteredPages(data.pages)
        toast({
          title: 'Success! 🎉',
          description: `Fetched ${data.pages.length} published pages from HubSpot`,
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch pages',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Fetch pages error:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch pages from HubSpot',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const syncToSheet = async () => {
    if (filteredPages.length === 0) {
      toast({
        title: 'Error',
        description: 'No pages to sync. Please fetch pages first.',
        variant: 'destructive',
      })
      return
    }

    if (!sheetId) {
      toast({
        title: 'Error',
        description: 'Please select a Google Sheet first.',
        variant: 'destructive',
      })
      return
    }

    setSyncing(true)
    try {
      console.log('Syncing to Google Sheets...')

      const response = await fetch('/api/google/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetId,
          tabName,
          pages: filteredPages,
          userId,
          filters: {
            language: languageFilter,
            domain: domainFilter,
          },
        }),
      })

      const data = await response.json()
      console.log('Sync result:', data)

      if (data.success) {
        toast({
          title: 'Success! 🎉',
          description: `Synced ${data.rowsWritten} pages to Google Sheets`,
        })
        onSyncComplete()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to sync to Google Sheets',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast({
        title: 'Error',
        description: 'Failed to sync to Google Sheets',
        variant: 'destructive',
      })
    }
    setSyncing(false)
  }

  const getUniqueLanguages = () => {
    return [...new Set(pages.map(page => page.language))].filter(Boolean)
  }

  const getUniqueDomains = () => {
    return [...new Set(pages.map(page => page.domain))].filter(Boolean)
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          HubSpot Page Sync
        </CardTitle>
        <CardDescription>
          Fetch published pages from HubSpot and sync them to Google Sheets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Fetch Pages Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Step 1: Fetch Pages</h3>
            <Badge variant="outline">{pages.length} pages loaded</Badge>
          </div>

          <Button
            onClick={fetchPages}
            disabled={loading || !hubspotToken}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Fetching Pages...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Fetch Published Pages from HubSpot
              </>
            )}
          </Button>

          {!hubspotToken && (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              ⚠️ Please connect your HubSpot account first
            </p>
          )}
        </div>

        {pages.length > 0 && (
          <>
            {/* Filters Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Step 2: Apply Filters</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Language Filter</Label>
                  <Select value={languageFilter} onValueChange={setLanguageFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All languages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All languages ({pages.length})</SelectItem>
                      {getUniqueLanguages().map(lang => (
                        <SelectItem key={lang} value={lang}>
                          {lang} ({pages.filter(p => p.language === lang).length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Domain Filter</Label>
                  <Select value={domainFilter} onValueChange={setDomainFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All domains" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All domains ({pages.length})</SelectItem>
                      {getUniqueDomains().map(domain => (
                        <SelectItem key={domain} value={domain}>
                          {domain} ({pages.filter(p => p.domain.includes(domain)).length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sheet Tab Name</Label>
                  <Input
                    value={tabName}
                    onChange={e => setTabName(e.target.value)}
                    placeholder="Sheet tab name"
                  />
                </div>
              </div>

              <div className="bg-accent border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    Filters Applied: {filteredPages.length} of {pages.length} pages selected
                  </span>
                  {(languageFilter !== 'all' || domainFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLanguageFilter('all')
                        setDomainFilter('all')
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
                {languageFilter !== 'all' && (
                  <div className="text-xs text-blue-700 mt-1">Language: {languageFilter}</div>
                )}
                {domainFilter !== 'all' && (
                  <div className="text-xs text-blue-700 mt-1">Domain: {domainFilter}</div>
                )}
              </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Step 3: Preview What Will Be Synced</h3>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {filteredPages.length} pages ready to sync
                </Badge>
              </div>

              {filteredPages.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <p className="text-gray-500">No pages match your current filters</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Try adjusting your language or domain filters
                  </p>
                </div>
              ) : (
                <>
                  <div className="border rounded-lg max-h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Language</TableHead>
                          <TableHead>Domain</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead>Last Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPages.slice(0, 20).map(page => (
                          <TableRow key={page.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {page.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{page.language}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {page.domain}
                            </TableCell>
                            <TableCell className="text-sm font-mono">{page.slug}</TableCell>
                            <TableCell className="text-sm">
                              {new Date(page.updatedAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {filteredPages.length > 20 && (
                    <div className="bg-popover p-3 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">
                        Showing first 20 of <strong>{filteredPages.length}</strong> pages. All{' '}
                        <strong>{filteredPages.length}</strong> will be synced to Google Sheets.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sync Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 4: Sync to Google Sheets</h3>

              <Button
                onClick={syncToSheet}
                disabled={syncing || filteredPages.length === 0 || !sheetId}
                className="w-full"
                size="lg"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing to Google Sheets...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Sync {filteredPages.length} Pages to Google Sheets
                  </>
                )}
              </Button>

              {!sheetId && (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  ⚠️ Please select a Google Sheet first
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
