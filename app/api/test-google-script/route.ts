import { NextResponse } from 'next/server'

export async function GET() {
  const scriptUrl =
    'https://script.google.com/a/macros/smuves.com/s/AKfycbyN2oTyfHdmTyalDmEeOSsY8kTwLhVBRCiVxM4ql2Wys4Qgx5RUgywhLXYZrJhXpKdm/exec'

  try {
    console.log('Testing Google Apps Script connection...')

    // Test 1: Basic fetch
    const response = await fetch(scriptUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; SMUVES-App/1.0)',
      },
      redirect: 'manual',
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location')
      console.log('Redirect location:', location)

      if (location) {
        const redirectResponse = await fetch(location, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; SMUVES-App/1.0)',
          },
        })

        console.log('Redirect response status:', redirectResponse.status)
        console.log(
          'Redirect response headers:',
          Object.fromEntries(redirectResponse.headers.entries())
        )

        if (redirectResponse.ok) {
          const data = await redirectResponse.text()
          console.log('Redirect response data:', data)
          return NextResponse.json({
            success: true,
            method: 'redirect',
            status: redirectResponse.status,
            data: data.substring(0, 500) + (data.length > 500 ? '...' : ''),
          })
        }
      }
    }

    if (response.ok) {
      const data = await response.text()
      console.log('Direct response data:', data)
      return NextResponse.json({
        success: true,
        method: 'direct',
        status: response.status,
        data: data.substring(0, 500) + (data.length > 500 ? '...' : ''),
      })
    }

    return NextResponse.json({
      success: false,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    })
  } catch (error: any) {
    console.error('Test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
