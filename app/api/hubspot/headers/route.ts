import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Get query parameters
    const contentType = searchParams.get('contentType')
    const inAppEdit = searchParams.get('inAppEdit')
    const readOnly = searchParams.get('readOnly')
    const filters = searchParams.get('filters')
    const category = searchParams.get('category')
    const filtersEnabled = searchParams.get('filtersEnabled') // For getting filterable fields

    const supabase = await createClient()

    // First, get the content type ID if contentType is provided
    let contentTypeId = null
    if (contentType) {
      const { data: contentTypeData, error: contentTypeError } = await supabase
        .from('content_types')
        .select('id')
        .eq('slug', contentType)
        .single()

      if (contentTypeError) {
        console.error('Failed to fetch content type:', contentTypeError)
        return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
      }
      contentTypeId = contentTypeData.id
    }

    // Build the main query
    let query = supabase.from('header_configurations').select(`
        *,
        header_definitions!inner(
          id,
          api_name,
          display_name
        ),
        content_types!inner(
          id,
          slug,
          name
        )
      `)

    // Apply content type filter if provided
    if (contentTypeId) {
      query = query.eq('content_type_id', contentTypeId)
    }

    // Apply optional filters
    if (inAppEdit !== null && inAppEdit !== undefined) {
      const inAppEditBool = inAppEdit === 'true'
      query = query.eq('in_app_edit', inAppEditBool)
    }

    if (readOnly !== null && readOnly !== undefined) {
      const readOnlyBool = readOnly === 'true'
      query = query.eq('read_only', readOnlyBool)
    }

    if (filters !== null && filters !== undefined) {
      const filtersBool = filters === 'true'
      query = query.eq('filters', filtersBool)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (filtersEnabled !== null && filtersEnabled !== undefined) {
      const filtersEnabledBool = filtersEnabled === 'true'
      query = query.eq('filters', filtersEnabledBool)
    }

    const { data: configurations, error } = await query

    if (error) {
      console.error('Failed to fetch header configurations:', error)
      return NextResponse.json({ error: 'Failed to fetch header configurations' }, { status: 500 })
    }

    // Transform the data to match the expected format for BulkEditHeader
    const headers = configurations.map(config => ({
      key: config.header_definitions.api_name,
      label: config.header_definitions.display_name || config.header_definitions.api_name,
      type:
        config.data_type === 'date-time'
          ? 'datetime'
          : config.data_type === 'boolean'
            ? 'boolean'
            : config.data_type === 'number'
              ? 'number'
              : 'string',
      options: config.data_type === 'boolean' ? ['true', 'false'] : undefined,
      category: config.category,
      contentType: config.content_types.slug,
      readOnly: config.read_only,
      inAppEdit: config.in_app_edit,
      filters: config.filters,
    }))

    return NextResponse.json({
      success: true,
      headers,
      count: headers.length,
    })
  } catch (err) {
    console.error('Headers fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch headers' }, { status: 500 })
  }
}
