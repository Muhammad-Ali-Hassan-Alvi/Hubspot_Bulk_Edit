import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { refreshHeaders, cacheTimestamp, CACHE_TTL_MS } from '@/lib/headers-configuration'

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch headers from the refresh-headers endpoint
    const resultOrResponse = await refreshHeaders(request)
    console.log('resultOrResponse', resultOrResponse)

    let hubspotHeaders: any[] = []

    if (resultOrResponse instanceof NextResponse) {
      // Handle cached response - extract data and continue with comparison logic
      try {
        const cachedData = await resultOrResponse.json()
        hubspotHeaders = Array.isArray(cachedData?.headers) ? cachedData.headers : []
        console.log('Using cached headers:', hubspotHeaders.length, 'headers found')
      } catch (error) {
        console.error('Failed to parse cached response:', error)
        return NextResponse.json(
          {
            success: false,
            totalHubSpotHeaders: 0,
            totalHubSpotUniqueHeaders: 0,
            totalDatabaseHeaders: 0,
            totalDatabaseCompositeHeaders: 0,
            missingHeaders: [],
            isUpToDate: false,
            error: 'Failed to parse cached header data',
          },
          { status: 500 }
        )
      }
    } else {
      // Handle fresh data
      hubspotHeaders = Array.isArray(resultOrResponse?.headers) ? resultOrResponse.headers : []
      console.log('Using fresh headers:', hubspotHeaders.length, 'headers found')
    }

    // 2. Fetch existing headers from database with their configurations
    const supabase = await createClient()
    const { data: dbHeaders, error: dbError } = await supabase.from('header_definitions').select(`
        api_name, 
        display_name,
        header_configurations (
          data_type,
          content_types (slug)
        )
      `)

    if (dbError) {
      console.error('Failed to fetch database headers:', dbError)
      return NextResponse.json({ error: 'Failed to fetch database headers' }, { status: 500 })
    }

    // 3. Create composite keys for comparison (name + data_type)
    // For HubSpot headers: use header + headerType
    // const hubspotCompositeKeys = new Set(
    //   hubspotHeaders.map((h: any) => `${h.header}||${h.headerType || ''}`)
    // )

    // For database headers: create composite keys from configurations
    const dbCompositeKeys = new Set()
    const dbUniqueNames = new Set()

    dbHeaders?.forEach(header => {
      dbUniqueNames.add(header.api_name)
      // If header has configurations, create composite keys for each data type
      if (header.header_configurations && header.header_configurations.length > 0) {
        header.header_configurations.forEach((config: any) => {
          dbCompositeKeys.add(`${header.api_name}||${config.data_type || ''}`)
        })
      } else {
        // If no configurations, add with empty data type
        dbCompositeKeys.add(`${header.api_name}||`)
      }
    })

    // 4. Find missing headers by comparing composite keys
    const missingHeaders = hubspotHeaders.filter((hubspotHeader: any) => {
      const compositeKey = `${hubspotHeader.header}||${hubspotHeader.headerType || ''}`
      return !dbCompositeKeys.has(compositeKey)
    })

    // 5. Calculate accurate counts
    // For HubSpot: deduplicate by header name for display purposes
    const hubspotUniqueNames = new Set(hubspotHeaders.map((h: any) => h.header))
    const totalHubSpotUniqueHeaders = hubspotUniqueNames.size

    // 6. Return comparison result with enhanced information
    const isUsingCachedData = resultOrResponse instanceof NextResponse

    return NextResponse.json({
      success: true,
      totalHubSpotHeaders: (hubspotHeaders || []).length, // Total including data type variants
      totalHubSpotUniqueHeaders: totalHubSpotUniqueHeaders, // Unique names only
      totalDatabaseHeaders: dbUniqueNames.size, // Unique names in database
      totalDatabaseCompositeHeaders: dbCompositeKeys.size, // Total including data type variants
      missingHeaders: (missingHeaders || []).map((header: any) => ({
        header: header.header,
        headerType: header.headerType,
        presence: header.presence,
        compositeKey: `${header.header}||${header.headerType || ''}`,
      })),
      isUpToDate: (missingHeaders || []).length === 0,
      isUsingCachedData: isUsingCachedData,
      cacheInfo: isUsingCachedData
        ? 'Using cached HubSpot data to prevent API rate limiting'
        : 'Fresh data from HubSpot API',
      cacheExpiresAt: isUsingCachedData ? cacheTimestamp + CACHE_TTL_MS : null,
      explanation: {
        hubspotIncludesDataTypeVariants: true,
        databaseStoresUniqueNames: true,
        comparisonMethod: 'composite_key_with_data_type',
        missingHeadersAreDataTypeVariants: (missingHeaders || []).length > 0,
      },
    })
  } catch (error) {
    console.error('Error comparing headers:', error)
    return NextResponse.json(
      {
        success: false,
        totalHubSpotHeaders: 0,
        totalHubSpotUniqueHeaders: 0,
        totalDatabaseHeaders: 0,
        totalDatabaseCompositeHeaders: 0,
        missingHeaders: [],
        isUpToDate: false,
        error: `Failed to compare headers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
