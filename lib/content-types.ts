// Content types utility functions

export interface ContentType {
  value: string
  label: string
  description?: string
  isActive?: boolean
  sortOrder?: number
  category?: string
}

// Global cache for content types - shared across all components
let globalContentTypesCache: { data: ContentType[]; timestamp: number } | null = null
let globalContentTypesPromise: Promise<ContentType[]> | null = null
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export async function fetchContentTypes(forceRefresh = false): Promise<ContentType[]> {
  // If we already have a pending request, return that promise
  if (globalContentTypesPromise && !forceRefresh) {
    return globalContentTypesPromise
  }

  // Check cache first
  if (!forceRefresh && globalContentTypesCache) {
    const now = Date.now()
    if (now - globalContentTypesCache.timestamp < CACHE_DURATION) {
      return globalContentTypesCache.data
    }
  }

  // Create new promise for API call
  globalContentTypesPromise = (async () => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
      const response = await fetch(`${baseUrl}/api/content-types?forceRefresh=${forceRefresh}`)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'API returned unsuccessful response')
      }

      const contentTypes = data.contentTypes || []
      globalContentTypesCache = { data: contentTypes, timestamp: Date.now() }
      return contentTypes
    } catch (error) {
      console.error('Error fetching content types:', error)
      throw error // Don't fallback, let the error propagate
    } finally {
      globalContentTypesPromise = null // Clear the promise
    }
  })()

  return globalContentTypesPromise
}

export function clearContentTypesCache(): void {
  globalContentTypesCache = null
  globalContentTypesPromise = null
}

export function getContentTypesByCategory(
  contentTypes: ContentType[]
): Record<string, ContentType[]> {
  return contentTypes.reduce(
    (acc, type) => {
      const category = type.category || 'general'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(type)
      return acc
    },
    {} as Record<string, ContentType[]>
  )
}

export function getActiveContentTypes(contentTypes: ContentType[]): ContentType[] {
  return contentTypes.filter(type => type.isActive !== false)
}

export function sortContentTypes(contentTypes: ContentType[]): ContentType[] {
  return [...contentTypes].sort((a, b) => {
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return a.sortOrder - b.sortOrder
    }
    return a.label.localeCompare(b.label)
  })
}
