import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { getAuthenticatedGoogleClient } from '@/lib/google-auth'
import { saveStructuredBackup, PageData, getFieldValue } from '@/lib/utils/export-utils'

export interface ColumnDefinition {
  label: string
  key: string
}

export interface ExportOptions {
  contentType: string
  filename?: string
  sheetId?: string
  tabName?: string
}

export interface ExportResult {
  success: boolean
  message: string
  rowsAdded: number
  filename?: string
  backupId?: string
  csvContent?: string
  error?: string
}

/**
 * Unified export service that handles both CSV and Google Sheets exports
 */
export class ExportService {
  private supabase = createClient()
  private user: any

  constructor(user: any) {
    this.user = user
  }

  /**
   * Process columns and create column definitions
   */
  private processColumns(columns: string[]): ColumnDefinition[] {
    return columns.map((label: string) => {
      const key = label
        .split(' ')
        .map((word, i) =>
          i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join('')
      return { label, key }
    })
  }

  /**
   * Generate headers with export date
   */
  private generateHeaders(columns: ColumnDefinition[]): string[] {
    return ['Export Date', ...columns.map(c => c.label)]
  }

  /**
   * Process data rows for export
   */
  private processDataRows(
    data: PageData[],
    columns: ColumnDefinition[],
    timestamp: string
  ): any[][] {
    return data.map((row: PageData) => [
      timestamp,
      ...columns.map(({ label, key }) => {
        // If the row already has the label as a key (pre-processed data), use it directly
        if (row[label] !== undefined) {
          const value = row[label]
          return typeof value === 'object' && value !== null ? JSON.stringify(value) : (value ?? '')
        }
        // Otherwise, use the original getFieldValue logic
        const value = getFieldValue(row, label, key)
        return typeof value === 'object' && value !== null ? JSON.stringify(value) : (value ?? '')
      }),
    ])
  }

  /**
   * Generate CSV content
   */
  private generateCSVContent(data: any[], headers: string[]): string {
    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCSVValue = (value: any): string => {
      if (value === null || value === undefined) return ''
      const stringValue = String(value)
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }

    // Create CSV header row
    const headerRow = headers.map(escapeCSVValue).join(',')

    // Check if data is array of arrays (from processDataRows) or array of objects
    const isArrayOfArrays = Array.isArray(data[0])

    let dataRows: string[]
    if (isArrayOfArrays) {
      // Data is array of arrays, join each row directly
      dataRows = data.map(row => row.map(escapeCSVValue).join(','))
    } else {
      // Data is array of objects, map by header names
      dataRows = data.map(row => headers.map(header => escapeCSVValue(row[header])).join(','))
    }

    // Combine header and data rows
    return [headerRow, ...dataRows].join('\n')
  }

  /**
   * Generate filename for export
   */
  private generateFilename(contentType: string, dataLength: number, extension: string): string {
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const contentTypeLabel = contentType.toLowerCase().replace(/\s+/g, '_')
    return `hubspot_${contentTypeLabel}_${dataLength}_items_${date}.${extension}`
  }

  /**
   * Export to CSV
   */
  async exportToCSV(
    data: PageData[],
    columns: string[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        return {
          success: true,
          message: 'No data to export',
          rowsAdded: 0,
        }
      }

      const timestamp = new Date().toISOString()
      const processedColumns = this.processColumns(columns)
      const headers = this.generateHeaders(processedColumns)
      const rows = this.processDataRows(data, processedColumns, timestamp)

      // Generate CSV content
      const csvContent = this.generateCSVContent(rows, headers)
      const filename =
        options.filename || this.generateFilename(options.contentType, data.length, 'csv')

      // Save structured backup
      const backupId = `csv_${options.contentType.toLowerCase().replace(/\s+/g, '_')}_${timestamp}`
      await saveStructuredBackup(
        data,
        this.user.id,
        backupId,
        `csv_${options.contentType}`,
        'default'
      )

      return {
        success: true,
        message: `Exported ${data.length} rows to CSV and saved backup`,
        rowsAdded: data.length,
        filename,
        backupId,
        csvContent,
      }
    } catch (error) {
      console.error('CSV export error:', error)
      return {
        success: false,
        error: 'Failed to export to CSV',
        message: 'Failed to export to CSV',
        rowsAdded: 0,
      }
    }
  }

  /**
   * Export to Google Sheets
   */
  async exportToGoogleSheets(
    data: PageData[],
    columns: string[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      if (!options.sheetId) {
        return {
          success: false,
          error: 'Sheet ID is required for Google Sheets export',
          message: 'Sheet ID is required for Google Sheets export',
          rowsAdded: 0,
        }
      }

      if (!Array.isArray(data) || data.length === 0) {
        return {
          success: true,
          message: 'No data to export',
          rowsAdded: 0,
        }
      }

      const timestamp = new Date().toISOString()
      const processedColumns = this.processColumns(columns)
      const headers = this.generateHeaders(processedColumns)
      const rows = this.processDataRows(data, processedColumns, timestamp)

      // Get authenticated Google client
      const { oauth2Client } = await getAuthenticatedGoogleClient(this.supabase, this.user.id)
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client })

      // Handle target sheet/tab
      let targetSheetId = 0
      let sheetRangePrefix = ''
      const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: options.sheetId })
      const existingSheets = spreadsheetInfo.data.sheets ?? []

      if (options.tabName) {
        const matchedSheet = existingSheets.find(
          s => s.properties?.title?.toLowerCase() === options.tabName!.toLowerCase()
        )
        if (matchedSheet) {
          targetSheetId = matchedSheet.properties?.sheetId ?? 0
          sheetRangePrefix = `'${options.tabName}'!`
        } else {
          const addSheetRes = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: options.sheetId,
            requestBody: { requests: [{ addSheet: { properties: { title: options.tabName } } }] },
          })
          const addedSheet = addSheetRes.data.replies?.[0]?.addSheet?.properties
          targetSheetId = addedSheet?.sheetId ?? 0
          sheetRangePrefix = `'${options.tabName}'!`
        }
      }

      // Clear and insert new data
      await sheets.spreadsheets.values.clear({
        spreadsheetId: options.sheetId,
        range: `${sheetRangePrefix}A:Z`,
      })
      await sheets.spreadsheets.values.update({
        spreadsheetId: options.sheetId,
        range: `${sheetRangePrefix}A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers, ...rows] },
      })

      // Style header row
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: options.sheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: targetSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: headers.length,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    textFormat: { bold: true },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
          ],
        },
      })

      // Save structured backup
      const backupId = `${options.sheetId}_${options.tabName ?? 'default'}_${timestamp}`
      await saveStructuredBackup(data, this.user.id, backupId, options.sheetId, options.tabName)

      return {
        success: true,
        message: `Exported ${data.length} rows to Google Sheets and saved backup`,
        rowsAdded: data.length,
        backupId,
      }
    } catch (error) {
      console.error('Google Sheets export error:', error)
      return {
        success: false,
        error: 'Failed to export to Google Sheets',
        message: 'Failed to export to Google Sheets',
        rowsAdded: 0,
      }
    }
  }
}

/**
 * Factory function to create export service instance
 */
export async function createExportService(): Promise<ExportService> {
  const user = await getAuthenticatedUser()
  return new ExportService(user)
}
