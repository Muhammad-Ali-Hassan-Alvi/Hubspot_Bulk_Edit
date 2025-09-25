// Content types utility functions

export interface ContentTypeT {
  id: number
  name: string
  slug: string
}

// Global cache for content types - shared across all components
let globalContentTypesCache: { data: ContentTypeT[]; timestamp: number } | null = null
let globalContentTypesPromise: Promise<ContentTypeT[]> | null = null
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export async function fetchContentTypes(forceRefresh = false): Promise<ContentTypeT[]> {
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
      const response = await fetch(
        `${baseUrl}/api/hubspot/content-types?forceRefresh=${forceRefresh}`
      )

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'API returned unsuccessful response')
      }

      const contentTypes = data.data || []
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
