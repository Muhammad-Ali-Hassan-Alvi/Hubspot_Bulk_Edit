/**
 * Export logging utility functions
 * This module provides functions to log user exports to the database
 */

export interface ExportLogData {
  contentType: number
  exportType: 'csv' | 'google-sheets'
  sheetId?: string
  tabId?: string
  tabName?: string
  itemsCount?: number
  columnsExported?: string[]
  filename?: string
  metadata?: Record<string, any>
  userId?: string
}

/**
 * Log an export to the user_exports table
 */
export async function saveUserExport(data: ExportLogData): Promise<boolean> {
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
      return false
    }

    console.log('Export logged successfully:', result.exportId)
    return true
  } catch (error) {
    console.error('Error logging export:', error)
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
