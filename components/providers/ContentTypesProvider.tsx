'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { fetchContentTypes, clearContentTypesCache, type ContentType } from '@/lib/content-types'

interface ContentTypesContextType {
  contentTypes: ContentType[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  clearCache: () => void
}

const ContentTypesContext = createContext<ContentTypesContextType | undefined>(undefined)

interface ContentTypesProviderProps {
  children: ReactNode
}

export function ContentTypesProvider({ children }: ContentTypesProviderProps) {
  // Start with fallback content types immediately - no loading state
  const fallbackTypes = [
    {
      value: 'landing-pages',
      label: 'Landing Pages',
      description: 'Marketing landing pages',
      category: 'pages',
    },
    {
      value: 'site-pages',
      label: 'Website Pages',
      description: 'General website pages',
      category: 'pages',
    },
    {
      value: 'blog-posts',
      label: 'Blog Posts',
      description: 'Blog articles and posts',
      category: 'content',
    },
    { value: 'blogs', label: 'Blogs', description: 'Blog collections', category: 'content' },
    { value: 'tags', label: 'Tags', description: 'Content tags', category: 'organization' },
    {
      value: 'authors',
      label: 'Authors',
      description: 'Content authors',
      category: 'organization',
    },
    {
      value: 'url-redirects',
      label: 'URL Redirects',
      description: 'URL redirect rules',
      category: 'technical',
    },
    {
      value: 'hubdb-tables',
      label: 'HubDB Tables',
      description: 'Database tables',
      category: 'technical',
    },
  ]

  const [contentTypes, setContentTypes] = useState<ContentType[]>(fallbackTypes)
  const [loading, setLoading] = useState(false) // Start with false - no blocking
  const [error, setError] = useState<string | null>(null)

  const fetchTypes = async () => {
    setLoading(true)
    setError(null)

    try {
      const types = await fetchContentTypes()
      setContentTypes(types)
    } catch (err) {
      console.error('Error fetching content types:', err)
      // Keep fallback content types if API fails
      setError('Using fallback content types - API not available')
    } finally {
      setLoading(false)
    }
  }

  const clearCache = () => {
    clearContentTypesCache()
    setContentTypes([])
    setError(null)
  }

  useEffect(() => {
    // Fetch from API in background, but don't block UI
    // The UI already has fallback content types
    fetchTypes()
  }, [])

  return (
    <ContentTypesContext.Provider
      value={{
        contentTypes,
        loading,
        error,
        refetch: fetchTypes,
        clearCache,
      }}
    >
      {children}
    </ContentTypesContext.Provider>
  )
}

export function useContentTypesContext() {
  const context = useContext(ContentTypesContext)
  if (context === undefined) {
    throw new Error('useContentTypesContext must be used within a ContentTypesProvider')
  }
  return context
}
