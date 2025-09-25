import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(request: NextRequest) {
  try {
    const { mismatches }: { mismatches: ConfigurationMismatch[] } = await request.json()

    if (!mismatches || !Array.isArray(mismatches) || mismatches.length === 0) {
      return NextResponse.json({ error: 'No mismatches provided' }, { status: 400 })
    }

    const supabase = await createClient()
    let updatedCount = 0

    // Group mismatches by header and content type for efficient processing
    const groupedMismatches = new Map<string, ConfigurationMismatch[]>()

    for (const mismatch of mismatches) {
      const key = `${mismatch.header}_${mismatch.contentType || 'default'}`
      if (!groupedMismatches.has(key)) {
        groupedMismatches.set(key, [])
      }
      groupedMismatches.get(key)!.push(mismatch)
    }

    // Process each header-contentType combination
    for (const [_key, headerMismatches] of groupedMismatches.entries()) {
      const firstMismatch = headerMismatches[0]
      const headerName = firstMismatch.header
      const contentTypeName = firstMismatch.contentType

      // Get the GSheets configuration for this header
      const gsheetConfig = HUBSPOT_HEADERS.find(h => h.header === headerName)
      if (!gsheetConfig) {
        console.error(`GSheets configuration not found for header: ${headerName}`)
        continue
      }

      // Get header definition
      const { data: headerDef, error: headerError } = await supabase
        .from('header_definitions')
        .select('id')
        .eq('api_name', headerName)
        .single()

      if (headerError || !headerDef) {
        console.error(`Failed to find header definition for ${headerName}:`, headerError)
        continue
      }

      if (!contentTypeName || contentTypeName === 'default') {
        // Handle header-level updates (no specific content type)
        continue
      }

      // Map content type names back to database slugs
      const contentTypeMapping: Record<string, string> = {
        'Website Pages': 'site-pages',
        'Landing Pages': 'landing-pages',
        'Blog Posts': 'blog-posts',
        Blogs: 'blogs',
        Tags: 'tags',
        Authors: 'authors',
        'URL Redirects': 'url-redirects',
        'HubDB Tables': 'hubdb-tables',
      }

      const contentTypeSlug = contentTypeMapping[contentTypeName]
      if (!contentTypeSlug) {
        console.error(`Unknown content type: ${contentTypeName}`)
        continue
      }

      // Get content type ID
      const { data: contentType, error: contentTypeError } = await supabase
        .from('content_types')
        .select('id')
        .eq('slug', contentTypeSlug)
        .single()

      if (contentTypeError || !contentType) {
        console.error(`Failed to find content type ${contentTypeSlug}:`, contentTypeError)
        continue
      }

      // Check if this content type should exist for this header in GSheets
      const shouldExist = gsheetConfig.contentType.includes(contentTypeName)

      if (!shouldExist) {
        // Remove configuration that shouldn't exist
        const { error: deleteError } = await supabase
          .from('header_configurations')
          .delete()
          .eq('header_id', headerDef.id)
          .eq('content_type_id', contentType.id)

        if (deleteError) {
          console.error(
            `Failed to remove configuration for ${headerName} - ${contentTypeName}:`,
            deleteError
          )
        } else {
          updatedCount++
        }
      } else {
        // Upsert configuration with GSheets values
        const { error: upsertError } = await supabase.from('header_configurations').upsert(
          {
            header_id: headerDef.id,
            content_type_id: contentType.id,
            data_type: gsheetConfig.dataType,
            category: gsheetConfig.category,
            filters: gsheetConfig.filters,
            read_only: gsheetConfig.isReadOnly,
            in_app_edit: gsheetConfig.inAppEdit,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: 1, // Default system user ID
          },
          {
            onConflict: 'header_id,content_type_id',
          }
        )

        if (upsertError) {
          console.error(
            `Failed to upsert configuration for ${headerName} - ${contentTypeName}:`,
            upsertError
          )
        } else {
          updatedCount++
        }
      }
    }

    // Handle missing configurations (configurations that exist in GSheets but not in DB)
    const missingConfigs = mismatches.filter(
      m => m.currentValue === 'Missing' && m.gsheetValue === 'Present'
    )

    for (const missing of missingConfigs) {
      const gsheetConfig = HUBSPOT_HEADERS.find(h => h.header === missing.header)
      if (!gsheetConfig) continue

      // Get header definition
      const { data: headerDef, error: headerError } = await supabase
        .from('header_definitions')
        .select('id')
        .eq('api_name', missing.header)
        .single()

      if (headerError || !headerDef) {
        console.error(`Failed to find header definition for ${missing.header}:`, headerError)
        continue
      }

      // Map content type name to slug
      const contentTypeMapping: Record<string, string> = {
        'Website Pages': 'site-pages',
        'Landing Pages': 'landing-pages',
        'Blog Posts': 'blog-posts',
        Blogs: 'blogs',
        Tags: 'tags',
        Authors: 'authors',
        'URL Redirects': 'url-redirects',
        'HubDB Tables': 'hubdb-tables',
      }

      const contentTypeSlug = contentTypeMapping[missing.contentType!]
      if (!contentTypeSlug) continue

      // Get content type ID
      const { data: contentType, error: contentTypeError } = await supabase
        .from('content_types')
        .select('id')
        .eq('slug', contentTypeSlug)
        .single()

      if (contentTypeError || !contentType) {
        console.error(`Failed to find content type ${contentTypeSlug}:`, contentTypeError)
        continue
      }

      // Upsert configuration (insert or update if exists)
      const { error: upsertError } = await supabase.from('header_configurations').upsert(
        {
          header_id: headerDef.id,
          content_type_id: contentType.id,
          data_type: gsheetConfig.dataType,
          category: gsheetConfig.category,
          filters: gsheetConfig.filters,
          read_only: gsheetConfig.isReadOnly,
          in_app_edit: gsheetConfig.inAppEdit,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: 1, // Default system user ID
        },
        {
          onConflict: 'header_id,content_type_id',
        }
      )

      if (upsertError) {
        console.error(
          `Failed to upsert configuration for ${missing.header} - ${missing.contentType}:`,
          upsertError
        )
      } else {
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount: updatedCount,
      message: `Successfully synced ${updatedCount} configurations with GSheets`,
    })
  } catch (error) {
    console.error('Error syncing with GSheets configuration:', error)
    return NextResponse.json(
      {
        error: `Failed to sync with GSheets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
