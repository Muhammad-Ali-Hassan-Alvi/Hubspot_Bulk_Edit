import { createClient } from '@/lib/supabase/server'

export interface AuditLogData {
  user_id: string
  action_type: string
  resource_type: string
  resource_id?: string | null
  details: Record<string, any>
}

export interface AuditLogOptions {
  generateId?: boolean
  timestamp?: string
}

/**
 * Centralized audit logging service
 * Handles all audit log entries to the database
 */
export class AuditLogger {
  private supabase = createClient()

  /**
   * Log an activity to the audit logs table
   */
  async log(data: AuditLogData, options: AuditLogOptions = {}): Promise<{ success: boolean; error?: string }> {
    try {
      const logEntry = {
        ...data,
        id: options.generateId !== false ? this.generateId(data.action_type) : undefined,
        created_at: options.timestamp || new Date().toISOString(),
      }

      const { error } = await this.supabase.from('audit_logs').insert(logEntry)

      if (error) {
        console.error('Failed to log audit activity:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Audit logging error:', error)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Log CSV data access
   */
  async logCsvDataAccess(
    userId: string,
    fileName: string,
    rowsCount: number,
    headers: string[]
  ): Promise<{ success: boolean; error?: string }> {
    return this.log({
      user_id: userId,
      action_type: 'read_csv_data',
      resource_type: 'csv',
      resource_id: fileName,
      details: {
        filename: fileName,
        rows_count: rowsCount,
        headers,
        timestamp: new Date().toISOString(),
        status: 'success',
      },
    })
  }

  /**
   * Log CSV export activity
   */
  async logCsvExport(
    userId: string,
    contentType: string,
    itemsCount: number,
    columns: string[],
    filename: string,
    fileSizeBytes: number
  ): Promise<{ success: boolean; error?: string }> {
    return this.log({
      user_id: userId,
      action_type: 'export_csv',
      resource_type: 'export',
      resource_id: null,
      details: {
        export_type: 'csv',
        content_type: contentType,
        items_count: itemsCount,
        columns_exported: columns,
        filename,
        file_size_bytes: fileSizeBytes,
        timestamp: new Date().toISOString(),
        status: 'success',
      },
    })
  }

  /**
   * Log Google Sheets data import
   */
  async logGoogleSheetsImport(
    userId: string,
    sheetId: string,
    tabName: string,
    rowsImported: number
  ): Promise<{ success: boolean; error?: string }> {
    return this.log({
      user_id: userId,
      action_type: 'import_gsheet_data',
      resource_type: 'google_sheet',
      resource_id: sheetId,
      details: {
        sheet_id: sheetId,
        tab_name: tabName,
        rows_imported: rowsImported,
      },
    })
  }

  /**
   * Log bulk editing activity
   */
  async logBulkEditing(
    userId: string,
    action: string,
    changes: number,
    successful: number,
    failed: number,
    contentType: string,
    wasSuccessful: boolean,
    errorMessage?: string,
    updatesApplied?: Record<string, any>,
    selectedPageIds?: string[],
    pageChanges?: any[]
  ): Promise<{ success: boolean; error?: string }> {
    return this.log({
      user_id: userId,
      action_type: action,
      resource_type: 'bulk_editing',
      details: {
        changes_count: changes,
        successful_updates: successful,
        failed_updates: failed,
        content_type: contentType,
        was_successful: wasSuccessful,
        error_message: errorMessage,
        updates_applied: updatesApplied || {},
        fields_changed: updatesApplied ? Object.keys(updatesApplied) : [],
        selected_page_ids: selectedPageIds || [],
        page_changes: pageChanges || [],
        timestamp: new Date().toISOString(),
      },
    })
  }

  /**
   * Log sync to HubSpot activity
   */
  async logSyncToHubSpot(
    userId: string,
    syncType: string,
    itemsCount: number,
    successful: number,
    failed: number,
    details?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    return this.log({
      user_id: userId,
      action_type: 'sync_to_hubspot',
      resource_type: 'sync',
      resource_id: null,
      details: {
        sync_type: syncType,
        items_count: itemsCount,
        successful_updates: successful,
        failed_updates: failed,
        timestamp: new Date().toISOString(),
        status: failed === 0 ? 'success' : 'partial_success',
        ...details,
      },
    })
  }

  /**
   * Generate a unique ID for audit log entries
   */
  private generateId(actionType: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `${actionType}_${timestamp}_${random}`
  }
}

// Export a singleton instance
export const auditLogger = new AuditLogger()
