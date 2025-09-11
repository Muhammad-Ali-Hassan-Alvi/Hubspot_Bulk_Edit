'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export async function logExportActivityAction(
  exportType: 'csv' | 'sheets',
  details: {
    content_type: string
    items_count: number
    columns_exported?: string[]
    filename?: string
    file_size_bytes?: number
    tab_name?: string
    sheet_url?: string
    sheet_name?: string
  }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const supabase = createClient()

    const logData = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: user.id,
      action_type: exportType === 'csv' ? 'export_csv' : 'export_sheets',
      resource_type: 'export',
      resource_id: null,
      details: {
        export_type: exportType,
        ...details,
        timestamp: new Date().toISOString(),
        status: 'success',
      },
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('audit_logs').insert(logData)

    if (error) {
      console.error('Error logging export activity:', error)
      throw error
    }

    console.log('Export activity logged successfully:', exportType)
    return { success: true }
  } catch (error) {
    console.error('Failed to log export activity:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
