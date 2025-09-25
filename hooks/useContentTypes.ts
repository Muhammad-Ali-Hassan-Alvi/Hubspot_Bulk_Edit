import { useContentTypesContext } from '@/components/providers/ContentTypesProvider'
import type { ContentTypeT } from '@/lib/content-types'

interface UseContentTypesOptions {
  forceRefresh?: boolean
  autoFetch?: boolean
}

interface UseContentTypesReturn {
  contentTypes: ContentTypeT[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  clearCache: () => void
}

export function useContentTypes(_options: UseContentTypesOptions = {}): UseContentTypesReturn {
  // Use the context provider instead of making individual API calls
  const context = useContentTypesContext()

  return {
    contentTypes: context.contentTypes,
    loading: context.loading,
    error: context.error,
    refetch: context.refetch,
    clearCache: context.clearCache,
  }
}

// Hook for getting content types as dropdown options
export function useContentTypesOptions(hookOptions: UseContentTypesOptions = {}) {
  const { contentTypes, loading, error, refetch, clearCache } = useContentTypes(hookOptions)

  const options = contentTypes.map(type => ({
    id: type.id,
    name: type.name,
    slug: type.slug,
  }))

  return {
    options,
    loading,
    error,
    refetch,
    clearCache,
  }
}
