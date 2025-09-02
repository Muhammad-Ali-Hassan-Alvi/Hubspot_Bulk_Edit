import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('=== HubSpot Test API Called ===')

  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid token is required' },
        { status: 400 }
      )
    }

    console.log('Testing HubSpot connection...')

    // Test the token by making a simple API call
    const response = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + token, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    console.log(`HubSpot test response status: ${response.status}`)

    if (response.ok) {
      const data = await response.json()
      console.log('Token info:', data)

      return NextResponse.json({
        success: true,
        message: 'HubSpot connection successful',
        scopes: data.scopes || [],
        hubId: data.hub_id,
      })
    } else {
      const errorText = await response.text()
      console.log('HubSpot test error:', errorText)

      return NextResponse.json({
        success: false,
        error: 'Invalid HubSpot token or insufficient permissions',
        details: errorText.substring(0, 200),
      })
    }
  } catch (error) {
    console.error('HubSpot test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test HubSpot connection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
