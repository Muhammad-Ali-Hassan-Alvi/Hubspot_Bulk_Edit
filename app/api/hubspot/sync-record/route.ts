import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { createClient } from '@/lib/supabase/server'
import { getHubSpotAuthHeaders } from '@/lib/hubspot-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { contentType, recordData } = await request.json()

    // Validate required fields
    if (!contentType || !recordData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: contentType and recordData' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Get content type info
    const { data: contentTypeData, error: contentTypeError } = await supabase
      .from('content_types')
      .select('slug')
      .eq('slug', contentType)
      .single()

    if (contentTypeError || !contentTypeData) {
      return NextResponse.json({ success: false, error: 'Invalid content type' }, { status: 400 })
    }

    // Fetch headers configuration to get editable fields only (filter out read-only)
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`
    const headersResponse = await fetch(
      `${baseUrl}/api/hubspot/headers?contentType=${contentType}&readOnly=false`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      }
    )

    if (!headersResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch headers configuration' },
        { status: 500 }
      )
    }

    const headersResult = await headersResponse.json()
    if (!headersResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to get headers: ' + headersResult.error },
        { status: 500 }
      )
    }

    // Get list of editable field names (non-read-only)
    const editableFields = new Set<string>(headersResult.headers.map((header: any) => header.key))
    console.log('Editable fields for sync:', Array.from(editableFields))

    // Filter record data to only include editable fields
    const filteredData: any = {}
    for (const [key, value] of Object.entries(recordData)) {
      if (key === 'id' || editableFields.has(key)) {
        filteredData[key] = value
      }
    }

    console.log('Filtered data for sync:', filteredData)

    // Convert camelCase fields back to HubSpot API format if needed
    const hubspotData = convertToHubSpotFormat(filteredData, contentType)

    // Make the actual API call to HubSpot
    const hubspotResult = await syncToHubSpot(hubspotData, contentType, recordData.id)

    if (!hubspotResult.success) {
      return NextResponse.json({ success: false, error: hubspotResult.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Record synced successfully to HubSpot',
      recordId: recordData.id,
    })
  } catch (error) {
    console.error('Sync record API error:', error)
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred' },
      { status: 500 }
    )
  }
}

// Convert camelCase fields to HubSpot API format
function convertToHubSpotFormat(data: any, _contentType: string): any {
  const converted: any = {}

  for (const [key, value] of Object.entries(data)) {
    // Skip null or undefined values
    if (value === null || value === undefined) {
      console.log(`Excluding null/undefined field from HubSpot sync: ${key}`)
      continue
    }

    // Skip fields with empty string values that could cause issues with specific fields
    if (value === '' && ['widgets'].includes(key)) {
      console.log(`Excluding empty problematic field from HubSpot sync: ${key}`)
      continue
    }

    if (key === 'id') {
      // Keep ID as is
      converted[key] = value
    } else {
      // For now, keep the camelCase format as HubSpot API might expect it
      // This might need adjustment based on actual HubSpot API requirements
      converted[key] = value
    }
  }

  console.log('Fields being sent to HubSpot:', Object.keys(converted))
  return converted
}

// Sync data to HubSpot
async function syncToHubSpot(data: any, contentType: string, recordId: string) {
  try {
    console.log(`Syncing ${contentType} record ${recordId} to HubSpot:`, data)

    // Get authenticated user for HubSpot token
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get HubSpot auth headers
    const headers = await getHubSpotAuthHeaders(user.id)

    // Map content types to HubSpot API endpoints
    const ENDPOINT_MAP: { [key: string]: string } = {
      'landing-pages': 'https://api.hubapi.com/cms/v3/pages/landing-pages',
      'site-pages': 'https://api.hubapi.com/cms/v3/pages/site-pages',
      'blog-posts': 'https://api.hubapi.com/cms/v3/blogs/posts',
      blogs: 'https://api.hubapi.com/cms/v3/blog-settings/settings',
      tags: 'https://api.hubapi.com/cms/v3/blogs/tags',
      authors: 'https://api.hubapi.com/cms/v3/blogs/authors',
      'url-redirects': 'https://api.hubapi.com/cms/v3/url-redirects',
      'hubdb-tables': 'https://api.hubapi.com/cms/v3/hubdb/tables',
    }

    const baseUrl = ENDPOINT_MAP[contentType]
    if (!baseUrl) {
      return { success: false, error: `Unsupported content type: ${contentType}` }
    }

    // Construct the update URL with the record ID
    const updateUrl = `${baseUrl}/${recordId}`

    // Prepare the payload by removing the id field (it's in the URL)
    const { id, ...updatePayload } = data

    console.log('HubSpot update URL:', updateUrl)
    console.log('HubSpot update payload:', updatePayload)

    // Make the PATCH request to HubSpot
    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('HubSpot API error:', response.status, errorText)
      console.error('Failed payload:', updatePayload)

      let errorMessage = `HubSpot API error: ${response.status}`
      try {
        const errorData = JSON.parse(errorText)
        console.error('HubSpot error details:', errorData)

        // Extract more specific error information
        if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.errors && Array.isArray(errorData.errors)) {
          // Handle validation errors
          const validationErrors = errorData.errors.map((err: any) => err.message || err).join('; ')
          errorMessage = `Validation errors: ${validationErrors}`
        }
      } catch {
        // If we can't parse the error, use the status text
        errorMessage = `${errorMessage} - ${response.statusText}`
      }

      return { success: false, error: errorMessage }
    }

    const result = await response.json()
    console.log('HubSpot sync successful:', result.id)

    return { success: true, data: result }
  } catch (error) {
    console.error('HubSpot sync error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync to HubSpot',
    }
  }
}
