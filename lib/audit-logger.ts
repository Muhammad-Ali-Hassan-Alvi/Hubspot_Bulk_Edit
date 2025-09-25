import { createClient } from '@/lib/supabase/client'

export interface ActivityLogData {
  userId: string
  actionType: string
  resourceType: string
  resourceId?: string
  details?: any
  status?: 'success' | 'failed' | 'warning'
}

export async function logActivity(data: ActivityLogData) {
  try {
    const supabase = createClient()

    const logData = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: data.userId,
      action_type: data.actionType,
      resource_type: data.resourceType,
      resource_id: data.resourceId || null,
      details: {
        ...data.details,
        timestamp: new Date().toISOString(),
        status: data.status || 'success',
      },
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('audit_logs').insert(logData)

    if (error) {
      console.error('Error logging activity:', error)
    } else {
      console.log('Activity logged successfully:', data.actionType)
    }
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

// Predefined activity types for common actions
export const ActivityTypes = {
  HUBSPOT_CONNECT: 'hubspot_connect',
  HUBSPOT_DISCONNECT: 'hubspot_disconnect',
  GOOGLE_CONNECT: 'google_connect',
  GOOGLE_DISCONNECT: 'google_disconnect',
  SITE_LOGIN: 'site_login',
  SITE_LOGOUT: 'site_logout',
  SITE_REGISTER: 'site_register',
  PAGE_VIEW: 'page_view',
  PAGE_EDIT: 'page_edit',
  PAGE_CREATE: 'page_create',
  PAGE_DELETE: 'page_delete',
  BACKUP_CREATE: 'backup_create',
  BACKUP_RESTORE: 'backup_restore',
  BACKUP_DELETE: 'backup_delete',
  SYNC_START: 'sync_start',
  SYNC_COMPLETE: 'sync_complete',
  SYNC_FAILED: 'sync_failed',
  EXPORT_CSV: 'export_csv',
  EXPORT_SHEETS: 'export_sheets',
} as const

// Convenience function for logging export activities
export const logExportActivity = async (
  userId: string,
  exportType: 'csv' | 'sheets',
  details?: any
) => {
  const actionType = exportType === 'csv' ? ActivityTypes.EXPORT_CSV : ActivityTypes.EXPORT_SHEETS

  await logActivity({
    userId,
    actionType,
    resourceType: 'export',
    details: {
      export_type: exportType,
      ...details,
    },
    status: 'success',
  })
}
