import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid token is required' },
        { status: 400 }
      )
    }

    const response = await fetch('https://api.hubapi.com/account-info/v3/details', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        success: true,
        message: 'HubSpot connection successful',
        portalName: data.companyName,
        portalId: data.portalId,
      })
    } else {
      const errorData = await response.json()
      return NextResponse.json(
        { success: false, error: errorData.message || 'Invalid token or permissions' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      {
        success: false,
        error: 'An internal server error occurred while testing the connection.',
      },
      { status: 500 }
    )
  }
}
