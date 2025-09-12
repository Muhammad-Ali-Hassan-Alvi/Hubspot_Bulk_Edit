import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export async function POST(request: NextRequest) {
  try {
    const { userId, contentType, importData, changes, isPollingSync = false } = await request.json()

    if (!userId || !importData || !Array.isArray(importData)) {
      return NextResponse.json({ success: false, error: 'Missing required data' }, { status: 400 })
    }

    const supabase = createClient()
    const user = await getAuthenticatedUser()

    if (user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('hubspot_token_encrypted')
      .eq('user_id', userId)
      .single()

    if (!userSettings?.hubspot_token_encrypted) {
      return NextResponse.json({ success: false, error: 'HubSpot not connected' }, { status: 400 })
    }

    let syncedCount = 0
    let failedCount = 0
    const errors = []

    // If we have changes, only sync those specific changes
    if (changes && Array.isArray(changes) && changes.length > 0) {
      // Get page types for all changes
      const pageIdsToUpdate = changes.map(c => c.pageId)
      console.log('Looking for page types for page IDs:', pageIdsToUpdate)

      // Try page_snapshots table first
      let pageTypesData
      const result = await supabase
        .from('page_snapshots')
        .select('hubspot_page_id, content_type')
        .in('hubspot_page_id', pageIdsToUpdate)

      pageTypesData = result.data
      const pageTypesError = result.error

      console.log('Page types data from page_snapshots:', pageTypesData)

      // If no data found, try hubspot_page_backups table
      if (!pageTypesData || pageTypesData.length === 0) {
        console.log('No data in page_snapshots, trying hubspot_page_backups...')
        const { data: backupData, error: backupError } = await supabase
          .from('hubspot_page_backups')
          .select('hubspot_page_id, page_type')
          .in('hubspot_page_id', pageIdsToUpdate)

        if (backupError) {
          console.error('Error fetching from hubspot_page_backups:', backupError)
        } else {
          console.log('Page types data from hubspot_page_backups:', backupData)
          pageTypesData =
            backupData?.map(p => ({
              hubspot_page_id: p.hubspot_page_id,
              content_type: p.page_type,
            })) || []
        }
      }

      if (pageTypesError) {
        console.error('Error fetching page types:', pageTypesError)
        return NextResponse.json(
          { success: false, error: 'Failed to fetch page types' },
          { status: 500 }
        )
      }

      console.log('Final page types data:', pageTypesData)

      const pageTypeMap = new Map(
        (pageTypesData || []).map(p => [p.hubspot_page_id, p.content_type])
      )

      for (const change of changes) {
        try {
          const pageId = change.pageId
          const pageType = pageTypeMap.get(pageId)

          if (!pageType) {
            failedCount++
            errors.push({
              pageId: change.pageId,
              error: 'Page type not found in database backup.',
            })
            continue
          }

          // Determine the correct HubSpot API endpoint
          let updateUrl = ''
          console.log(`Page ${pageId} has content_type: ${pageType}`)

          if (pageType === 'Site Page' || pageType === 'site-pages') {
            updateUrl = `https://api.hubapi.com/cms/v3/pages/site-pages/${pageId}`
          } else if (pageType === 'Landing Page' || pageType === 'landing-pages') {
            updateUrl = `https://api.hubapi.com/cms/v3/pages/landing-pages/${pageId}`
          } else {
            failedCount++
            errors.push({
              pageId: change.pageId,
              error: `Syncing for page type '${pageType}' is not supported.`,
            })
            continue
          }

          // Build the update data from the change fields
          const updateData: { [key: string]: any } = {}

          // HubSpot field mapping
          const hubspotFieldMapping: { [key: string]: string } = {
            name: 'name',
            html_title: 'htmlTitle',
            meta_description: 'metaDescription',
            slug: 'slug',
            body_content: 'body',
          }

          for (const [fieldName, fieldData] of Object.entries(change.fields)) {
            // Use the database field name to map to HubSpot field
            const hubspotField = hubspotFieldMapping[fieldName] || fieldName
            const fieldValue = fieldData as { new: any }
            updateData[hubspotField] = fieldValue.new
          }

          console.log(
            `Attempting to update HubSpot page ${pageId} (${pageType}) with data:`,
            updateData
          )

          const response = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${userSettings.hubspot_token_encrypted}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          })

          console.log(
            `HubSpot API response for page ${pageId}:`,
            response.status,
            response.statusText
          )

          if (response.ok) {
            syncedCount++
            console.log(`Successfully updated page ${pageId}`)

            // Update the local database with the changes
            await supabase.from('hubspot_pages').upsert({
              id: pageId,
              user_id: userId,
              ...updateData,
              updated_at: new Date().toISOString(),
            })
          } else {
            failedCount++
            const errorData = await response.text()
            console.log(`Failed to update page ${pageId}:`, errorData)
            errors.push({
              pageId: pageId,
              error: `HTTP ${response.status}: ${errorData}`,
            })
          }
        } catch (error) {
          failedCount++
          errors.push({
            pageId: change.pageId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    } else {
      // Fallback: if no changes provided, sync all import data (legacy behavior)
      for (const importItem of importData) {
        try {
          const updateData = { ...importItem }
          delete updateData.id

          const response = await fetch(`https://api.hubapi.com/cms/v3/pages/${importItem.id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${userSettings.hubspot_token_encrypted}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          })

          if (response.ok) {
            syncedCount++

            await supabase.from('hubspot_pages').upsert({
              id: importItem.id,
              user_id: userId,
              ...updateData,
              updated_at: new Date().toISOString(),
            })
          } else {
            failedCount++
            const errorData = await response.text()
            errors.push({
              pageId: importItem.id,
              error: errorData,
            })
          }
        } catch (error) {
          failedCount++
          errors.push({
            pageId: importItem.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: isPollingSync ? 'polling_sync_to_hubspot' : 'import_sync_to_hubspot',
      resource_type: contentType,
      details: {
        total_items: changes && changes.length > 0 ? changes.length : importData.length,
        synced_count: syncedCount,
        failed_count: failedCount,
        errors: errors,
        is_polling_sync: isPollingSync,
        changes_count: changes?.length || 0,
      },
    })

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      failed: failedCount,
      errors: errors,
    })
  } catch (error) {
    console.error('Error syncing to HubSpot:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync to HubSpot' },
      { status: 500 }
    )
  }
}
