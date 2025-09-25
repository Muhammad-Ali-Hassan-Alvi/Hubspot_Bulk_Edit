'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { fetchContentTypes, clearContentTypesCache, type ContentTypeT } from '@/lib/content-types'

interface ContentTypesContextType {
  contentTypes: ContentTypeT[]
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

  const [contentTypes, setContentTypes] = useState<ContentTypeT[]>([])
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
