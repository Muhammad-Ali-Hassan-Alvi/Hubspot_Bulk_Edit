/**
 * Export logging utility functions
 * This module provides functions to log user exports to the database
 */

import { UserExportStatus, UserExportStatusEnum } from '@/lib/constants'

export interface ExportLogData {
  contentType: number
  exportType: 'csv' | 'google-sheets'
  sheetId?: string
  tabId?: string
  tabName?: string
  itemsCount?: number
  columnsExported?: string[]
  metadata?: Record<string, any>
  userId?: string
  snapshotData?: any[] // The actual exported data to be saved as snapshot
  status?: UserExportStatus
}

/**
 * Log an export to the user_exports table
 */
export async function saveUserExport(
  data: ExportLogData
): Promise<{ success: boolean; exportId?: number }> {
  try {
    const response = await fetch('/api/save-user-exports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!result.success) {
      console.error('Failed to log export:', result.error)
      return { success: false }
    }

    console.log('Export logged successfully:', result.exportId)

    // If snapshot data is provided, save it
    if (data.snapshotData && result.exportId) {
      const snapshotSaved = await saveExportSnapshot(result.exportId, data.snapshotData)
      if (!snapshotSaved) {
        console.warn('Export logged but snapshot failed to save')
      }
    }

    return { success: true, exportId: result.exportId }
  } catch (error) {
    console.error('Error logging export:', error)
    return { success: false }
  }
}

/**
 * Save export snapshot data to user_export_snaphots table
 */
export async function saveExportSnapshot(
  userExportId: number,
  snapshotData: any[]
): Promise<boolean> {
  try {
    const response = await fetch('/api/save-export-snapshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userExportId,
        snapshotData,
        versionNumber: 1,
        status: UserExportStatusEnum.ACTIVE,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      console.error('Failed to save export snapshot:', result.error)
      return false
    }

    console.log('Export snapshot saved successfully:', result.snapshotId)
    return true
  } catch (error) {
    console.error('Error saving export snapshot:', error)
    return false
  }
}

/**
 * Get user export history
 */
export async function getUserExports(options?: {
  limit?: number
  offset?: number
  exportType?: 'csv' | 'sheets'
}): Promise<any[]> {
  try {
    const params = new URLSearchParams()
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.offset) params.set('offset', options.offset.toString())
    if (options?.exportType) params.set('exportType', options.exportType)

    const response = await fetch(`/api/save-user-exports?${params.toString()}`)
    const result = await response.json()

    if (!result.success) {
      console.error('Failed to fetch exports:', result.error)
      return []
    }

    return result.exports || []
  } catch (error) {
    console.error('Error fetching exports:', error)
    return []
  }
}
