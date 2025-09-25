import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// import { getAuthenticatedUser } from '@/lib/store/serverUtils'

async function handleStateChange(
  pageId: string,
  hubspotToken: string,
  newState: 'DRAFT' | 'PUBLISHED_OR_SCHEDULED',
  contentType: string
) {
  // Blogs don't have publish actions, handle them differently
  if (contentType === 'blogs') {
    console.log('Blogs do not support publish actions, skipping state change')
    return { success: true, message: 'Blogs do not support state changes' }
  }

  const action = newState === 'DRAFT' ? 'unpublish' : 'push-live'
  let objectType = 'pages/landing-pages'

  if (contentType) {
    switch (contentType) {
      case 'landing-pages':
        objectType = 'pages/landing-pages'
        break
      case 'site-pages':
        objectType = 'pages/site-pages'
        break
      case 'blog-posts':
        objectType = 'blogs/posts'
        break
      case 'tags':
        objectType = 'blogs/tags'
        break
      case 'authors':
        objectType = 'blogs/authors'
        break
      case 'url-redirects':
        objectType = 'url-redirects'
        break
      case 'hubdb-tables':
        objectType = 'hubdb/tables'
        break
      default:
        objectType = 'pages/landing-pages'
    }
  }

  const url = `https://api.hubapi.com/cms/v3/${objectType}/${pageId}/publish-actions/${action}`
  console.log('Publish action URL:', url)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hubspotToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Publish action failed:', response.status, errorText)
    throw new Error(`Failed to ${action} page in HubSpot: ${response.status} ${errorText}`)
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const { userId, pageId, updates, hubspotToken, sheetId, contentType } = await request.json()

    if (!userId || !pageId || !updates || !hubspotToken) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const otherUpdates = { ...updates }
    let updatedPageData = null
    const changes = []

    // First, let's check if the page exists and get its current state
    let currentPage = null
    try {
      const checkEndpoint =
        contentType === 'blogs'
          ? `https://api.hubapi.com/cms/v3/blog-settings/settings/${pageId}`
          : contentType === 'blog-posts'
            ? `https://api.hubapi.com/cms/v3/blogs/posts/${pageId}`
            : contentType === 'site-pages'
              ? `https://api.hubapi.com/cms/v3/pages/site-pages/${pageId}`
              : contentType === 'tags'
                ? `https://api.hubapi.com/cms/v3/blogs/tags/${pageId}`
                : contentType === 'authors'
                  ? `https://api.hubapi.com/cms/v3/blogs/authors/${pageId}`
                  : contentType === 'url-redirects'
                    ? `https://api.hubapi.com/cms/v3/url-redirects/${pageId}`
                    : contentType === 'hubdb-tables'
                      ? `https://api.hubapi.com/cms/v3/hubdb/tables/${pageId}`
                      : `https://api.hubapi.com/cms/v3/pages/landing-pages/${pageId}`

      console.log('Checking page existence at:', checkEndpoint)
      const checkResponse = await fetch(checkEndpoint, {
        headers: { Authorization: `Bearer ${hubspotToken}` },
      })

      if (!checkResponse.ok) {
        throw new Error(`Page not found: ${checkResponse.status} ${await checkResponse.text()}`)
      }

      currentPage = await checkResponse.json()
      console.log('Page found:', {
        id: currentPage.id,
        name: currentPage.name,
        state: currentPage.state,
      })
    } catch (error) {
      console.error('Error checking page:', error)
      return NextResponse.json({
        success: false,
        error: 'Page not found or inaccessible',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    if (otherUpdates.state) {
      const newState = otherUpdates.state
      delete otherUpdates.state

      // Only handle state changes for non-blog content types
      if (contentType !== 'blogs') {
        await handleStateChange(pageId, hubspotToken, newState, contentType)
        changes.push({
          field_name: 'state',
          old_value: currentPage?.state || 'UNKNOWN',
          new_value: newState,
          change_type: 'update',
        })
      } else {
        console.log('Skipping state change for blogs content type')
      }
    }

    if (Object.keys(otherUpdates).length > 0) {
      // Determine correct endpoint based on content type
      let endpointsToTry = []

      if (contentType) {
        switch (contentType) {
          case 'landing-pages':
            endpointsToTry = [`https://api.hubapi.com/cms/v3/pages/landing-pages/${pageId}`]
            break
          case 'site-pages':
            endpointsToTry = [`https://api.hubapi.com/cms/v3/pages/site-pages/${pageId}`]
            break
          case 'blog-posts':
            endpointsToTry = [`https://api.hubapi.com/cms/v3/blogs/posts/${pageId}`]
            break
          case 'blogs':
            endpointsToTry = [`https://api.hubapi.com/cms/v3/blog-settings/settings/${pageId}`]
            break
          case 'tags':
            endpointsToTry = [`https://api.hubapi.com/cms/v3/blogs/tags/${pageId}`]
            break
          case 'authors':
            endpointsToTry = [`https://api.hubapi.com/cms/v3/blogs/authors/${pageId}`]
            break
          case 'url-redirects':
            endpointsToTry = [`https://api.hubapi.com/cms/v3/url-redirects/${pageId}`]
            break
          case 'hubdb-tables':
            endpointsToTry = [`https://api.hubapi.com/cms/v3/hubdb/tables/${pageId}`]
            break
          default:
            endpointsToTry = [
              `https://api.hubapi.com/cms/v3/pages/landing-pages/${pageId}`,
              `https://api.hubapi.com/cms/v3/pages/site-pages/${pageId}`,
              `https://api.hubapi.com/cms/v3/blogs/posts/${pageId}`,
              `https://api.hubapi.com/cms/v3/blog-settings/settings/${pageId}`,
            ]
        }
      } else {
        endpointsToTry = [
          `https://api.hubapi.com/cms/v3/pages/landing-pages/${pageId}`,
          `https://api.hubapi.com/cms/v3/pages/site-pages/${pageId}`,
          `https://api.hubapi.com/cms/v3/blogs/posts/${pageId}`,
          `https://api.hubapi.com/cms/v3/blogs/blogs/${pageId}`,
        ]
      }

      let getResponse = null
      let actualEndpoint = ''
      for (const endpoint of endpointsToTry) {
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${hubspotToken}` },
        })
        if (res.ok) {
          getResponse = res
          actualEndpoint = endpoint
          break
        }
      }

      if (!getResponse || !getResponse.ok) {
        const errorText = getResponse ? await getResponse.text() : 'No endpoint succeeded'
        throw new Error(`Failed to fetch page from HubSpot: ${getResponse?.status} ${errorText}`)
      }

      const currentPage = await getResponse.json()
      if (currentPage.archivedAt && currentPage.archivedAt !== '1970-01-01T00:00:00Z') {
        return NextResponse.json({
          success: false,
          error: 'Cannot update archived page',
        })
      }

      for (const [field, newValue] of Object.entries(otherUpdates)) {
        const oldValue = currentPage[field]
        if (oldValue !== newValue) {
          changes.push({
            field_name: field,
            old_value: oldValue,
            new_value: newValue,
            change_type: 'update',
          })
        }
      }

      if (changes.filter(c => c.field_name !== 'state').length > 0) {
        const updateResponse = await fetch(actualEndpoint, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(otherUpdates),
        })

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json()
          throw new Error(errorData.message || 'Failed to update page in HubSpot')
        }
        updatedPageData = await updateResponse.json()
      } else {
        updatedPageData = currentPage
      }
    }

    if (!updatedPageData) {
      // Use the correct endpoint based on content type
      let finalEndpoint = `https://api.hubapi.com/cms/v3/pages/landing-pages/${pageId}`

      if (contentType) {
        switch (contentType) {
          case 'landing-pages':
            finalEndpoint = `https://api.hubapi.com/cms/v3/pages/landing-pages/${pageId}`
            break
          case 'site-pages':
            finalEndpoint = `https://api.hubapi.com/cms/v3/pages/site-pages/${pageId}`
            break
          case 'blog-posts':
            finalEndpoint = `https://api.hubapi.com/cms/v3/blogs/posts/${pageId}`
            break
          case 'blogs':
            finalEndpoint = `https://api.hubapi.com/cms/v3/blog-settings/settings/${pageId}`
            break
          case 'tags':
            finalEndpoint = `https://api.hubapi.com/cms/v3/blogs/tags/${pageId}`
            break
          case 'authors':
            finalEndpoint = `https://api.hubapi.com/cms/v3/blogs/authors/${pageId}`
            break
          case 'url-redirects':
            finalEndpoint = `https://api.hubapi.com/cms/v3/url-redirects/${pageId}`
            break
          case 'hubdb-tables':
            finalEndpoint = `https://api.hubapi.com/cms/v3/hubdb/tables/${pageId}`
            break
        }
      }

      const finalStateResponse = await fetch(finalEndpoint, {
        headers: { Authorization: `Bearer ${hubspotToken}` },
      })
      updatedPageData = await finalStateResponse.json()
    }

    if (changes.length > 0) {
      for (const change of changes) {
        await supabase.from('change_history').insert({
          user_id: userId,
          page_id: pageId,
          field_name: change.field_name,
          old_value: change.old_value,
          new_value: change.new_value,
          change_type: change.change_type,
          changed_by: userId,
        })
      }

      const today = new Date().toISOString().split('T')[0]
      await supabase.from('page_snapshots').upsert({
        user_id: userId,
        page_id: pageId,
        page_name: updatedPageData.name,
        page_slug: updatedPageData.slug,
        page_url: updatedPageData.url,
        page_content: updatedPageData,
        snapshot_date: today,
      })

      if (sheetId) {
        await updateGoogleSheets(userId, sheetId, updatedPageData, changes)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${changes.length} field(s)`,
      changes: changes.length,
      updatedPage: updatedPageData,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function updateGoogleSheets(
  userId: string,
  sheetId: string,
  updatedPage: any,
  changes: any[]
) {
  try {
    const supabase = await createClient()

    const { data: tokenData, error: tokenError } = await supabase
      .from('user_tokens')
      .select('google_refresh_token')
      .eq('user_id', userId)
      .single()

    if (tokenError || !tokenData?.google_refresh_token) {
      throw new Error('Google refresh token not found')
    }

    const accessToken = await refreshGoogleToken(tokenData.google_refresh_token)
    const today = new Date().toISOString().split('T')[0]
    const sheetData = [
      ['Page ID', 'Page Name', 'Page URL', 'Field Changed', 'Old Value', 'New Value', 'Timestamp'],
      ...changes.map(change => [
        updatedPage.id,
        updatedPage.name,
        updatedPage.url,
        change.field_name,
        String(change.old_value),
        String(change.new_value),
        new Date().toISOString(),
      ]),
    ]
    await updateSheetTab(sheetId, today, sheetData, accessToken)
  } catch (error) {
    console.error('Google Sheets update error:', error)
  }
}

async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh Google token')
  }

  const data = await response.json()
  return data.access_token
}

async function updateSheetTab(
  sheetId: string,
  tabName: string,
  data: any[][],
  accessToken: string
) {
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: tabName,
              },
            },
          },
        ],
      }),
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      // Ignore if tab already exists
    }
  }

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tabName}!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: data.slice(1), // Append rows, excluding header
      }),
    }
  )
}
