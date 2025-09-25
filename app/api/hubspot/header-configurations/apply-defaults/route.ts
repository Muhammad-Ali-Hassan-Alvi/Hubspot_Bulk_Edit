import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HUBSPOT_HEADERS } from '@/lib/hubspot-headers'

interface ConfigurationMismatch {
  header: string
  field: string
  currentValue: any
  defaultValue: any
  headerType: string
}

export async function POST(request: NextRequest) {
  try {
    const { mismatches }: { mismatches: ConfigurationMismatch[] } = await request.json()

    if (!mismatches || !Array.isArray(mismatches) || mismatches.length === 0) {
      return NextResponse.json({ error: 'No mismatches provided' }, { status: 400 })
    }

    const supabase = await createClient()

    // Group mismatches by header and field type
    const headerUpdates = new Map<string, Record<string, any>>()
    const contentTypeUpdates = new Map<string, { contentType: string; enabled: boolean }[]>()

    for (const mismatch of mismatches) {
      if (mismatch.field === 'headerType') {
        // Handle data type updates
        if (!headerUpdates.has(mismatch.header)) {
          headerUpdates.set(mismatch.header, {})
        }
        const updates = headerUpdates.get(mismatch.header)!
        updates.data_type = mismatch.defaultValue
      } else if (mismatch.field.startsWith('contentType_')) {
        // Handle content type presence updates
        const contentTypeName = mismatch.field.replace('contentType_', '')
        if (!contentTypeUpdates.has(mismatch.header)) {
          contentTypeUpdates.set(mismatch.header, [])
        }
        contentTypeUpdates.get(mismatch.header)!.push({
          contentType: contentTypeName,
          enabled: mismatch.defaultValue,
        })
      }
    }

    let updatedCount = 0

    // 1. Apply data type updates
    for (const [headerName, updates] of headerUpdates.entries()) {
      // Get the default configuration from HUBSPOT_HEADERS
      const defaultConfig = HUBSPOT_HEADERS.find(h => h.header === headerName)

      // First, get the header_id
      const { data: headerData, error: headerError } = await supabase
        .from('header_definitions')
        .select('id')
        .eq('api_name', headerName)
        .single()

      if (headerError || !headerData) {
        console.error(`Failed to find header ${headerName}:`, headerError)
        continue
      }

      // Update all configurations for this header with additional defaults from HUBSPOT_HEADERS
      const { error: updateError } = await supabase
        .from('header_configurations')
        .update({
          ...updates,
          category: defaultConfig?.category || 'Additional',
          filters: defaultConfig?.filters || false,
          read_only: defaultConfig?.isReadOnly || false,
          in_app_edit: defaultConfig?.inAppEdit || false,
          updated_at: new Date().toISOString(),
          updated_by: 1, // Default system user ID - you may want to use actual user ID from session
        })
        .eq('header_id', headerData.id)

      if (updateError) {
        console.error(`Failed to update configurations for header ${headerName}:`, updateError)
      } else {
        updatedCount++
      }
    }

    // 2. Apply content type presence updates
    for (const [headerName, contentTypeChanges] of contentTypeUpdates.entries()) {
      // Get header_id
      const { data: headerData, error: headerError } = await supabase
        .from('header_definitions')
        .select('id')
        .eq('api_name', headerName)
        .single()

      if (headerError || !headerData) {
        console.error(`Failed to find header ${headerName}:`, headerError)
        continue
      }

      // Content type mapping (reverse of the one used in compare)
      const contentTypeMapping: Record<string, string> = {
        'Website Page': 'site-pages',
        'Landing Page': 'landing-pages',
        'Blog Post': 'blog-posts',
        Blogs: 'blogs',
        Tags: 'tags',
        Authors: 'authors',
        'URL Redirects': 'url-redirects',
        'HubDB Tables': 'hubdb-tables',
      }

      for (const change of contentTypeChanges) {
        const dbSlug = contentTypeMapping[change.contentType]
        if (!dbSlug) continue

        // Get content type ID
        const { data: contentTypeData, error: contentTypeError } = await supabase
          .from('content_types')
          .select('id')
          .eq('slug', dbSlug)
          .single()

        if (contentTypeError || !contentTypeData) {
          console.error(`Failed to find content type ${dbSlug}:`, contentTypeError)
          continue
        }

        if (change.enabled) {
          // Add configuration if it doesn't exist
          // Get the default configuration from HUBSPOT_HEADERS
          const defaultConfig = HUBSPOT_HEADERS.find(h => h.header === headerName)

          const { error: insertError } = await supabase.from('header_configurations').upsert({
            header_id: headerData.id,
            content_type_id: contentTypeData.id,
            data_type: defaultConfig?.dataType || 'string',
            category: defaultConfig?.category || 'Additional',
            filters: defaultConfig?.filters || false,
            read_only: defaultConfig?.isReadOnly || false,
            in_app_edit: defaultConfig?.inAppEdit || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: 1, // Default system user ID - you may want to use actual user ID from session
          })

          if (insertError) {
            console.error(
              `Failed to add configuration for ${headerName} - ${change.contentType}:`,
              insertError
            )
          }
        } else {
          // Remove configuration
          const { error: deleteError } = await supabase
            .from('header_configurations')
            .delete()
            .eq('header_id', headerData.id)
            .eq('content_type_id', contentTypeData.id)

          if (deleteError) {
            console.error(
              `Failed to remove configuration for ${headerName} - ${change.contentType}:`,
              deleteError
            )
          }
        }
      }
      updatedCount++
    }

    return NextResponse.json({
      success: true,
      updatedCount: updatedCount,
      message: `Successfully updated ${updatedCount} header configurations to match defaults`,
    })
  } catch (error) {
    console.error('Error applying default configurations:', error)
    return NextResponse.json(
      {
        error: `Failed to apply default configurations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
