import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('=== HubSpot Free Tier APIs Called ===')

  try {
    const { token, hubspotToken } = await request.json()
    const finalToken = token || hubspotToken

    if (!finalToken || typeof finalToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid token is required' },
        { status: 400 }
      )
    }

    console.log('Testing HubSpot Free Tier APIs...')

    // Free tier API endpoints that don't require paid plans
    const endpoints = [
      {
        name: 'blog_posts',
        url: 'https://api.hubapi.com/cms/v3/blogs/posts?limit=10',
        description: 'Blog Posts',
      },
      {
        name: 'contacts',
        url: 'https://api.hubapi.com/crm/v3/objects/contacts?limit=10',
        description: 'Contacts',
      },
      {
        name: 'companies',
        url: 'https://api.hubapi.com/crm/v3/objects/companies?limit=10',
        description: 'Companies',
      },
      {
        name: 'deals',
        url: 'https://api.hubapi.com/crm/v3/objects/deals?limit=10',
        description: 'Deals',
      },
      {
        name: 'forms',
        url: 'https://api.hubapi.com/forms/v2/forms',
        description: 'Forms',
      },
    ]

    let totalItems = 0
    const successfulEndpoints: string[] = []
    const breakdown: Record<string, number> = {}
    const errors: string[] = []

    for (const endpoint of endpoints) {
      console.log(`\n🔍 Trying ${endpoint.description}`)
      console.log(`URL: ${endpoint.url}`)

      try {
        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${finalToken}`, // ✅ use finalToken here
            'Content-Type': 'application/json',
          },
        })

        console.log(`Status: ${response.status}`)

        if (response.ok) {
          const data = await response.json()
          console.log(`Response keys:`, Object.keys(data))

          // Check for data in different response formats
          const items = data.results || data.objects || data || []
          const count = Array.isArray(items) ? items.length : data.total || 0

          if (count > 0) {
            console.log(`✅ SUCCESS! Found ${count} ${endpoint.description}`)
            successfulEndpoints.push(endpoint.description)
            breakdown[endpoint.name] = count
            totalItems += count
          } else {
            console.log(`⚠️ No ${endpoint.description} found`)
            breakdown[endpoint.name] = 0
          }
        } else {
          const errorText = await response.text()
          console.log(`❌ HTTP ${response.status}:`, errorText.substring(0, 200))
          errors.push(`${endpoint.description}: ${response.status}`)
        }
      } catch (fetchError) {
        console.log(`❌ Network error for ${endpoint.description}:`, fetchError)
        errors.push(`${endpoint.description}: Network error`)
      }
    }

    if (successfulEndpoints.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No HubSpot APIs accessible with this token',
        suggestion: 'Check your HubSpot private app permissions include CRM and Content scopes',
        errors,
        breakdown,
      })
    }

    console.log(`\n✅ Successfully accessed ${successfulEndpoints.length} API endpoints`)
    console.log(`Total items found: ${totalItems}`)

    return NextResponse.json({
      success: true,
      total: totalItems,
      successfulEndpoints,
      breakdown,
      message: `Connected to ${successfulEndpoints.length} HubSpot APIs`,
    })
  } catch (error) {
    console.error('HubSpot free tier test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test HubSpot free tier APIs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
