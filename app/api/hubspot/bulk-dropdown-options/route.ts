import { type NextRequest, NextResponse } from 'next/server'
import { HUBSPOT_LANGUAGES, HUBSPOT_STATES, HUBSPOT_BOOLEAN_OPTIONS } from '@/lib/constants/hubspot-languages'

const dropdownCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes


async function fetchAllFromEndpoint(url: string, headers: HeadersInit): Promise<any[]> {
  const allResults: any[] = []
  let currentUrl: string | null = url

  while (currentUrl) {
    try {
      const response: Response = await fetch(currentUrl, { headers })
      if (!response.ok) {
        console.error(`Failed to fetch from ${currentUrl}: ${response.status}`)
        break
      }

      const data: any = await response.json()
      if (data.results && Array.isArray(data.results)) {
        allResults.push(...data.results)
      }

      // Check for pagination
      if (data.paging && data.paging.next && data.paging.next.link) {
        currentUrl = data.paging.next.link
      } else {
        currentUrl = null
      }
    } catch (error) {
      console.error(`Error fetching from ${currentUrl}:`, error)
      break
    }
  }
  return allResults
}

export async function POST(request: NextRequest) {
  try {
    const { hubspotToken, contentType = 'all-pages', useCache = true } = await request.json()

    if (!hubspotToken || typeof hubspotToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid token is required' },
        { status: 400 }
      )
    }

    const headers = {
      Authorization: `Bearer ${hubspotToken}`,
      'Content-Type': 'application/json',
    }

    // Create cache key based on token (first 8 chars for privacy)
    const cacheKey = `bulk-dropdown-${hubspotToken.substring(0, 8)}-${contentType}`

    // Use cache if enabled
    if (useCache) {
      const cached = dropdownCache.get(cacheKey)
      const now = Date.now()

      if (cached && now - cached.timestamp < CACHE_DURATION) {
        return NextResponse.json({
          success: true,
          dropdownOptions: cached.data,
          cached: true,
          message: 'All dropdown options loaded from cache',
        })
      }
    }

    console.log('🚀 Fetching ALL dropdown options at once...')

    // Define all endpoints to fetch from
    const configEndpoints = {
      domains: 'https://api.hubapi.com/cms/v3/domains',
      campaigns: 'https://api.hubapi.com/marketing/v3/campaigns',
      authors: 'https://api.hubapi.com/cms/v3/blogs/authors',
      contentGroups: 'https://api.hubapi.com/cms/v3/content-groups',
      tags: 'https://api.hubapi.com/cms/v3/blogs/tags',
      topics: 'https://api.hubapi.com/cms/v3/blogs/topics',
      redirects: 'https://api.hubapi.com/cms/v3/url-redirects',
    }

    // Fetch ALL endpoints in parallel for maximum efficiency
    const [domains, campaigns, authors, contentGroups, tags, topics, redirects] = await Promise.all(
      [
        fetchAllFromEndpoint(configEndpoints.domains, headers),
        fetchAllFromEndpoint(configEndpoints.campaigns, headers),
        fetchAllFromEndpoint(configEndpoints.authors, headers),
        fetchAllFromEndpoint(configEndpoints.contentGroups, headers),
        fetchAllFromEndpoint(configEndpoints.tags, headers),
        fetchAllFromEndpoint(configEndpoints.topics, headers),
        fetchAllFromEndpoint(configEndpoints.redirects, headers),
      ]
    )

    console.log(
      `✅ Fetched: ${domains.length} domains, ${campaigns.length} campaigns, ${authors.length} authors, ${contentGroups.length} content groups, ${tags.length} tags, ${topics.length} topics, ${redirects.length} redirects`
    )

    // Now fetch content from all content types to get field values
    const contentEndpoints = {
      'landing-pages': 'https://api.hubapi.com/cms/v3/pages/landing-pages',
      'website-pages': 'https://api.hubapi.com/cms/v3/pages/site-pages',
      'blog-posts': 'https://api.hubapi.com/cms/v3/blogs/posts',
    }

    let allContent: any[] = []

    if (contentType === 'all-pages') {
      // Fetch from all content types in parallel
      const [landingPages, websitePages, blogPosts] = await Promise.all([
        fetchAllFromEndpoint(contentEndpoints['landing-pages'], headers),
        fetchAllFromEndpoint(contentEndpoints['website-pages'], headers),
        fetchAllFromEndpoint(contentEndpoints['blog-posts'], headers),
      ])
      allContent = [...landingPages, ...websitePages, ...blogPosts]
    } else if (contentEndpoints[contentType as keyof typeof contentEndpoints]) {
      allContent = await fetchAllFromEndpoint(
        contentEndpoints[contentType as keyof typeof contentEndpoints],
        headers
      )
    }

    console.log(`📄 Fetched ${allContent.length} content items for field analysis`)

    // Process all dropdown options
    const dropdownOptions: { [key: string]: string[] } = {}

    // 1. Domains
    dropdownOptions.domain = domains.map(domain => domain.domain).filter(Boolean)

    // 2. Campaigns
    dropdownOptions.campaign = campaigns.map(campaign => campaign.name).filter(Boolean)

    // 3. Authors
    dropdownOptions.authorName = authors
      .map(author => author.displayName || author.name)
      .filter(Boolean)
    dropdownOptions.blogAuthorId = authors.map(author => author.id).filter(Boolean)

    // 4. Content Groups
    dropdownOptions.contentGroupId = contentGroups.map(group => group.id).filter(Boolean)

    // 5. Tags
    dropdownOptions.tagIds = tags.map(tag => tag.id).filter(Boolean)

    // 6. Topics
    dropdownOptions.topicIds = topics.map(topic => topic.id).filter(Boolean)

    // 7. Languages - Use comprehensive HubSpot language list
    dropdownOptions.language = HUBSPOT_LANGUAGES

    // 8. States - Official HubSpot states from documentation
    dropdownOptions.state = HUBSPOT_STATES

    // 9. Boolean options
    dropdownOptions.useFeaturedImage = HUBSPOT_BOOLEAN_OPTIONS
    dropdownOptions.pageExpiryEnabled = HUBSPOT_BOOLEAN_OPTIONS
    dropdownOptions.archivedInDashboard = HUBSPOT_BOOLEAN_OPTIONS

    // 10. Extract unique values from content
    const uniqueValues: { [key: string]: Set<string> } = {
      htmlTitle: new Set(),
      name: new Set(),
      routePrefix: new Set(),
      metaDescription: new Set(),
      publicTitle: new Set(),
    }

    allContent.forEach(item => {
      if (item.htmlTitle) uniqueValues.htmlTitle.add(item.htmlTitle)
      if (item.name) uniqueValues.name.add(item.name)
      if (item.routePrefix) uniqueValues.routePrefix.add(item.routePrefix)
      if (item.metaDescription) uniqueValues.metaDescription.add(item.metaDescription)
      if (item.publicTitle) uniqueValues.publicTitle.add(item.publicTitle)
    })

    // Convert sets to arrays and limit to reasonable sizes
    dropdownOptions.htmlTitle = Array.from(uniqueValues.htmlTitle).slice(0, 100)
    dropdownOptions.name = Array.from(uniqueValues.name).slice(0, 100)
    dropdownOptions.routePrefix = Array.from(uniqueValues.routePrefix).slice(0, 50)
    dropdownOptions.metaDescription = Array.from(uniqueValues.metaDescription).slice(0, 100)
    dropdownOptions.publicTitle = Array.from(uniqueValues.publicTitle).slice(0, 100)

    // 11. Redirect options
    dropdownOptions.redirectStyle = redirects
      .map(redirect => redirect.redirectStyle)
      .filter(Boolean)
    dropdownOptions.precedence = redirects
      .map(redirect => redirect.precedence?.toString())
      .filter(Boolean)

    // Cache the results
    dropdownCache.set(cacheKey, { data: dropdownOptions, timestamp: Date.now() })

    console.log(
      `🎉 Successfully processed ${Object.keys(dropdownOptions).length} dropdown categories`
    )

    return NextResponse.json({
      success: true,
      dropdownOptions,
      cached: false,
      message: 'All dropdown options fetched successfully in one request',
      stats: {
        domains: domains.length,
        campaigns: campaigns.length,
        authors: authors.length,
        contentGroups: contentGroups.length,
        tags: tags.length,
        topics: topics.length,
        redirects: redirects.length,
        contentItems: allContent.length,
        languages: HUBSPOT_LANGUAGES.length,
        totalOptions: Object.keys(dropdownOptions).length,
        totalValues: Object.values(dropdownOptions).reduce((sum, arr) => sum + arr.length, 0),
      },
    })
  } catch (error) {
    console.error('Bulk dropdown options API error:', error)
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'clear-cache') {
      dropdownCache.clear()
      return NextResponse.json({
        success: true,
        message: 'Bulk dropdown options cache cleared successfully',
      })
    }

    if (action === 'cache-stats') {
      return NextResponse.json({
        success: true,
        cacheSize: dropdownCache.size,
        cacheKeys: Array.from(dropdownCache.keys()),
        message: 'Bulk dropdown cache statistics retrieved',
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Use ?action=clear-cache or ?action=cache-stats',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Bulk dropdown cache management error:', error)
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
