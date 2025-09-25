import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { pageId, hubspotToken } = await request.json()

    if (!pageId || !hubspotToken) {
      return NextResponse.json(
        { success: false, error: 'Missing pageId or hubspotToken' },
        { status: 400 }
      )
    }

    const endpointsToTry = [
      `https://api.hubapi.com/cms/v3/pages/${pageId}`,
      `https://api.hubapi.com/cms/v3/blogs/posts/${pageId}`,
      `https://api.hubapi.com/cms/v3/blogs/blogs/${pageId}`,
    ]

    const results = []

    for (const endpoint of endpointsToTry) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json',
          },
        })

        results.push({
          endpoint,
          status: response.status,
          ok: response.ok,
          exists: response.ok,
        })
      } catch (error) {
        results.push({
          endpoint,
          status: 'error',
          ok: false,
          exists: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      pageId,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
