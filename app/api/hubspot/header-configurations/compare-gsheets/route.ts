import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HUBSPOT_HEADERS } from '@/lib/hubspot-headers'

interface ConfigurationMismatch {
  header: string
  field: string
  currentValue: any
  gsheetValue: any
  headerType: string
  contentType?: string
}

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Get all current header configurations from database
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

    // 2. Get content types for mapping
    const { data: contentTypes, error: contentTypesError } = await supabase
      .from('content_types')
      .select('*')

    if (contentTypesError) {
      console.error('Failed to fetch content types:', contentTypesError)
      return NextResponse.json({ error: 'Failed to fetch content types' }, { status: 500 })
    }

    // 3. Build current configuration map
    const currentConfigs = new Map()

    for (const header of headers) {
      const headerConfigs = configs.filter(c => c.header_id === header.id)

      // Map database content type slugs to display names
      const contentTypeMapping: Record<string, string> = {
        'site-pages': 'Website Pages',
        'landing-pages': 'Landing Pages',
        'blog-posts': 'Blog Posts',
        blogs: 'Blogs',
        tags: 'Tags',
        authors: 'Authors',
        'url-redirects': 'URL Redirects',
        'hubdb-tables': 'HubDB Tables',
      }

      for (const config of headerConfigs) {
        const contentType = contentTypes.find(ct => ct.id === config.content_type_id)
        const contentTypeName = contentType
          ? contentTypeMapping[contentType.slug] || contentType.name
          : 'Unknown'

        const key = `${header.api_name}_${contentTypeName}`
        currentConfigs.set(key, {
          header: header.api_name,
          contentType: contentTypeName,
          dataType: config.data_type,
          category: config.category,
          isReadOnly: config.read_only,
          inAppEdit: config.in_app_edit,
          filters: config.filters,
        })
      }
    }

    // 4. Compare with HUBSPOT_HEADERS (GSheets configuration)
    const mismatches: ConfigurationMismatch[] = []
    const mismatchedHeadersSet = new Set<string>()
    const processedHeaders = new Set<string>()

    for (const gsheetHeader of HUBSPOT_HEADERS) {
      processedHeaders.add(gsheetHeader.header)

      for (const contentType of gsheetHeader.contentType) {
        const key = `${gsheetHeader.header}_${contentType}`
        const currentConfig = currentConfigs.get(key)

        if (!currentConfig) {
          // Missing configuration in database
          mismatches.push({
            header: gsheetHeader.header,
            field: 'contentType',
            currentValue: 'Missing',
            gsheetValue: 'Present',
            headerType: gsheetHeader.dataType,
            contentType: contentType,
          })
          mismatchedHeadersSet.add(gsheetHeader.header)
          continue
        }

        // Compare all fields
        const fieldsToCompare = [
          { field: 'dataType', current: currentConfig.dataType, gsheet: gsheetHeader.dataType },
          { field: 'category', current: currentConfig.category, gsheet: gsheetHeader.category },
          {
            field: 'isReadOnly',
            current: currentConfig.isReadOnly,
            gsheet: gsheetHeader.isReadOnly,
          },
          { field: 'inAppEdit', current: currentConfig.inAppEdit, gsheet: gsheetHeader.inAppEdit },
          { field: 'filters', current: currentConfig.filters, gsheet: gsheetHeader.filters },
        ]

        for (const comparison of fieldsToCompare) {
          if (comparison.current !== comparison.gsheet) {
            mismatches.push({
              header: gsheetHeader.header,
              field: comparison.field,
              currentValue: comparison.current,
              gsheetValue: comparison.gsheet,
              headerType: gsheetHeader.dataType,
              contentType: contentType,
            })
            mismatchedHeadersSet.add(gsheetHeader.header)
          }
        }
      }
    }

    // 5. Check for extra configurations in database that don't exist in GSheets
    for (const [_key, config] of currentConfigs.entries()) {
      const gsheetHeader = HUBSPOT_HEADERS.find(h => h.header === config.header)
      if (!gsheetHeader || !gsheetHeader.contentType.includes(config.contentType)) {
        mismatches.push({
          header: config.header,
          field: 'contentType',
          currentValue: 'Present',
          gsheetValue: 'Missing',
          headerType: config.dataType,
          contentType: config.contentType,
        })
        mismatchedHeadersSet.add(config.header)
      }
    }

    // 6. Return comparison result
    return NextResponse.json({
      success: true,
      totalHeaders: processedHeaders.size,
      mismatchedHeaders: mismatchedHeadersSet.size,
      mismatches: mismatches,
      isUpToDate: mismatches.length === 0,
    })
  } catch (error) {
    console.error('Error comparing with GSheets configuration:', error)
    return NextResponse.json(
      {
        error: `Failed to compare with GSheets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
