import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { getHubSpotAuthHeaders } from '@/lib/hubspot-auth'

export const dynamic = 'force-dynamic'

// Function to fetch dropdown values for array fields from all HubSpot APIs
async function fetchArrayFieldValues(
  fieldName: string,
  _contentType: string,
  headers: HeadersInit
) {
  try {
    // All HubSpot API endpoints to fetch from
    const allEndpoints = [
      'https://api.hubapi.com/cms/v3/pages/landing-pages',
      'https://api.hubapi.com/cms/v3/pages/site-pages',
      'https://api.hubapi.com/cms/v3/blogs/posts',
      'https://api.hubapi.com/cms/v3/url-redirects',
      'https://api.hubapi.com/cms/v3/blogs/tags',
      'https://api.hubapi.com/cms/v3/blogs/authors',
      'https://api.hubapi.com/cms/v3/hubdb/tables',
    ]

    const allValues = new Set<string>()

    console.log(`Fetching values for ${fieldName} from all HubSpot APIs`)

    // Fetch from all endpoints in parallel
    const fetchPromises = allEndpoints.map(async endpoint => {
      try {
        const response = await fetch(`${endpoint}?limit=100`, { headers })
        if (!response.ok) {
          console.log(`Failed to fetch from ${endpoint}:`, response.status)
          return []
        }

        const data = await response.json()
        const items = data.results || []

        console.log(`Found ${items.length} items from ${endpoint}`)

        const endpointValues = new Set<string>()
        items.forEach((item: any, index: number) => {
          const fieldValue = item[fieldName]

          // Debug: Log the first few items to see the structure
          if (index < 2) {
            console.log(
              `${endpoint} - Item ${index} - ${fieldName}:`,
              fieldValue,
              typeof fieldValue
            )
          }

          if (Array.isArray(fieldValue)) {
            fieldValue.forEach((value: any) => {
              if (value && typeof value === 'string' && value.trim() !== '') {
                endpointValues.add(value.trim())
              } else if (value && typeof value === 'number') {
                endpointValues.add(String(value))
              }
            })
          } else if (fieldValue && typeof fieldValue === 'string' && fieldValue.trim() !== '') {
            endpointValues.add(fieldValue.trim())
          }
        })

        return Array.from(endpointValues)
      } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error)
        return []
      }
    })

    // Wait for all endpoints to complete
    const allResults = await Promise.all(fetchPromises)

    // Combine all values
    allResults.forEach(values => {
      values.forEach(value => allValues.add(value))
    })

    const result = Array.from(allValues).sort()
    console.log(`Found ${result.length} unique values for ${fieldName} across all APIs:`, result)
    return result
  } catch (error) {
    console.error(`Error fetching values for ${fieldName}:`, error)
    return []
  }
}

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

    // Get HubSpot auth headers for fetching array field values
    const user = await getAuthenticatedUser()
    const hubspotHeaders = await getHubSpotAuthHeaders(user.id)

    // Transform the data to match the expected format for BulkEditHeader
    const headers = await Promise.all(
      configurations.map(async config => {
        const fieldType =
          config.data_type === 'date-time'
            ? 'datetime'
            : config.data_type === 'boolean'
              ? 'boolean'
              : config.data_type === 'number'
                ? 'number'
                : config.data_type === 'array'
                  ? 'array'
                  : 'string'

        let options = undefined
        if (config.data_type === 'boolean') {
          options = ['true', 'false']
        } else if (config.data_type === 'array' && contentType) {
          // Fetch dropdown values for array fields from HubSpot
          options = await fetchArrayFieldValues(
            config.header_definitions.api_name,
            contentType,
            hubspotHeaders
          )
        }

        return {
          key: config.header_definitions.api_name,
          label: config.header_definitions.display_name || config.header_definitions.api_name,
          type: fieldType,
          options,
          category: config.category,
          contentType: config.content_types.slug,
          readOnly: config.read_only,
          inAppEdit: config.in_app_edit,
          filters: config.filters,
        }
      })
    )

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
