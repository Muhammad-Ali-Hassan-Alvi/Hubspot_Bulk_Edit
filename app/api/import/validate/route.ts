import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { normalizeContentType } from '@/lib/utils'

type ValidationResult = {
  isValid: boolean
  error: string
  exportDetails: any
}

async function checkExportLogs(
  supabase: any,
  userId: string,
  actionType: 'export_csv' | 'export_sheets',
  matchingCriteria: (log: any) => boolean,
  limit: number = 10
): Promise<{ success: boolean; error?: string; matchingExport?: any; exportLogs?: any[] }> {
  const { data: exportLogs, error: logError } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .eq('resource_type', 'export')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (logError) {
    return { success: false, error: 'Unable to verify export history. Please try again.' }
  }

  const matchingExport = exportLogs?.find(matchingCriteria)
  return { success: true, matchingExport, exportLogs }
}

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

    let validationResult: ValidationResult = {
      isValid: false,
      error: '',
      exportDetails: null,
    }

    if (importType === 'csv') {
      if (!fileName) {
        return NextResponse.json(
          { success: false, error: 'File name is required for CSV validation' },
          { status: 400 }
        )
      }

      const filenamePattern = /^hubspot_(.+)_(\d+)_items_(\d{4}-\d{2}-\d{2})\.(csv|xlsx?)$/i
      const match = fileName.match(filenamePattern)

      if (!match) {
        validationResult = {
          isValid: false,
          error: 'Invalid file format. Please use a file exported from this system.',
          exportDetails: null,
        }
      } else {
        const [, extractedContentType, , exportDate] = match
        const normalizedExtractedType = normalizeContentType.forComparison(extractedContentType)
        const normalizedSelectedType = normalizeContentType.forComparison(contentType)

        if (normalizedExtractedType !== normalizedSelectedType) {
          validationResult = {
            isValid: false,
            error: `Content type mismatch. File was exported for "${normalizeContentType.toDisplayFormat(extractedContentType)}" but you selected "${contentType}".`,
            exportDetails: null,
          }
        } else {
          const result = await checkExportLogs(
            supabase,
            user.id,
            'export_csv',
            log => {
              const details = log.details
              if (!details || !details.filename) return false
              const logFilename = details.filename
              const isExactMatch = logFilename === fileName
              const isSimilarMatch =
                logFilename.includes(fileName.split('.')[0]) ||
                fileName.includes(logFilename.split('.')[0])
              return isExactMatch || isSimilarMatch
            },
            10
          )

          if (!result.success) {
            validationResult = {
              isValid: false,
              error: result.error || 'Unable to verify export history.',
              exportDetails: null,
            }
          } else {
            validationResult = {
              isValid: true,
              error: '',
              exportDetails: {
                exportType: 'csv',
                contentType: normalizeContentType.toDisplayFormat(extractedContentType),
                exportDate,
                fileName,
                tabId: '0',
              },
            }
          }
        }
      }
    } else if (importType === 'gsheet') {
      if (!sheetId || !tabId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Sheet ID and Tab ID are required for Google Sheets validation',
          },
          { status: 400 }
        )
      }

      const result = await checkExportLogs(
        supabase,
        user.id,
        'export_sheets',
        log => {
          const details = log.details
          if (!details || !details.sheet_url) return false
          const sheetMatches = details.sheet_url.includes(sheetId)
          const exportedContentType = details.content_type
          const contentTypeMatches =
            normalizeContentType.forComparison(exportedContentType) ===
            normalizeContentType.forComparison(contentType)
          return sheetMatches && contentTypeMatches
        },
        20
      )

      if (!result.success) {
        validationResult = {
          isValid: false,
          error: result.error || 'Unable to verify export history.',
          exportDetails: null,
        }
      } else if (result.matchingExport) {
        validationResult = {
          isValid: true,
          error: '',
          exportDetails: {
            exportType: 'gsheet',
            contentType,
            sheetId,
            tabId,
            exportDate: result.matchingExport.created_at,
            sheetName: result.matchingExport.details?.sheet_name || 'Unknown Sheet',
          },
        }
      } else {
        const sheetExports = result.exportLogs?.filter(log => {
          const details = log.details
          return details && details.sheet_url && details.sheet_url.includes(sheetId)
        })

        if (sheetExports && sheetExports.length > 0) {
          const exportedContentTypes = sheetExports
            .map(log => log.details.content_type)
            .join(', ')
          validationResult = {
            isValid: false,
            error: `Content type mismatch. This sheet was exported for "${exportedContentTypes}" but you selected "${contentType}".`,
            exportDetails: null,
          }
        } else {
          validationResult = {
            isValid: false,
            error: `No export found for this sheet/tab combination.`,
            exportDetails: null,
          }
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
      validation: validationResult,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
