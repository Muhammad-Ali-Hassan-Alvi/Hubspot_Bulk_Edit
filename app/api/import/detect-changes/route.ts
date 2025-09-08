import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export async function POST(request: NextRequest) {
  try {
    const { userId, contentType, importData } = await request.json()

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

    const changes = []
    
    for (const importItem of importData) {
      if (!importItem.id) continue

      try {
        const { data: existingItem } = await supabase
          .from('hubspot_pages')
          .select('*')
          .eq('id', importItem.id)
          .eq('user_id', userId)
          .single()

        if (existingItem) {
          const itemChanges = []
          
          Object.keys(importItem).forEach(key => {
            if (key === 'id') return
            
            const existingValue = existingItem[key]
            const newValue = importItem[key]
            
            if (existingValue !== newValue && newValue !== '' && newValue != null) {
              itemChanges.push({
                field: key,
                oldValue: existingValue || '',
                newValue: newValue || '',
                pageId: importItem.id
              })
            }
          })

          if (itemChanges.length > 0) {
            changes.push({
              pageId: importItem.id,
              pageName: importItem.name || importItem.id,
              changes: itemChanges
            })
          }
        } else {
          changes.push({
            pageId: importItem.id,
            pageName: importItem.name || importItem.id,
            changes: [{
              field: 'status',
              oldValue: '',
              newValue: 'NEW_ITEM',
              pageId: importItem.id
            }]
          })
        }
      } catch (error) {
        console.error(`Error processing item ${importItem.id}:`, error)
      }
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: 'import_changes_detected',
      resource_type: contentType,
      details: {
        total_items: importData.length,
        items_with_changes: changes.length,
        changes_detected: changes.reduce((acc, item) => acc + item.changes.length, 0)
      }
    })

    return NextResponse.json({
      success: true,
      changes: changes.flatMap(item => item.changes),
      summary: {
        totalItems: importData.length,
        itemsWithChanges: changes.length,
        totalChanges: changes.reduce((acc, item) => acc + item.changes.length, 0)
      }
    })

  } catch (error) {
    console.error('Error detecting changes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to detect changes' },
      { status: 500 }
    )
  }
}

