import { type NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { getHubSpotAuthHeaders } from '@/lib/hubspot-auth'

export async function POST(request: NextRequest) {
  try {
    const { searchTerm, contentType = 'all', limit = 100, after = null } = await request.json()

    if (!searchTerm || typeof searchTerm !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Search term is required' },
        { status: 400 }
      )
    }

    // Get authenticated user and refresh HubSpot token if needed
    const user = await getAuthenticatedUser()
    const headers = await getHubSpotAuthHeaders(user.id)

    // Map content types to HubSpot API endpoints
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

    // Normalize item function (same as in pages route)
    const normalizeItem = (item: any, endpointType: string) => {
      const inAppEditHeaders: { [key: string]: any } = {}
      const exportHeaders: { [key: string]: any } = {}
      const readOnlyHeaders: { [key: string]: any } = {}
      const headerInfo: { [key: string]: any } = {}

      // Get the HubSpot content type for this endpoint
      const hubSpotContentType = endpointType

      exportHeaders.id = String(item.id)
      exportHeaders.name = item.name || item.title || 'Untitled'
      exportHeaders.slug = item.slug || ''
      exportHeaders.url = item.absoluteUrl || item.url || ''
      exportHeaders.htmlTitle = item.htmlTitle || ''
      exportHeaders.metaDescription = item.metaDescription || ''
      exportHeaders.createdAt = new Date(item.created || item.createdAt || Date.now()).toISOString()
      exportHeaders.updatedAt = new Date(item.updated || item.updatedAt || Date.now()).toISOString()
      exportHeaders.contentType = endpointType
      exportHeaders.authorName =
        item.authorName || (item.blogAuthor ? item.blogAuthor.displayName : '')

      Object.keys(item).forEach(key => {
        const value = item[key]

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

    // Function to search a specific endpoint
    const searchEndpoint = async (endpoint: any) => {
      const url = new URL(endpoint.url)
      url.searchParams.set('limit', String(limit))
      url.searchParams.set('search', searchTerm)
      if (after) {
        url.searchParams.set('after', String(after))
      }

      const response = await fetch(url.toString(), { headers })

      if (!response.ok) {
        console.error(`Search failed for ${endpoint.name}: ${response.status}`)
        return { results: [], total: 0, paging: null }
      }

      const data = await response.json()
      const contentItems = data[endpoint.key] || []
      const mappedContent = contentItems.map((item: any) => normalizeItem(item, endpoint.type))

      return {
        results: mappedContent,
        total: data.total || 0,
        paging: data.paging,
      }
    }

    let searchResults: any[] = []
    let totalResults = 0
    let nextPaging = null

    if (contentType === 'all') {
      // Search across all content types
      const typesToSearch = [
        'landing-pages',
        'site-pages',
        'blog-posts',
        'blogs',
        'tags',
        'authors',
        'url-redirects',
        'hubdb-tables',
      ]

      const searchPromises = typesToSearch.map(type => {
        const endpoint = ENDPOINT_MAP[type as keyof typeof ENDPOINT_MAP]
        return searchEndpoint(endpoint)
      })

      const results = await Promise.all(searchPromises)

      // Combine all results
      searchResults = results.flatMap(result => result.results)
      totalResults = results.reduce((sum, result) => sum + result.total, 0)

      // Sort by relevance (you could implement more sophisticated ranking here)
      searchResults.sort((a, b) => {
        // Prioritize exact name matches
        const aNameMatch = a.name?.toLowerCase().includes(searchTerm.toLowerCase())
        const bNameMatch = b.name?.toLowerCase().includes(searchTerm.toLowerCase())

        if (aNameMatch && !bNameMatch) return -1
        if (!aNameMatch && bNameMatch) return 1

        // Then sort by update date
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })

      // Apply pagination to combined results
      const offset = after ? parseInt(after as string, 10) : 0
      const paginatedResults = searchResults.slice(offset, offset + limit)
      const nextOffset = offset + limit

      searchResults = paginatedResults
      nextPaging = nextOffset < totalResults ? { next: { after: String(nextOffset) } } : null
    } else {
      // Search specific content type
      const endpoint = ENDPOINT_MAP[contentType as keyof typeof ENDPOINT_MAP]
      if (!endpoint) {
        return NextResponse.json(
          { success: false, error: 'Invalid content type.' },
          { status: 400 }
        )
      }

      const result = await searchEndpoint(endpoint)
      searchResults = result.results
      totalResults = result.total
      nextPaging = result.paging
    }

    return NextResponse.json({
      success: true,
      content: searchResults,
      total: totalResults,
      paging: nextPaging,
      searchTerm,
      contentType,
    })
  } catch (error) {
    console.error('Search API error:', error)

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
