// In api/hubspot/dropdown-options/route.ts

import { type NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { getHubSpotAuthHeaders } from '@/lib/hubspot-auth'

const dropdownCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000

// Language cache to avoid repeated API calls
const languageCache = new Map<string, { data: string[]; timestamp: number }>()
const LANGUAGE_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

async function fetchLanguagesFromAPI(): Promise<string[]> {
  const cacheKey = 'languages'
  const now = Date.now()

  // Check cache first
  const cached = languageCache.get(cacheKey)
  if (cached && now - cached.timestamp < LANGUAGE_CACHE_DURATION) {
    return cached.data
  }

  try {
    const response = await fetch('https://restcountries.com/v3.1/all?fields=languages')
    const countries = await response.json()

    const languageMap = new Map<string, string>() // code -> name mapping

    countries.forEach((country: any) => {
      if (country.languages) {
        Object.entries(country.languages).forEach(([code, name]: [string, any]) => {
          if (typeof name === 'string' && typeof code === 'string') {
            // Store both code and name, prefer longer/more descriptive names
            const existing = languageMap.get(code)
            if (!existing || name.length > existing.length) {
              languageMap.set(code, name)
            }
          }
        })
      }
    })

    // Convert to array with format "Name - code"
    const languages = Array.from(languageMap.entries())
      .map(([code, name]) => `${name} - ${code}`)
      .sort()

    // Cache the result
    languageCache.set(cacheKey, { data: languages, timestamp: now })

    return languages
  } catch (error) {
    console.error('Failed to fetch languages from API:', error)
    // Return fallback with proper format
    const fallback = [
      'English - en',
      'Spanish - es',
      'French - fr',
      'German - de',
      'Italian - it',
      'Portuguese - pt',
      'Japanese - ja',
      'Chinese - zh',
      'Korean - ko',
      'Arabic - ar',
      'Hindi - hi',
      'Russian - ru',
    ]

    // Cache fallback too
    languageCache.set(cacheKey, { data: fallback, timestamp: now })
    return fallback
  }
}

// Helper function to fetch all paginated results from a HubSpot endpoint
async function fetchAllFromEndpoint(url: string, headers: HeadersInit): Promise<any[]> {
  const allResults: any[] = []
  let currentUrl: string | null = url

  while (currentUrl) {
    try {
      const response: Response = await fetch(currentUrl, { headers })
      if (!response.ok) {
        console.error(
          `HubSpot API error for ${currentUrl}: ${response.status} ${response.statusText}`
        )
        // Stop fetching from this endpoint if an error occurs
        break
      }

      const data: any = await response.json()
      if (data.results && data.results.length > 0) {
        allResults.push(...data.results)
      }
      // HubSpot uses `paging.next.link` for pagination
      currentUrl = data.paging?.next?.link || null
    } catch (e) {
      console.error(`Failed to fetch from ${currentUrl}`, e)
      break
    }
  }
  return allResults
}

export async function POST(request: NextRequest) {
  try {
    const { useCache = true, specificField } = await request.json()

    // Get authenticated user and refresh HubSpot token if needed
    const user = await getAuthenticatedUser()
    const headers = await getHubSpotAuthHeaders(user.id)

    // Create cache key based on user ID for privacy
    const cacheKey = `dropdown-${user.id.substring(0, 8)}`

    // Use cache if enabled
    if (useCache) {
      const cached = dropdownCache.get(cacheKey)
      const now = Date.now()

      if (cached && now - cached.timestamp < CACHE_DURATION) {
        // If requesting specific field, return only that field
        if (specificField && cached.data[specificField]) {
          return NextResponse.json({
            success: true,
            dropdownOptions: { [specificField]: cached.data[specificField] },
            cached: true,
            message: `Dropdown options for ${specificField} loaded from cache`,
          })
        }

        return NextResponse.json({
          success: true,
          dropdownOptions: cached.data,
          cached: true,
          message: 'Dropdown options loaded from cache',
        })
      }
    }

    const configEndpoints = {
      domains: 'https://api.hubapi.com/cms/v3/domains',
      campaigns: 'https://api.hubapi.com/marketing/v3/campaigns',
      authors: 'https://api.hubapi.com/cms/v3/blogs/authors',
      contentGroups: 'https://api.hubapi.com/cms/v3/content-groups',
      tags: 'https://api.hubapi.com/cms/v3/blogs/tags',
      topics: 'https://api.hubapi.com/cms/v3/blogs/topics',
      redirects: 'https://api.hubapi.com/cms/v3/url-redirects',
    }

    // If requesting specific field, only fetch what's needed
    let domains: any[] = []
    let campaigns: any[] = []
    let authors: any[] = []
    let contentGroups: any[] = []
    let tags: any[] = []
    let topics: any[] = []
    let redirects: any[] = []

    if (specificField) {
      // Fetch only the endpoints needed for the specific field
      const fetchPromises: Promise<any[]>[] = []

      if (specificField === 'domain') {
        fetchPromises.push(fetchAllFromEndpoint(configEndpoints.domains, headers))
      } else if (specificField === 'campaign') {
        fetchPromises.push(fetchAllFromEndpoint(configEndpoints.campaigns, headers))
      } else if (specificField === 'authorName' || specificField === 'blogAuthorId') {
        fetchPromises.push(fetchAllFromEndpoint(configEndpoints.authors, headers))
      } else if (specificField === 'contentGroupId') {
        fetchPromises.push(fetchAllFromEndpoint(configEndpoints.contentGroups, headers))
      } else if (specificField === 'tagIds') {
        fetchPromises.push(fetchAllFromEndpoint(configEndpoints.tags, headers))
      } else if (specificField === 'topicIds') {
        fetchPromises.push(fetchAllFromEndpoint(configEndpoints.topics, headers))
      } else if (specificField === 'redirectStyle' || specificField === 'precedence') {
        fetchPromises.push(fetchAllFromEndpoint(configEndpoints.redirects, headers))
      } else if (specificField === 'language') {
        // Language is cached, no need to fetch from HubSpot
        const languages = await fetchLanguagesFromAPI()
        return NextResponse.json({
          success: true,
          dropdownOptions: { language: languages },
          cached: true,
          message: 'Language options loaded from cache',
        })
      }

      const results = await Promise.all(fetchPromises)

      // Assign results based on what was fetched
      if (specificField === 'domain') domains = results[0] || []
      else if (specificField === 'campaign') campaigns = results[0] || []
      else if (specificField === 'authorName' || specificField === 'blogAuthorId')
        authors = results[0] || []
      else if (specificField === 'contentGroupId') contentGroups = results[0] || []
      else if (specificField === 'tagIds') tags = results[0] || []
      else if (specificField === 'topicIds') topics = results[0] || []
      else if (specificField === 'redirectStyle' || specificField === 'precedence')
        redirects = results[0] || []
    } else {
      // Fetch all endpoints for full data
      ;[domains, campaigns, authors, contentGroups, tags, topics, redirects] = await Promise.all([
        fetchAllFromEndpoint(configEndpoints.domains, headers),
        fetchAllFromEndpoint(configEndpoints.campaigns, headers),
        fetchAllFromEndpoint(configEndpoints.authors, headers),
        fetchAllFromEndpoint(configEndpoints.contentGroups, headers),
        fetchAllFromEndpoint(configEndpoints.tags, headers),
        fetchAllFromEndpoint(configEndpoints.topics, headers),
        fetchAllFromEndpoint(configEndpoints.redirects, headers),
      ])
    }

    const dropdownOptions: { [key: string]: string[] } = {}

    if (domains.length > 0) {
      dropdownOptions['domain'] = domains
        .map(d => d.domain)
        .filter(Boolean)
        .sort()
    }
    if (campaigns.length > 0) {
      dropdownOptions['campaign'] = campaigns
        .map(c => c.name)
        .filter(Boolean)
        .sort()
    }
    if (authors.length > 0) {
      dropdownOptions['authorName'] = authors
        .map(a => a.displayName || a.fullName)
        .filter(Boolean)
        .sort()
      dropdownOptions['blogAuthorId'] = authors
        .map(a => a.id)
        .filter(Boolean)
        .sort()
    }
    if (contentGroups.length > 0) {
      dropdownOptions['contentGroupId'] = contentGroups
        .map(cg => cg.id)
        .filter(Boolean)
        .sort()
    }
    if (tags.length > 0) {
      dropdownOptions['tagIds'] = tags
        .map(t => t.id)
        .filter(Boolean)
        .sort()
    }
    if (topics.length > 0) {
      dropdownOptions['topicIds'] = topics
        .map(t => t.id)
        .filter(Boolean)
        .sort()
    }
    if (redirects.length > 0) {
      // Extract unique redirect styles and precedences from redirects
      const redirectStyles = new Set<number>()
      const precedences = new Set<number>()

      redirects.forEach(redirect => {
        if (typeof redirect.redirectStyle === 'number') {
          redirectStyles.add(redirect.redirectStyle)
        }
        if (typeof redirect.precedence === 'number') {
          precedences.add(redirect.precedence)
        }
      })

      if (redirectStyles.size > 0) {
        dropdownOptions['redirectStyle'] = Array.from(redirectStyles)
          .sort((a, b) => a - b)
          .map(String)
      }
      if (precedences.size > 0) {
        dropdownOptions['precedence'] = Array.from(precedences)
          .sort((a, b) => a - b)
          .map(String)
      }
    }

    const contentEndpoints = [
      'https://api.hubapi.com/cms/v3/pages/landing-pages',
      'https://api.hubapi.com/cms/v3/pages/site-pages',
      'https://api.hubapi.com/cms/v3/blogs/posts',
    ]

    const contentResults = await Promise.all(
      contentEndpoints.map(url => fetchAllFromEndpoint(url, headers))
    )
    const allContent = contentResults.flat()
    const contentDerivedFields = {
      htmlTitle: new Set<string>(),
      name: new Set<string>(),
      slug: new Set<string>(),
      subcategory: new Set<string>(),
      tagIds: new Set<string>(),
      contentGroupId: new Set<string>(),
      blogAuthorId: new Set<string>(),
      redirectStyle: new Set<string>(),
      precedence: new Set<string>(),
    }

    for (const item of allContent) {
      const addValue = (set: Set<string>, value: any) => {
        if (value && typeof value === 'string' && value.trim() !== '') {
          set.add(value.trim())
        }
      }

      addValue(contentDerivedFields.htmlTitle, item.htmlTitle)
      addValue(contentDerivedFields.name, item.name)
      addValue(contentDerivedFields.slug, item.slug)
      addValue(contentDerivedFields.subcategory, item.subcategory)
      addValue(contentDerivedFields.contentGroupId, item.contentGroupId)
      addValue(contentDerivedFields.blogAuthorId, item.blogAuthorId)
      addValue(contentDerivedFields.redirectStyle, item.redirectStyle)
      addValue(contentDerivedFields.precedence, item.precedence)

      if (item.tagIds && Array.isArray(item.tagIds)) {
        item.tagIds.forEach((tagId: any) => addValue(contentDerivedFields.tagIds, String(tagId)))
      }
    }

    for (const [key, valueSet] of Object.entries(contentDerivedFields)) {
      if (valueSet.size > 0) {
        dropdownOptions[key] = Array.from(valueSet).sort()
      }
    }

    dropdownOptions['state'] = ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']

    const languages = await fetchLanguagesFromAPI()
    dropdownOptions['language'] = languages

    // Update cache with new data
    const existingCache = dropdownCache.get(cacheKey)
    const updatedCache = existingCache
      ? { ...existingCache.data, ...dropdownOptions }
      : dropdownOptions
    dropdownCache.set(cacheKey, { data: updatedCache, timestamp: Date.now() })

    // If requesting specific field, return only that field
    if (specificField && dropdownOptions[specificField]) {
      return NextResponse.json({
        success: true,
        dropdownOptions: { [specificField]: dropdownOptions[specificField] },
        cached: false,
        message: `Refreshed ${specificField} options from HubSpot.`,
      })
    }

    return NextResponse.json({
      success: true,
      dropdownOptions,
      totalContentItems: allContent.length,
      cached: false,
      message: `Refreshed options from HubSpot configuration and content.`,
      stats: {
        domains: domains.length,
        campaigns: campaigns.length,
        authors: authors.length,
        contentGroups: contentGroups.length,
        tags: tags.length,
        topics: topics.length,
        redirects: redirects.length,
        contentItems: allContent.length,
        languages: languages.length,
        totalOptions: Object.keys(dropdownOptions).length,
      },
    })
  } catch (error) {
    console.error('Dropdown options API error:', error)

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'clear-cache') {
      dropdownCache.clear()
      return NextResponse.json({
        success: true,
        message: 'Dropdown options cache cleared successfully',
      })
    }

    if (action === 'cache-stats') {
      return NextResponse.json({
        success: true,
        cacheSize: dropdownCache.size,
        cacheKeys: Array.from(dropdownCache.keys()),
        message: 'Cache statistics retrieved',
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
    console.error('Cache management error:', error)
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
