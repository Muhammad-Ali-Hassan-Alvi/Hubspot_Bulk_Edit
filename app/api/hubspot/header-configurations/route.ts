import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Get all headers
    const { data: headers, error: headersError } = await supabase
      .from('header_definitions')
      .select('*')

    if (headersError) {
      console.error('Failed to fetch headers:', headersError)
      return NextResponse.json({ error: 'Failed to fetch headers' }, { status: 500 })
    }

    // 2. Get all content types
    const { data: contentTypes, error: contentTypesError } = await supabase
      .from('content_types')
      .select('*')

    if (contentTypesError) {
      console.error('Failed to fetch content types:', contentTypesError)
      return NextResponse.json({ error: 'Failed to fetch content types' }, { status: 500 })
    }

    // 3. Get all header configurations
    const { data: configs, error: configsError } = await supabase
      .from('header_configurations')
      .select('*')

    if (configsError) {
      console.error('Failed to fetch header configurations:', configsError)
      return NextResponse.json({ error: 'Failed to fetch header configurations' }, { status: 500 })
    }

    // 4. Pivot configs into row-per-header
    // 4. Pivot configs into row-per-header
    const rows = headers.map(hd => {
      const headerConfigs = configs.filter(c => c.header_id === hd.id)

      // Build a map of { slug: boolean }
      const ctMap: Record<string, boolean> = {}
      for (const ct of contentTypes) {
        // if a config row exists for this header + content type → true, else false
        const exists = headerConfigs.some(c => c.content_type_id === ct.id)
        ctMap[ct.slug] = exists
      }

      // Pick config details (same across content types for a header)
      const baseConfig = headerConfigs[0]

      return {
        id: hd.id,
        header: hd.api_name,
        displayName: hd.display_name,
        headerType: baseConfig?.data_type ?? 'string',
        category: baseConfig?.category ?? 'Additional',
        filters: baseConfig?.filters ?? false,
        read_only: baseConfig?.read_only ?? false,
        in_app_edit: baseConfig?.in_app_edit ?? false,
        lastUpdated: baseConfig?.updated_at ?? baseConfig?.created_at ?? null,
        updatedBy: baseConfig?.updated_by ?? null,
        contentTypes: ctMap,
      }
    })

    return NextResponse.json({ success: true, rows })
  } catch (err) {
    console.error('Header fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch headers' }, { status: 500 })
  }
}

// Upsert approach using unique constraint (header_id, content_type_id):
// Better for multi-user production system where history matters
// Preserves history for unchanged rows and handles concurrency better

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rows } = body

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get all content types to map slugs to IDs
    const { data: contentTypes, error: contentTypesError } = await supabase
      .from('content_types')
      .select('*')

    if (contentTypesError) {
      console.error('Failed to fetch content types:', contentTypesError)
      return NextResponse.json({ error: 'Failed to fetch content types' }, { status: 500 })
    }

    // Create a map of content type slug to ID
    const contentTypeMap = contentTypes.reduce(
      (acc, ct) => {
        acc[ct.slug] = ct.id
        return acc
      },
      {} as Record<string, number>
    )

    // Get all header IDs to fetch existing configurations
    const headerIds = rows.map(row => row.id).filter(Boolean)

    // Fetch existing configurations for these headers
    const { data: existingConfigs, error: fetchError } = await supabase
      .from('header_configurations')
      .select('*')
      .in('header_id', headerIds)

    if (fetchError) {
      console.error('Failed to fetch existing configurations:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch existing configurations' },
        { status: 500 }
      )
    }

    // Create a map of existing configurations for quick lookup
    const existingConfigMap = new Map()
    existingConfigs.forEach(config => {
      const key = `${config.header_id}-${config.content_type_id}`
      existingConfigMap.set(key, config)
    })

    // Collect configurations to upsert and ones to delete
    const configsToUpsert: any[] = []
    const configsToDelete: number[] = []
    const currentConfigKeys = new Set<string>()

    for (const row of rows) {
      const {
        id: headerId,
        headerType,
        category,
        filters,
        read_only,
        in_app_edit,
        contentTypes: contentTypeFlags,
      } = row

      // Process each content type for this header
      for (const [contentTypeSlug, isEnabled] of Object.entries(contentTypeFlags)) {
        const contentTypeId = contentTypeMap[contentTypeSlug]
        if (!contentTypeId) continue

        const configKey = `${headerId}-${contentTypeId}`

        if (isEnabled) {
          // Only add to currentConfigKeys if enabled (checked)
          currentConfigKeys.add(configKey)
          const existingConfig = existingConfigMap.get(configKey)

          const configData = {
            header_id: headerId,
            content_type_id: contentTypeId,
            data_type: headerType,
            category: category,
            filters: filters,
            read_only: read_only,
            in_app_edit: in_app_edit,
            updated_at: new Date().toISOString(),
            updated_by: 1, // TODO: Get actual user ID from auth
          }

          if (existingConfig) {
            // Check if anything actually changed to preserve history
            const hasChanges =
              existingConfig.data_type !== headerType ||
              existingConfig.category !== category ||
              existingConfig.filters !== filters ||
              existingConfig.read_only !== read_only ||
              existingConfig.in_app_edit !== in_app_edit

            console.log(`Existing config for header ${headerId}, content type ${contentTypeId}:`, {
              existing: {
                data_type: existingConfig.data_type,
                category: existingConfig.category,
                filters: existingConfig.filters,
                read_only: existingConfig.read_only,
                in_app_edit: existingConfig.in_app_edit,
              },
              incoming: {
                headerType,
                category,
                filters,
                read_only,
                in_app_edit,
              },
              hasChanges,
            })

            if (hasChanges) {
              // Update existing configuration
              configsToUpsert.push({
                id: existingConfig.id,
                ...configData,
              })
              console.log(
                `Added to upsert queue: header ${headerId}, content type ${contentTypeId}`
              )
            } else {
              console.log(
                `No changes detected for header ${headerId}, content type ${contentTypeId}`
              )
            }
            // If no changes, preserve the existing record (don't touch it)
          } else {
            // Insert new configuration (set created_at for new records)
            console.log(
              `No existing config found, creating new for header ${headerId}, content type ${contentTypeId}`
            )
            configsToUpsert.push({
              ...configData,
              created_at: new Date().toISOString(),
            })
          }
        }
      }
    }

    // Find configurations that should be deleted (exist in DB but not enabled in UI)
    existingConfigs.forEach(config => {
      const configKey = `${config.header_id}-${config.content_type_id}`
      if (!currentConfigKeys.has(configKey)) {
        console.log(
          `Marking for deletion: header_id=${config.header_id}, content_type_id=${config.content_type_id}`
        )
        configsToDelete.push(config.id)
      }
    })

    console.log(`Processing: ${configsToUpsert.length} upserts, ${configsToDelete.length} deletes`)

    // Execute upserts using the unique constraint
    if (configsToUpsert.length > 0) {
      // Remove id field from configs that have it since we're using upsert with unique constraint
      const upsertData = configsToUpsert.map((config: any) => {
        const { id, ...configWithoutId } = config
        return configWithoutId
      })

      const { error: upsertError } = await supabase
        .from('header_configurations')
        .upsert(upsertData, {
          onConflict: 'header_id,content_type_id',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        console.error('Failed to upsert configurations:', upsertError)
        return NextResponse.json({ error: 'Failed to upsert configurations' }, { status: 500 })
      }
    }

    // Delete configurations that are no longer enabled
    if (configsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('header_configurations')
        .delete()
        .in('id', configsToDelete)

      if (deleteError) {
        console.error('Failed to delete disabled configurations:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete disabled configurations' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Header configurations updated successfully',
      stats: {
        upserted: configsToUpsert.length,
        deleted: configsToDelete.length,
      },
    })
  } catch (err) {
    console.error('Header save error:', err)
    return NextResponse.json({ error: 'Failed to save header configurations' }, { status: 500 })
  }
}
