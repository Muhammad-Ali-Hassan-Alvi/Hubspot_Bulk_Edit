import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export async function POST(request: NextRequest) {
  try {
    const { userId, contentType, importType, sheetId, tabId, fileName } = await request.json()

    if (!userId || !contentType || !importType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, contentType, importType' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const user = await getAuthenticatedUser()
    if (user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let validationResult = { isValid: false, error: '', exportDetails: null }

    if (importType === 'csv') {
      // CSV validation logic
      if (!fileName) {
        return NextResponse.json(
          { success: false, error: 'File name is required for CSV validation' },
          { status: 400 }
        )
      }

      // Extract ID from filename format: hubspot_{contentType}_{count}_items_{date}.csv or .xlsx
      const filenamePattern = /^hubspot_(.+)_(\d+)_items_(\d{4}-\d{2}-\d{2})\.(csv|xlsx?)$/i
      const match = fileName.match(filenamePattern)
      
      // Debug: Log filename validation
      console.log('=== CSV VALIDATION DEBUG ===')
      console.log('Filename:', fileName)
      console.log('Pattern:', filenamePattern)
      console.log('Match result:', match)
      
      if (!match) {
        validationResult = {
          isValid: false,
          error: 'Invalid file format. Please use a file exported from this system.',
          exportDetails: null
        }
      } else {
        const [, extractedContentType, , exportDate] = match
        const normalizedExtractedType = extractedContentType.replace(/_/g, ' ').toLowerCase()
        const normalizedSelectedType = contentType.replace(/-/g, ' ').toLowerCase()
        
        if (normalizedExtractedType !== normalizedSelectedType) {
          validationResult = {
            isValid: false,
            error: `Content type mismatch. File was exported for "${extractedContentType.replace(/_/g, ' ')}" but you selected "${contentType}".`,
            exportDetails: null
          }
        } else {
          // Check if this export exists in audit logs
          const { data: exportLogs, error: logError } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('user_id', user.id)
            .eq('action_type', 'export_csv')
            .eq('resource_type', 'export')
            .contains('details', { filename: fileName })
            .order('created_at', { ascending: false })
            .limit(1)

          // Debug: Log audit log lookup
          console.log('Audit log lookup for filename:', fileName)
          console.log('Export logs found:', exportLogs?.length || 0)
          console.log('Log error:', logError)

          if (logError) {
            console.error('Error checking export logs:', logError)
            validationResult = {
              isValid: false,
              error: 'Unable to verify export history. Please try again.',
              exportDetails: null
            }
          } else if (exportLogs && exportLogs.length > 0) {
            validationResult = {
              isValid: true,
              error: '',
              exportDetails: {
                exportType: 'csv',
                contentType: extractedContentType.replace(/_/g, ' '),
                exportDate,
                fileName,
                tabId: '0' // CSV exports use tab 0 by default
              }
            }
          } else {
            // For CSV files, if the filename format is correct but no audit log is found,
            // we'll still allow it (audit logs might not be available or might be delayed)
            console.log('No audit log found, but filename format is correct - allowing CSV import')
            validationResult = {
              isValid: true,
              error: '',
              exportDetails: {
                exportType: 'csv',
                contentType: extractedContentType.replace(/_/g, ' '),
                exportDate,
                fileName,
                tabId: '0' // CSV exports use tab 0 by default
              }
            }
          }
        }
      }
    } else if (importType === 'gsheet') {
      // Google Sheets validation logic
      if (!sheetId || !tabId) {
        return NextResponse.json(
          { success: false, error: 'Sheet ID and Tab ID are required for Google Sheets validation' },
          { status: 400 }
        )
      }

      // Check if this sheet/tab combination was exported with the selected content type
      const { data: exportLogs, error: logError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('action_type', 'export_sheets')
        .eq('resource_type', 'export')
        .contains('details', { 
          content_type: contentType,
          tab_name: tabId === '0' ? 'Default' : tabId
        })
        .order('created_at', { ascending: false })
        .limit(10) // Get recent exports

      if (logError) {
        console.error('Error checking export logs:', logError)
        validationResult = {
          isValid: false,
          error: 'Unable to verify export history. Please try again.',
          exportDetails: null
        }
      } else if (exportLogs && exportLogs.length > 0) {
        // Check if any of the recent exports match this sheet
        const matchingExport = exportLogs.find(log => {
          const details = log.details
          return details && details.sheet_url && details.sheet_url.includes(sheetId)
        })

        if (matchingExport) {
          validationResult = {
            isValid: true,
            error: '',
            exportDetails: {
              exportType: 'gsheet',
              contentType,
              sheetId,
              tabId,
              exportDate: matchingExport.created_at,
              sheetName: matchingExport.details?.sheet_name || 'Unknown Sheet'
            }
          }
        } else {
          validationResult = {
            isValid: false,
            error: `No export found for "${contentType}" content type in the selected sheet/tab combination. Please export data first or select the correct sheet/tab.`,
            exportDetails: null
          }
        }
      } else {
        validationResult = {
          isValid: false,
          error: `No exports found for "${contentType}" content type. Please export data first.`,
          exportDetails: null
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid import type. Must be "csv" or "gsheet"' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      validation: validationResult
    })

  } catch (error) {
    console.error('Validation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
