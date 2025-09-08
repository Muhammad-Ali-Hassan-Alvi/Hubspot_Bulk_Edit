import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export async function POST(request: NextRequest) {
  try {
    const { userId, contentType, importData, changes } = await request.json()

    if (!userId || !importData || !Array.isArray(importData)) {
      return NextResponse.json(
        { success: false, error: 'Missing required data' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { success: false, error: 'HubSpot not connected' },
        { status: 400 }
      )
    }

    let syncedCount = 0
    let failedCount = 0
    const errors = []

    for (const importItem of importData) {
      try {
        const updateData = { ...importItem }
        delete updateData.id

        const response = await fetch(`https://api.hubapi.com/cms/v3/pages/${importItem.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${userSettings.hubspot_token_encrypted}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        })

        if (response.ok) {
          syncedCount++
          
          await supabase.from('hubspot_pages').upsert({
            id: importItem.id,
            user_id: userId,
            ...updateData,
            updated_at: new Date().toISOString()
          })

        } else {
          failedCount++
          const errorData = await response.text()
          errors.push({
            pageId: importItem.id,
            error: errorData
          })
        }
      } catch (error) {
        failedCount++
        errors.push({
          pageId: importItem.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: 'import_sync_to_hubspot',
      resource_type: contentType,
      details: {
        total_items: importData.length,
        synced_count: syncedCount,
        failed_count: failedCount,
        errors: errors
      }
    })

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      failed: failedCount,
      errors: errors
    })

  } catch (error) {
    console.error('Error syncing to HubSpot:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync to HubSpot' },
      { status: 500 }
    )
  }
}

