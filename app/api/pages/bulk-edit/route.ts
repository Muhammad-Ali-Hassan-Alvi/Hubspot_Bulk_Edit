import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { getHubSpotAuthHeaders } from '@/lib/hubspot-auth'

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
      case 'Landing Page':
        objectType = 'pages/landing-pages'
        break
      case 'Site Page':
        objectType = 'pages/site-pages'
        break
      case 'Blog Post':
        objectType = 'blogs/posts'
        break
      case 'Tag':
        objectType = 'blogs/tags'
        break
      case 'Author':
        objectType = 'blogs/authors'
        break
      case 'URL Redirect':
        objectType = 'url-redirects'
        break
      case 'HubDB Table':
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
    const { userId, selectedItems, updates, contentType: _contentType } = await request.json()

    if (!userId || !selectedItems || !updates) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get authenticated user and HubSpot token
    const user = await getAuthenticatedUser()
    if (user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Get HubSpot authentication headers (handles token refresh automatically)
    const hubspotHeaders = await getHubSpotAuthHeaders(user.id)
    const hubspotToken = (hubspotHeaders as any).Authorization?.replace('Bearer ', '') || ''

    if (!hubspotToken) {
      return NextResponse.json({ success: false, error: 'HubSpot not connected' }, { status: 400 })
    }

    // Create Supabase client
    const supabase = createClient()

    const results = []
    let successful = 0
    let failed = 0

    // Process each selected item
    for (const { pageId, contentType: itemContentType } of selectedItems) {
      try {
        console.log(`Processing page ID: ${pageId}`)

        const otherUpdates = { ...updates }
        let updatedPageData = null
        const changes = []

        // First, let's check if the page exists and get its current state
        let currentPage = null
        try {
          const checkEndpoint =
            itemContentType === 'Blog'
              ? `https://api.hubapi.com/cms/v3/blog-settings/settings/${pageId}`
              : itemContentType === 'Blog Post'
                ? `https://api.hubapi.com/cms/v3/blogs/posts/${pageId}`
                : itemContentType === 'Site Page'
                  ? `https://api.hubapi.com/cms/v3/pages/site-pages/${pageId}`
                  : itemContentType === 'Tag'
                    ? `https://api.hubapi.com/cms/v3/blogs/tags/${pageId}`
                    : itemContentType === 'Author'
                      ? `https://api.hubapi.com/cms/v3/blogs/authors/${pageId}`
                      : itemContentType === 'URL Redirect'
                        ? `https://api.hubapi.com/cms/v3/url-redirects/${pageId}`
                        : itemContentType === 'HubDB Table'
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
          results.push({ pageId, success: false, error: 'Page not found or inaccessible' })
          failed++
          continue
        }

        if (otherUpdates.state) {
          const newState = otherUpdates.state
          delete otherUpdates.state

          // Only handle state changes for non-blog content types
          if (itemContentType !== 'Blog') {
            await handleStateChange(pageId, hubspotToken, newState, itemContentType)
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

          if (itemContentType) {
            switch (itemContentType) {
              case 'Landing Page':
                endpointsToTry = [`https://api.hubapi.com/cms/v3/pages/landing-pages/${pageId}`]
                break
              case 'Site Page':
                endpointsToTry = [`https://api.hubapi.com/cms/v3/pages/site-pages/${pageId}`]
                break
              case 'Blog Post':
                endpointsToTry = [`https://api.hubapi.com/cms/v3/blogs/posts/${pageId}`]
                break
              case 'Blog':
                endpointsToTry = [`https://api.hubapi.com/cms/v3/blog-settings/settings/${pageId}`]
                break
              case 'Tag':
                endpointsToTry = [`https://api.hubapi.com/cms/v3/blogs/tags/${pageId}`]
                break
              case 'Author':
                endpointsToTry = [`https://api.hubapi.com/cms/v3/blogs/authors/${pageId}`]
                break
              case 'URL Redirect':
                endpointsToTry = [`https://api.hubapi.com/cms/v3/url-redirects/${pageId}`]
                break
              case 'HubDB Table':
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
              `https://api.hubapi.com/cms/v3/blog-settings/settings/${pageId}`,
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
            throw new Error(
              `Failed to fetch page from HubSpot: ${getResponse?.status} ${errorText}`
            )
          }

          const currentPageData = await getResponse.json()
          if (currentPageData.archivedAt && currentPageData.archivedAt !== '1970-01-01T00:00:00Z') {
            throw new Error('Cannot update archived page')
          }

          for (const [field, newValue] of Object.entries(otherUpdates)) {
            const oldValue = currentPageData[field]
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
            updatedPageData = currentPageData
          }
        }

        if (!updatedPageData) {
          // Use the correct endpoint based on content type
          let finalEndpoint = `https://api.hubapi.com/cms/v3/pages/landing-pages/${pageId}`

          if (itemContentType) {
            switch (itemContentType) {
              case 'Landing Page':
                finalEndpoint = `https://api.hubapi.com/cms/v3/pages/landing-pages/${pageId}`
                break
              case 'Site Page':
                finalEndpoint = `https://api.hubapi.com/cms/v3/pages/site-pages/${pageId}`
                break
              case 'Blog Post':
                finalEndpoint = `https://api.hubapi.com/cms/v3/blogs/posts/${pageId}`
                break
              case 'Blog':
                finalEndpoint = `https://api.hubapi.com/cms/v3/blog-settings/settings/${pageId}`
                break
              case 'Tag':
                finalEndpoint = `https://api.hubapi.com/cms/v3/blogs/tags/${pageId}`
                break
              case 'Author':
                finalEndpoint = `https://api.hubapi.com/cms/v3/blogs/authors/${pageId}`
                break
              case 'URL Redirect':
                finalEndpoint = `https://api.hubapi.com/cms/v3/url-redirects/${pageId}`
                break
              case 'HubDB Table':
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
        }

        results.push({ pageId, success: true, changes: changes.length })
        successful++
      } catch (error) {
        console.error(`Error processing page ${pageId}:`, error)
        results.push({
          pageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk update completed: ${successful} successful, ${failed} failed`,
      successful,
      failed,
      results,
    })
  } catch (error) {
    console.error('Bulk edit error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform bulk update',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
