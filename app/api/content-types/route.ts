import { type NextRequest, NextResponse } from 'next/server'
// import { createServiceClient } from '@/lib/supabase/service'

const contentTypesCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('forceRefresh') === 'true'

    const cacheKey = 'content-types-global'

    // Check cache first
    if (!forceRefresh) {
      const cached = contentTypesCache.get(cacheKey)
      const now = Date.now()

      if (cached && now - cached.timestamp < CACHE_DURATION) {
        return NextResponse.json({
          success: true,
          contentTypes: cached.data,
          cached: true,
          message: 'Content types loaded from cache',
        })
      }
    }

    // For now, use fallback content types since the table doesn't exist yet
    // TODO: Create default_content_types table in Supabase when ready
    const fallbackTypes = [
      {
        value: 'landing-pages',
        label: 'Landing Pages',
        description: 'Marketing landing pages',
        isActive: true,
        sortOrder: 1,
        category: 'pages',
      },
      {
        value: 'site-pages',
        label: 'Website Pages',
        description: 'General website pages',
        isActive: true,
        sortOrder: 2,
        category: 'pages',
      },
      {
        value: 'blog-posts',
        label: 'Blog Posts',
        description: 'Blog articles and posts',
        isActive: true,
        sortOrder: 3,
        category: 'content',
      },
      {
        value: 'blogs',
        label: 'Blogs',
        description: 'Blog collections',
        isActive: true,
        sortOrder: 4,
        category: 'content',
      },
      {
        value: 'tags',
        label: 'Tags',
        description: 'Content tags',
        isActive: true,
        sortOrder: 5,
        category: 'organization',
      },
      {
        value: 'authors',
        label: 'Authors',
        description: 'Content authors',
        isActive: true,
        sortOrder: 6,
        category: 'organization',
      },
      {
        value: 'url-redirects',
        label: 'URL Redirects',
        description: 'URL redirect rules',
        isActive: true,
        sortOrder: 7,
        category: 'technical',
      },
      {
        value: 'hubdb-tables',
        label: 'HubDB Tables',
        description: 'Database tables',
        isActive: true,
        sortOrder: 8,
        category: 'technical',
      },
    ]

    // Cache the results
    contentTypesCache.set(cacheKey, { data: fallbackTypes, timestamp: Date.now() })

    return NextResponse.json({
      success: true,
      contentTypes: fallbackTypes,
      cached: false,
      message: 'Content types loaded from fallback - ready for Supabase integration',
      count: fallbackTypes.length,
    })
  } catch (error) {
    console.error('Content types API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content types' },
      { status: 500 }
    )
  }
}
