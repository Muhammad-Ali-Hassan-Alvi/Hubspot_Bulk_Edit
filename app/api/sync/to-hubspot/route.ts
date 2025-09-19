import { createClient } from '@/lib/supabase/server'
// import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { type NextRequest, NextResponse } from 'next/server'

const hubspotFieldMapping: { [key: string]: string } = {
  name: 'name',
  html_title: 'htmlTitle',
  meta_description: 'metaDescription',
  slug: 'slug',
  body_content: 'body',
}

export async function POST(request: NextRequest) {
  // Always initialize these arrays to guarantee they exist in the response.
  const succeeded: any[] = []
  const failed: any[] = []

  try {
    const { userId, hubspotToken, changes } = await request.json()

    if (!userId || !hubspotToken || !Array.isArray(changes)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields.', succeeded, failed }, // Include arrays in error response
        { status: 400 }
      )
    }

    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', succeeded, failed }, // Include arrays in error response
        { status: 401 }
      )
    }

    const pageIdsToUpdate = changes.map(c => c.pageId)
    const { data: pageTypesData, error: pageTypesError } = await supabase
      .from('hubspot_page_backups')
      .select('hubspot_page_id, page_type')
      .in('hubspot_page_id', pageIdsToUpdate)

    if (pageTypesError) throw pageTypesError

    const pageTypeMap = new Map(pageTypesData.map(p => [p.hubspot_page_id, p.page_type]))

    for (const change of changes) {
      const pageId = change.pageId
      const pageType = pageTypeMap.get(pageId)

      if (!pageType) {
        failed.push({ pageId, name: change.name, error: 'Page type not found in database backup.' })
        continue
      }

      let updateUrl = ''
      if (pageType === 'Site Page') {
        updateUrl = `https://api.hubapi.com/cms/v3/pages/site-pages/${pageId}`
      } else if (pageType === 'Landing Page') {
        updateUrl = `https://api.hubapi.com/cms/v3/pages/landing-pages/${pageId}`
      } else {
        failed.push({
          pageId,
          name: change.name,
          error: `Syncing for page type '${pageType}' is not supported.`,
        })
        continue
      }

      const payload: { [key: string]: any } = {}
      for (const [fieldKey, value] of Object.entries(change.fields)) {
        const hubspotKey = hubspotFieldMapping[fieldKey]
        if (hubspotKey) {
          payload[hubspotKey] = (value as any).new
        }
      }

      if (Object.keys(payload).length === 0) continue

      try {
        const response = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (response.ok) {
          const result = await response.json()
          succeeded.push({ pageId, name: change.name, url: result.url })
        } else {
          const errorData = await response.json()
          failed.push({
            pageId,
            name: change.name,
            error: errorData.message || `HTTP Error ${response.status}`,
          })
        }
      } catch (error) {
        failed.push({
          pageId,
          name: change.name,
          error: error instanceof Error ? error.message : 'Network error',
        })
      }
    }

    // This is the successful response that the frontend expects.
    return NextResponse.json({
      success: true,
      message: 'Sync process completed.',
      succeeded, // This array will always exist
      failed, // This array will always exist
    })
  } catch (error) {
    console.error('Sync to HubSpot error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
    return NextResponse.json(
      // Ensure arrays are included even in the final catch block
      { success: false, error: `Failed to sync changes: ${errorMessage}`, succeeded, failed },
      { status: 500 }
    )
  }
}
