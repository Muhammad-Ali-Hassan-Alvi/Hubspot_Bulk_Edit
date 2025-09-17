import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequestOrigin } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch headers from the refresh-headers endpoint
    const origin = getRequestOrigin(request)
    const hubspotResponse = await fetch(
      `${origin}/api/hubspot/header-configurations/refresh-headers`
    )

    if (!hubspotResponse.ok) {
      throw new Error('Failed to fetch HubSpot headers')
    }

    const hubspotData = await hubspotResponse.json()
    const hubspotHeaders = hubspotData.headers || []

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

    console.log('umar dbHeaders length', dbHeaders?.length)

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

    console.log('HubSpot total headers (with data type variants):', hubspotHeaders.length)
    console.log('HubSpot unique header names:', totalHubSpotUniqueHeaders)
    console.log('Database unique header names:', dbUniqueNames.size)
    console.log('Missing composite headers (name + data type):', missingHeaders.length)

    // 6. Return comparison result with enhanced information
    return NextResponse.json({
      success: true,
      totalHubSpotHeaders: hubspotHeaders.length, // Total including data type variants
      totalHubSpotUniqueHeaders: totalHubSpotUniqueHeaders, // Unique names only
      totalDatabaseHeaders: dbUniqueNames.size, // Unique names in database
      totalDatabaseCompositeHeaders: dbCompositeKeys.size, // Total including data type variants
      missingHeaders: missingHeaders.map((header: any) => ({
        header: header.header,
        headerType: header.headerType,
        presence: header.presence,
        compositeKey: `${header.header}||${header.headerType || ''}`,
      })),
      isUpToDate: missingHeaders.length === 0,
      explanation: {
        hubspotIncludesDataTypeVariants: true,
        databaseStoresUniqueNames: true,
        comparisonMethod: 'composite_key_with_data_type',
        missingHeadersAreDataTypeVariants: missingHeaders.length > 0,
      },
    })
  } catch (error) {
    console.error('Error comparing headers:', error)
    return NextResponse.json(
      {
        error: `Failed to compare headers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
