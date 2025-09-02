import { createClient } from '@/lib/supabase/server'
// import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { NextResponse } from 'next/server'
import { getServerUserSettings } from '@/lib/store/serverUtils'

interface StatusCounts {
  published: number | null
  draft: number | null
  total: number
}

async function fetchStatusCounts(
  baseUrl: string,
  accessToken: string,
  hasStatus: boolean = false
): Promise<StatusCounts> {
  const baseUrlWithArchiveFilter = `${baseUrl}?archived=false`

  try {
    if (hasStatus) {
      const totalUrl = `${baseUrlWithArchiveFilter}`
      const draftUrl = `${baseUrlWithArchiveFilter}&state=DRAFT`

      const [totalResponse, draftResponse] = await Promise.all([
        fetch(`${totalUrl}&limit=1`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          next: { revalidate: 0 },
        }),
        fetch(`${draftUrl}&limit=1`, {
          headers: { Authorization: `Bearer ${accessToken}` },
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
        headers: { Authorization: `Bearer ${accessToken}` },
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

async function fetchUniqueBlogsCount(accessToken: string): Promise<number> {
  try {
    const response = await fetch(
      'https://api.hubapi.com/cms/v3/blogs/posts?limit=100&archived=false',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        next: { revalidate: 0 },
      }
    )

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
  const supabase = createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userSettings = await getServerUserSettings(user.id)

  if (!userSettings) {
    return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 })
  }

  const accessToken = userSettings?.hubspot_token_encrypted || userSettings?.hubspot_access_token
  if (!accessToken) {
    return NextResponse.json({ error: 'HubSpot not connected' }, { status: 403 })
  }

  try {
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
      fetchStatusCounts('https://api.hubapi.com/cms/v3/pages/landing-pages', accessToken, true),
      fetchStatusCounts('https://api.hubapi.com/cms/v3/pages/site-pages', accessToken, true),
      fetchStatusCounts('https://api.hubapi.com/cms/v3/blogs/posts', accessToken, true),
      fetchUniqueBlogsCount(accessToken),
      fetchStatusCounts('https://api.hubapi.com/cms/v3/blogs/tags', accessToken),
      fetchStatusCounts('https://api.hubapi.com/cms/v3/blogs/authors', accessToken),
      fetchStatusCounts('https://api.hubapi.com/cms/v3/url-redirects', accessToken),
      fetchStatusCounts('https://api.hubapi.com/cms/v3/hubdb/tables', accessToken),
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
      disclaimer: 'All counts exclude archived content.',
      counts,
    })
  } catch (error) {
    console.error('❌ DETAILED ERROR fetching content counts:', error)
    return NextResponse.json({ error: 'Failed to fetch content counts' }, { status: 500 })
  }
}
