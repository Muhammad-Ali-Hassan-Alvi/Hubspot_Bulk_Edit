import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Convert camelCase to Display Name
// Examples: testHeader -> Test Header, htmlTitle -> Html Title, id -> Id
function camelCaseToDisplayName(camelCase: string): string {
  return (
    camelCase
      // Insert space before uppercase letters (except the first character)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Capitalize the first letter of each word
      .replace(/\b\w/g, letter => letter.toUpperCase())
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { missingHeaders } = body

    if (!missingHeaders || !Array.isArray(missingHeaders) || missingHeaders.length === 0) {
      return NextResponse.json({ error: 'No missing headers provided' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get all content types to create configurations
    const { data: contentTypes, error: contentTypesError } = await supabase
      .from('content_types')
      .select('*')

    if (contentTypesError) {
      console.error('Failed to fetch content types:', contentTypesError)
      return NextResponse.json({ error: 'Failed to fetch content types' }, { status: 500 })
    }

    // Create a map of content type names to IDs (mapping HubSpot names to our slugs)
    const contentTypeMapping: Record<string, number> = {}
    contentTypes.forEach(ct => {
      // Map HubSpot content type names to our database slugs
      switch (ct.slug) {
        case 'site-pages':
          contentTypeMapping['Website Page'] = ct.id
          break
        case 'landing-pages':
          contentTypeMapping['Landing Page'] = ct.id
          break
        case 'blog-posts':
          contentTypeMapping['Blog Post'] = ct.id
          break
        case 'blogs':
          contentTypeMapping['Blogs'] = ct.id
          break
        case 'tags':
          contentTypeMapping['Tags'] = ct.id
          break
        case 'authors':
          contentTypeMapping['Authors'] = ct.id
          break
        case 'url-redirects':
          contentTypeMapping['URL Redirects'] = ct.id
          break
        case 'hubdb-tables':
          contentTypeMapping['HubDB Tables'] = ct.id
          break
      }
    })

    console.log('Content Types from DB:', contentTypes)
    console.log('Content Type Mapping:', contentTypeMapping)

    // Log some examples of the camelCase to display name conversion
    console.log('Display name conversions:')
    missingHeaders.slice(0, 5).forEach((header: any) => {
      console.log(`  ${header.header} -> ${camelCaseToDisplayName(header.header)}`)
    })

    // Check which headers already exist in the database
    const headerNames = missingHeaders.map((header: any) => header.header)
    console.log('Looking for existing headers with names:', headerNames.slice(0, 10)) // Show first 10 for debugging

    const { data: existingHeaders, error: fetchError } = await supabase
      .from('header_definitions')
      .select('id, api_name, display_name')
      .in('api_name', headerNames)

    if (fetchError) {
      console.error('Failed to fetch existing headers:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch existing headers' }, { status: 500 })
    }

    console.log('Found existing headers:', existingHeaders?.map(h => h.api_name).slice(0, 10)) // Show first 10 for debugging

    // Create a set of existing header names for quick lookup
    const existingHeaderNames = new Set(existingHeaders?.map(h => h.api_name) || [])

    // Filter out headers that already exist
    const trulyMissingHeaders = missingHeaders.filter(
      (header: any) => !existingHeaderNames.has(header.header)
    )

    console.log(
      `Found ${existingHeaders?.length || 0} existing headers, ${trulyMissingHeaders.length} truly missing headers`
    )

    let insertedHeaders: any[] = []

    // Deduplicate headers by api_name to avoid "cannot affect row a second time" error
    const uniqueHeaders = new Map()
    missingHeaders.forEach((header: any) => {
      if (!uniqueHeaders.has(header.header)) {
        uniqueHeaders.set(header.header, header)
      }
    })

    console.log(
      `Deduplicated ${missingHeaders.length} headers to ${uniqueHeaders.size} unique headers`
    )

    // Prepare all headers for upsert (handles both new and existing)
    const headersToUpsert = Array.from(uniqueHeaders.values()).map((header: any) => ({
      api_name: header.header,
      display_name: camelCaseToDisplayName(header.header), // Convert camelCase to Display Name
      created_at: new Date().toISOString(),
    }))

    console.log(
      'Attempting to upsert headers:',
      headersToUpsert.slice(0, 5).map(h => h.api_name)
    ) // Show first 5 for debugging

    // Use upsert to handle potential duplicates in header_definitions
    const { data: upsertedHeaders, error: upsertError } = await supabase
      .from('header_definitions')
      .upsert(headersToUpsert, {
        onConflict: 'api_name',
        ignoreDuplicates: false, // We want to get back the existing records too
      })
      .select('id, api_name, display_name')

    if (upsertError) {
      console.error('Failed to upsert headers:', upsertError)
      return NextResponse.json(
        {
          error: 'Failed to upsert headers',
          details: upsertError.message,
        },
        { status: 500 }
      )
    }

    insertedHeaders = upsertedHeaders || []
    console.log('Upserted headers count:', insertedHeaders.length)

    // Use the upserted headers as our source of truth (includes both new and existing)
    const allRelevantHeaders = insertedHeaders

    // Now create header configurations based on presence data
    const configurationsToInsert: any[] = []

    // Create a map for quick lookup of header data by api_name
    const headerMap = new Map()
    allRelevantHeaders.forEach(header => {
      headerMap.set(header.api_name, header)
    })

    // Process all missing headers (both existing and newly inserted)
    // We need to process the original missingHeaders to get all the presence data
    missingHeaders.forEach((originalHeader: any) => {
      const headerData = headerMap.get(originalHeader.header)
      if (!headerData) {
        console.warn(`Header data not found for: ${originalHeader.header}`)
        return
      }

      const presence = originalHeader.presence || {}

      // For each content type where this header is present, create a configuration
      Object.entries(presence).forEach(([contentTypeName, isPresent]) => {
        if (isPresent && contentTypeMapping[contentTypeName]) {
          // Check if this configuration already exists to avoid duplicates
          const existingConfig = configurationsToInsert.find(
            config =>
              config.header_id === headerData.id &&
              config.content_type_id === contentTypeMapping[contentTypeName]
          )

          if (!existingConfig) {
            configurationsToInsert.push({
              header_id: headerData.id,
              content_type_id: contentTypeMapping[contentTypeName],
              data_type: originalHeader.headerType || 'string',
              category: 'Additional', // Default category
              filters: false, // Default value
              read_only: false, // Default value
              in_app_edit: false, // Default value
              display_order: null, // Optional field
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(), // Required field
              updated_by: 1, // Default system user ID - you might want to use actual user ID
            })
          }
        }
      })
    })

    // Insert header configurations if any, using upsert to handle duplicates
    let insertedConfigurations = null
    if (configurationsToInsert.length > 0) {
      console.log(
        'Attempting to upsert configurations:',
        JSON.stringify(configurationsToInsert, null, 2)
      )

      // Use upsert to handle potential duplicates in header_configurations
      const { data: configData, error: configError } = await supabase
        .from('header_configurations')
        .upsert(configurationsToInsert, {
          onConflict: 'header_id,content_type_id',
        })
        .select('*')

      if (configError) {
        console.error('Failed to upsert header configurations:', configError)
        console.error(
          'Configuration data that failed:',
          JSON.stringify(configurationsToInsert, null, 2)
        )
        // Don't fail the entire operation, just log the error
        console.warn('Headers were added but configurations failed:', configError.message)
      } else {
        console.log('Successfully upserted configurations:', configData?.length)
        insertedConfigurations = configData
      }
    } else {
      console.log('No configurations to insert')
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${missingHeaders.length} headers. Upserted ${insertedHeaders.length} header definitions and created/updated ${insertedConfigurations?.length || 0} configurations.`,
      upsertedHeaders: insertedHeaders,
      upsertedConfigurations: insertedConfigurations,
      headersCount: insertedHeaders.length,
      configurationsCount: insertedConfigurations?.length || 0,
    })
  } catch (error) {
    console.error('Error adding missing headers:', error)
    return NextResponse.json(
      {
        error: `Failed to add missing headers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
