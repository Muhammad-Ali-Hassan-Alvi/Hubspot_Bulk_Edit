import { type NextRequest, NextResponse } from 'next/server'
import { isHeaderReadOnly, getHeaderInfo } from '@/lib/utils'
import { getCombinedInAppEditFields } from '@/lib/utils'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { getHubSpotAuthHeaders } from '@/lib/hubspot-auth'

// Cache for content types
const contentTypesCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

async function fetchContentTypes(): Promise<any[]> {
  try {
    const cacheKey = 'content-types-global'
    const cached = contentTypesCache.get(cacheKey)
    const now = Date.now()

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    // Fetch from our content types API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/hubspot/content-types`)

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        contentTypesCache.set(cacheKey, { data: data.contentTypes, timestamp: now })
        return data.contentTypes
      }
    }

    // No fallback - let the error propagate
    throw new Error('Failed to fetch content types from API')
  } catch (error) {
    console.error('Error fetching content types:', error)
    throw error
  }
}

const ENDPOINT_MAP = {
  'landing-pages': {
    name: 'Landing Pages',
    url: 'https://api.hubapi.com/cms/v3/pages/landing-pages',
    key: 'results',
    type: 'Landing Page',
  },
  'site-pages': {
    name: 'Site Pages',
    url: 'https://api.hubapi.com/cms/v3/pages/site-pages',
    key: 'results',
    type: 'Site Page',
  },
  'blog-posts': {
    name: 'Blog Posts',
    url: 'https://api.hubapi.com/cms/v3/blogs/posts',
    key: 'results',
    type: 'Blog Post',
  },
  blogs: {
    name: 'Blogs',
    url: 'https://api.hubapi.com/cms/v3/blog-settings/settings',
    key: 'results',
    type: 'Blog',
  },
  tags: {
    name: 'Tags',
    url: 'https://api.hubapi.com/cms/v3/blogs/tags',
    key: 'results',
    type: 'Tag',
  },
  authors: {
    name: 'Authors',
    url: 'https://api.hubapi.com/cms/v3/blogs/authors',
    key: 'results',
    type: 'Author',
  },
  'url-redirects': {
    name: 'URL Redirects',
    url: 'https://api.hubapi.com/cms/v3/url-redirects',
    key: 'results',
    type: 'URL Redirect',
  },
  'hubdb-tables': {
    name: 'HubDB Tables',
    url: 'https://api.hubapi.com/cms/v3/hubdb/tables',
    key: 'results',
    type: 'HubDB Table',
  },
}

const normalizeItem = (item: any, endpointType: string) => {
  const inAppEditHeaders: { [key: string]: any } = {}
  const exportHeaders: { [key: string]: any } = {}
  const readOnlyHeaders: { [key: string]: any } = {}
  const headerInfo: { [key: string]: any } = {}

  // Get the HubSpot content type for this endpoint
  const hubSpotContentType = endpointType

  // Get combined in-app edit fields for this content type
  const combinedInAppEditFields = getCombinedInAppEditFields(hubSpotContentType)

  exportHeaders.id = String(item.id)
  exportHeaders.contentType = endpointType
  exportHeaders.createdAt = new Date(item.created || item.createdAt || Date.now()).toISOString()
  exportHeaders.updatedAt = new Date(item.updated || item.updatedAt || Date.now()).toISOString()

  // Only add content-type specific fields if they exist in the original data
  if (item.name || item.title) {
    exportHeaders.name = item.name || item.title
  }
  if (item.slug) {
    exportHeaders.slug = item.slug
  }
  if (item.absoluteUrl || item.url) {
    exportHeaders.url = item.absoluteUrl || item.url
  }
  if (item.htmlTitle) {
    exportHeaders.htmlTitle = item.htmlTitle
  }
  if (item.metaDescription) {
    exportHeaders.metaDescription = item.metaDescription
  }
  if (item.authorName || item.blogAuthor) {
    exportHeaders.authorName =
      item.authorName || (item.blogAuthor ? item.blogAuthor.displayName : '')
  }

  Object.keys(item).forEach(key => {
    const value = item[key]

    // Check if this field is in-app editable using the new header system
    const isInAppEdit = combinedInAppEditFields.has(key)
    const isReadOnly = isHeaderReadOnly(key, hubSpotContentType)

    // Get header information for this field
    const headerInfoForField = getHeaderInfo(key, hubSpotContentType)

    if (headerInfoForField) {
      headerInfo[key] = {
        category: headerInfoForField.category,
        isReadOnly: headerInfoForField.isReadOnly,
        dataType: headerInfoForField.dataType,
        inAppEdit: headerInfoForField.inAppEdit,
      }
    }

    if (isInAppEdit) {
      inAppEditHeaders[key] = value
    } else if (isReadOnly) {
      readOnlyHeaders[key] = value
    }

    if (!exportHeaders.hasOwnProperty(key)) {
      exportHeaders[key] = value
    }
  })

  const allHeaders = { ...exportHeaders, ...inAppEditHeaders, ...readOnlyHeaders }
  return {
    ...item,
    id: String(item.id),
    allHeaders,
    exportHeaders,
    inAppEditHeaders,
    readOnlyHeaders,
    headerInfo,
    contentType: hubSpotContentType,
  }
}

async function fetchAllFromEndpoint(
  endpointUrl: string,
  headers: HeadersInit,
  resultsKey: string
): Promise<any[]> {
  const allResults: any[] = []
  let after: string | null = null
  const originalUrl = new URL(endpointUrl)

  do {
    const requestUrl = new URL(originalUrl.toString())
    requestUrl.searchParams.set('limit', '100')
    if (after) {
      requestUrl.searchParams.set('after', after)
    }
    const response = await fetch(requestUrl.toString(), { headers })
    if (!response.ok) {
      console.error(`HubSpot API error for ${endpointUrl}: ${response.status}`)
      break
    }
    const data = await response.json()
    if (data[resultsKey] && data[resultsKey].length > 0) {
      allResults.push(...data[resultsKey])
    }
    after = data.paging?.next?.after || null
  } while (after)
  return allResults
}

export async function POST(request: NextRequest) {
  try {
    const { contentType = 'landing-pages', limit = 100, after = null } = await request.json()

    // Get authenticated user and refresh HubSpot token if needed
    const user = await getAuthenticatedUser()
    const headers = await getHubSpotAuthHeaders(user.id)

    if (contentType === 'all-pages') {
      // Fetch dynamic content types
      const contentTypes = await fetchContentTypes()
      const typesToAggregate = contentTypes.map(type => type.value)
      const fetchPromises = typesToAggregate.map(type => {
        const endpoint = ENDPOINT_MAP[type as keyof typeof ENDPOINT_MAP]
        return fetchAllFromEndpoint(endpoint.url, headers, endpoint.key).then(items => {
          return items.map(item => normalizeItem(item, endpoint.type))
        })
      })
      const resultsArrays = await Promise.all(fetchPromises)
      const allContent = resultsArrays.flat()
      allContent.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      const total = allContent.length
      const offset = after ? parseInt(after as string, 10) : 0
      const paginatedContent = allContent.slice(offset, offset + limit)
      const nextOffset = offset + limit
      const newPaging = nextOffset < total ? { next: { after: String(nextOffset) } } : null

      return NextResponse.json({
        success: true,
        content: paginatedContent,
        total,
        paging: newPaging,
      })
    }

    const endpoint = ENDPOINT_MAP[contentType as keyof typeof ENDPOINT_MAP]
    if (!endpoint) {
      return NextResponse.json({ success: false, error: 'Invalid content type.' }, { status: 400 })
    }

    const url = new URL(endpoint.url)
    url.searchParams.set('limit', String(limit))
    if (after) {
      url.searchParams.set('after', String(after))
    }

    const res = await fetch(url.toString(), { headers })

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Requested data could not be found in HubSpot.`,
        },
        { status: res.status }
      )
    }

    const data = await res.json()
    const contentItems = data[endpoint.key] || []
    const mappedContent = contentItems.map((item: any) => normalizeItem(item, endpoint.type))

    // Debug: Log the first few items to see their IDs and content types
    console.log(
      'Fetched content sample:',
      mappedContent.slice(0, 3).map((item: any) => ({
        id: item.id,
        name: item.name,
        contentType: item.contentType,
        url: item.url,
      }))
    )

    return NextResponse.json({
      success: true,
      content: mappedContent,
      total: data.total,
      paging: data.paging,
    })
  } catch (error) {
    console.error('Content fetch API error:', error)

    // Handle specific token-related errors
    if (error instanceof Error) {
      if (
        error.message.includes('HubSpot not connected') ||
        error.message.includes('Token refresh failed')
      ) {
        return NextResponse.json({ success: false, error: error.message }, { status: 401 })
      }
    }

    return NextResponse.json(
      { success: false, error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
