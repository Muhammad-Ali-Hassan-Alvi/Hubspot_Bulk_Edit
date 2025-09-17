import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'
import { normalizeContentType } from '@/lib/utils'

type ValidationResult = {
  isValid: boolean
  error: string
  exportDetails: any
}

async function checkExportRecords(
  supabase: any,
  userId: string,
  exportType: 'csv' | 'google-sheets',
  matchingCriteria: (record: any) => boolean,
  limit: number = 10
): Promise<{ success: boolean; error?: string; matchingExport?: any; exportRecords?: any[] }> {
  const { data: exportRecords, error: recordError } = await supabase
    .from('user_exports')
    .select('*')
    .eq('user_id', userId)
    .eq('export_type', exportType)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (recordError) {
    return { success: false, error: 'Unable to verify export history. Please try again.' }
  }

  console.log('Found export records:', exportRecords)
  const matchingExport = exportRecords?.find(matchingCriteria)
  console.log('Matching export found:', matchingExport)
  return { success: true, matchingExport, exportRecords }
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
        const [, extractedContentType] = match
        const normalizedExtractedType = normalizeContentType.forComparison(extractedContentType)
        const normalizedSelectedType = normalizeContentType.forComparison(contentType)

        if (normalizedExtractedType !== normalizedSelectedType) {
          validationResult = {
            isValid: false,
            error: `Content type mismatch. File was exported for "${normalizeContentType.toDisplayFormat(extractedContentType)}" but you selected "${contentType}".`,
            exportDetails: null,
          }
        } else {
          // Convert content type name to ID for comparison
          const { data: contentTypeData, error: contentTypeError } = await supabase
            .from('content_types')
            .select('id')
            .eq('slug', contentType)
            .single()

          if (contentTypeError || !contentTypeData) {
            return NextResponse.json(
              { success: false, error: `Invalid content type: ${contentType}` },
              { status: 400 }
            )
          }

          const contentTypeId = contentTypeData.id

          const result = await checkExportRecords(
            supabase,
            user.id,
            'csv',
            record => {
              // For CSV validation, match by content type and export type
              // Since we don't have filename field, we'll match by content type
              const recordContentType = record.content_type_id
              const contentTypeMatches = recordContentType === contentTypeId

              console.log('CSV validation check:', {
                recordContentType,
                contentType,
                contentTypeId,
                contentTypeMatches,
                record,
              })

              return contentTypeMatches
            },
            10
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
                exportType: 'csv',
                contentType: normalizeContentType.toDisplayFormat(extractedContentType),
                exportDate: result.matchingExport.created_at,
                fileName,
                tabId: '0',
              },
            }
          } else {
            validationResult = {
              isValid: false,
              error:
                'No export found for this CSV file. Please export the data first before importing.',
              exportDetails: null,
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

      // Convert content type name to ID for comparison
      const { data: contentTypeData, error: contentTypeError } = await supabase
        .from('content_types')
        .select('id')
        .eq('slug', contentType)
        .single()

      if (contentTypeError || !contentTypeData) {
        return NextResponse.json(
          { success: false, error: `Invalid content type: ${contentType}` },
          { status: 400 }
        )
      }

      const contentTypeId = contentTypeData.id

      const result = await checkExportRecords(
        supabase,
        user.id,
        'google-sheets',
        record => {
          // Check if sheetId and content type match
          const recordSheetId = record.sheet_id
          const recordContentType = record.content_type_id
          const sheetMatches = recordSheetId === sheetId
          const contentTypeMatches = recordContentType === contentTypeId

          console.log('Validation check:', {
            recordSheetId,
            recordContentType,
            sheetId,
            contentType,
            contentTypeId,
            sheetMatches,
            contentTypeMatches,
            record,
          })

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
        const sheetExports = result.exportRecords?.filter(record => {
          return record.sheet_id === sheetId
        })

        if (sheetExports && sheetExports.length > 0) {
          const exportedContentTypes = sheetExports.map(record => record.content_type_id).join(', ')
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
