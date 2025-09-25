import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { getHubSpotAuthHeaders } from '@/lib/hubspot-auth'
import {
  INCLUDE_ARCHIVED_CONTENT,
  getArchivedContentDisclaimer,
} from '@/lib/constants/archived-content'

interface StatusCounts {
  published: number | null
  draft: number | null
  total: number
}

async function fetchStatusCounts(
  baseUrl: string,
  headers: HeadersInit,
  hasStatus: boolean = false
): Promise<StatusCounts> {
  const baseUrlWithArchiveFilter = INCLUDE_ARCHIVED_CONTENT ? baseUrl : `${baseUrl}?archived=false`

  try {
    if (hasStatus) {
      const totalUrl = `${baseUrlWithArchiveFilter}`
      const draftUrl = `${baseUrlWithArchiveFilter}&state=DRAFT`

      const [totalResponse, draftResponse] = await Promise.all([
        fetch(`${totalUrl}&limit=1`, {
          headers,
          next: { revalidate: 0 },
        }),
        fetch(`${draftUrl}&limit=1`, {
          headers,
          next: { revalidate: 0 },
        }),
      ])

      const totalData = totalResponse.ok ? await totalResponse.json() : { total: 0 }
      const draftData = draftResponse.ok ? await draftResponse.json() : { total: 0 }

      const total = totalData.total || 0
      const draft = draftData.total || 0
      const published = total - draft

      return { published: published < 0 ? 0 : published, draft, total }
    } else {
      const response = await fetch(`${baseUrlWithArchiveFilter}&limit=1`, {
        headers,
        next: { revalidate: 0 },
      })

      if (!response.ok) return { published: null, draft: null, total: 0 }

      const data = await response.json()
      const total = data.total || 0
      return { published: null, draft: null, total }
    }
  } catch (error) {
    console.error(`❌ EXCEPTION while fetching counts for ${baseUrl}:`, error)
    return { published: null, draft: null, total: 0 }
  }
}

async function fetchUniqueBlogsCount(headers: HeadersInit): Promise<number> {
  try {
    const baseUrl = 'https://api.hubapi.com/cms/v3/blogs/posts?limit=100'
    const url = INCLUDE_ARCHIVED_CONTENT ? baseUrl : `${baseUrl}&archived=false`
    const response = await fetch(url, {
      headers,
      next: { revalidate: 0 },
    })

    if (!response.ok) return 0
    const data = await response.json()
    if (!data.results || data.results.length === 0) return 0

    const uniqueBlogIds = new Set<string>()
    for (const post of data.results) {
      if (post.contentGroupId) {
        uniqueBlogIds.add(post.contentGroupId)
      }
    }
    return uniqueBlogIds.size
  } catch (error) {
    console.error(`❌ EXCEPTION while fetching unique blogs count:`, error)
    return 0
  }
}

export async function POST() {
  try {
    const user = await getAuthenticatedUser()
    const headers = await getHubSpotAuthHeaders(user.id)

    const [
      landingPages,
      websitePages,
      blogPosts,
      blogsCount,
      tags,
      authors,
      urlRedirects,
      hubDbTables,
    ] = await Promise.all([
      fetchStatusCounts('https://api.hubapi.com/cms/v3/pages/landing-pages', headers, true),
      fetchStatusCounts('https://api.hubapi.com/cms/v3/pages/site-pages', headers, true),
      fetchStatusCounts('https://api.hubapi.com/cms/v3/blogs/posts', headers, true),
      fetchUniqueBlogsCount(headers),
      fetchStatusCounts('https://api.hubapi.com/cms/v3/blogs/tags', headers),
      fetchStatusCounts('https://api.hubapi.com/cms/v3/blogs/authors', headers),
      fetchStatusCounts('https://api.hubapi.com/cms/v3/url-redirects', headers),
      fetchStatusCounts('https://api.hubapi.com/cms/v3/hubdb/tables', headers),
    ])

    const counts = [
      { type: 'Landing Pages', ...landingPages },
      { type: 'Website Pages', ...websitePages },
      { type: 'Blog Posts', ...blogPosts },
      { type: 'Blogs', published: null, draft: null, total: blogsCount },
      { type: 'Tags', ...tags },
      { type: 'Authors', ...authors },
      { type: 'URL Redirects', ...urlRedirects },
      { type: 'HubDB Tables', ...hubDbTables },
    ]

    return NextResponse.json({
      success: true,
      disclaimer: getArchivedContentDisclaimer(),
      counts,
    })
  } catch (error) {
    console.error('❌ DETAILED ERROR fetching content counts:', error)

    // Handle specific token-related errors
    if (error instanceof Error) {
      if (
        error.message.includes('HubSpot not connected') ||
        error.message.includes('Token refresh failed')
      ) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
    }

    return NextResponse.json({ error: 'Failed to fetch content counts' }, { status: 500 })
  }
}
