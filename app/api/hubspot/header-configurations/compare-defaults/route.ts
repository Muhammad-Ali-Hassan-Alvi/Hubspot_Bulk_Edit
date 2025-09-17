import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ConfigurationMismatch {
  header: string
  field: string
  currentValue: any
  defaultValue: any
  headerType: string
}

export async function GET() {
  try {
    // 1. Fetch headers from HubSpot API (using the same approach as compare-headers)
    const hubspotResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/hubspot/header-configurations/refresh-headers`
    )

    if (!hubspotResponse.ok) {
      throw new Error('Failed to fetch HubSpot headers')
    }

    const hubspotData = await hubspotResponse.json()
    const hubspotHeaders = hubspotData.headers || []

    // 2. Get all current header configurations from database
    const supabase = await createClient()

    const { data: headers, error: headersError } = await supabase
      .from('header_definitions')
      .select('*')

    if (headersError) {
      console.error('Failed to fetch headers:', headersError)
      return NextResponse.json({ error: 'Failed to fetch headers' }, { status: 500 })
    }

    const { data: configs, error: configsError } = await supabase
      .from('header_configurations')
      .select('*')

    if (configsError) {
      console.error('Failed to fetch header configurations:', configsError)
      return NextResponse.json({ error: 'Failed to fetch header configurations' }, { status: 500 })
    }

    // 3. Get content types for mapping
    const { data: contentTypes, error: contentTypesError } = await supabase
      .from('content_types')
      .select('*')

    if (contentTypesError) {
      console.error('Failed to fetch content types:', contentTypesError)
      return NextResponse.json({ error: 'Failed to fetch content types' }, { status: 500 })
    }

    // 4. Build current configuration map with content type presence
    const currentConfigs = headers.map(hd => {
      const headerConfigs = configs.filter(c => c.header_id === hd.id)
      const baseConfig = headerConfigs[0]

      // Build content type presence map for this header
      const contentTypePresence: Record<string, boolean> = {}

      // Map database content type slugs to HubSpot labels
      const contentTypeMapping: Record<string, string> = {
        'site-pages': 'Website Page',
        'landing-pages': 'Landing Page',
        'blog-posts': 'Blog Post',
        blogs: 'Blogs',
        tags: 'Tags',
        authors: 'Authors',
        'url-redirects': 'URL Redirects',
        'hubdb-tables': 'HubDB Tables',
      }

      for (const ct of contentTypes) {
        const hubspotLabel = contentTypeMapping[ct.slug] || ct.name
        const exists = headerConfigs.some(c => c.content_type_id === ct.id)
        contentTypePresence[hubspotLabel] = exists
      }

      return {
        header: hd.api_name,
        displayName: hd.display_name,
        headerType: baseConfig?.data_type ?? 'string',
        contentTypePresence,
      }
    })

    // 5. Create a map of HubSpot headers for easy lookup
    const hubspotHeadersMap = new Map()
    hubspotHeaders.forEach((header: any) => {
      hubspotHeadersMap.set(header.header, header)
    })

    // 6. Compare with HubSpot API data (only data types and content type presence)
    const mismatches: ConfigurationMismatch[] = []
    const mismatchedHeadersSet = new Set<string>()

    for (const currentConfig of currentConfigs) {
      // Find the HubSpot configuration for this header
      const hubspotConfig = hubspotHeadersMap.get(currentConfig.header)

      if (!hubspotConfig) {
        // Skip headers that don't exist in HubSpot
        continue
      }

      // 1. Compare data types
      if (currentConfig.headerType !== hubspotConfig.headerType) {
        mismatches.push({
          header: currentConfig.header,
          field: 'headerType',
          currentValue: currentConfig.headerType,
          defaultValue: hubspotConfig.headerType,
          headerType: currentConfig.headerType,
        })
        mismatchedHeadersSet.add(currentConfig.header)
      }

      // 2. Compare content type presence
      const hubspotPresence = hubspotConfig.presence || {}
      for (const contentType in currentConfig.contentTypePresence) {
        const currentEnabled = currentConfig.contentTypePresence[contentType]
        const hubspotEnabled = hubspotPresence[contentType] || false

        if (currentEnabled !== hubspotEnabled) {
          mismatches.push({
            header: currentConfig.header,
            field: `contentType_${contentType}`,
            currentValue: currentEnabled,
            defaultValue: hubspotEnabled,
            headerType: currentConfig.headerType,
          })
          mismatchedHeadersSet.add(currentConfig.header)
        }
      }
    }

    // 6. Return comparison result
    return NextResponse.json({
      success: true,
      totalHeaders: currentConfigs.length,
      mismatchedHeaders: mismatchedHeadersSet.size,
      mismatches: mismatches,
      isUpToDate: mismatches.length === 0,
    })
  } catch (error) {
    console.error('Error comparing configurations with defaults:', error)
    return NextResponse.json(
      {
        error: `Failed to compare configurations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
