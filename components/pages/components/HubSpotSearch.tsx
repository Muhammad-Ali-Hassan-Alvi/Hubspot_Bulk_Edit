'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/use-debounce'

interface HubSpotContent {
  id: string
  name: string
  contentType: string
  [key: string]: any
}

interface HubSpotSearchProps {
  hubspotToken: string
  contentType?: string
  onSearchResults: (results: HubSpotContent[], total: number, searchTerm: string) => void
  onClearSearch: () => void
  isSearching: boolean
  setIsSearching: (searching: boolean) => void
}

export default function HubSpotSearch({
  hubspotToken,
  contentType = 'all',
  onSearchResults,
  onClearSearch,
  isSearching,
  setIsSearching,
}: HubSpotSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500) // 500ms delay
  const { toast } = useToast()

  // Function to perform search using HubSpot API
  const performSearch = useCallback(
    async (term: string) => {
      if (!term.trim() || !hubspotToken) {
        onClearSearch()
        return
      }

      setIsSearching(true)

      try {
        const response = await fetch('/api/hubspot/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hubspotToken,
            searchTerm: term.trim(),
            contentType,
            limit: 100,
          }),
        })

        const data = await response.json()

        if (data.success) {
          onSearchResults(data.content || [], data.total || 0, term.trim())

          if (data.content && data.content.length > 0) {
            toast({
              title: 'Search Results',
              description: `Found ${data.total} results for "${term}"`,
            })
          } else {
            toast({
              title: 'No Results',
              description: `No content found for "${term}"`,
            })
          }
        } else {
          toast({
            title: 'Search Failed',
            description: data.error || 'Failed to perform search',
            variant: 'destructive',
          })
          onClearSearch()
        }
      } catch (error) {
        console.error('Search error:', error)
        toast({
          title: 'Search Error',
          description: 'An error occurred while searching',
          variant: 'destructive',
        })
        onClearSearch()
      } finally {
        setIsSearching(false)
      }
    },
    [hubspotToken, contentType, onSearchResults, onClearSearch, setIsSearching, toast]
  )

  // Effect to trigger search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm) {
      performSearch(debouncedSearchTerm)
    } else {
      onClearSearch()
    }
  }, [debouncedSearchTerm, performSearch, onClearSearch])

  // Handle clear search
  const handleClearSearch = () => {
    setSearchTerm('')
    onClearSearch()
  }

  // Handle Enter key press
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && searchTerm.trim()) {
      performSearch(searchTerm.trim())
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
        <Input
          placeholder="Search HubSpot content..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-10 pr-10"
          disabled={isSearching}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {searchTerm && !isSearching && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {searchTerm && (
        <div className="mt-2 text-xs text-muted-foreground">
          {isSearching ? (
            <span>Searching for "{searchTerm}"...</span>
          ) : (
            <span>
              Searching across all {contentType === 'all' ? 'content types' : contentType}...
            </span>
          )}
        </div>
      )}
    </div>
  )
}
