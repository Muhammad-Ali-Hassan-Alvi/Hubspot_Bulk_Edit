import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/store/serverUtils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const logType = searchParams.get('type') || 'activity'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const actionFilter = searchParams.get('action') || ''
    const resourceFilter = searchParams.get('resource') || ''
    const statusFilter = searchParams.get('status') || ''

    const supabase = createClient()

    // Verify user authentication
    const user = await getAuthenticatedUser()

    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters based on log type
    if (logType === 'bulk-editing') {
      // For bulk editing, show logs with bulk_edit action types
      query = query.in('action_type', ['bulk_edit_publish', 'bulk_edit_failed'])
    } else {
      // For activity logs, show everything except bulk editing
      query = query.not('action_type', 'in', '(bulk_edit_publish,bulk_edit_failed)')
    }

    // Apply search filter
    if (search) {
      query = query.or(
        `action_type.ilike.%${search}%,resource_type.ilike.%${search}%,resource_id.ilike.%${search}%`
      )
    }

    // Apply action filter
    if (actionFilter && actionFilter !== 'all') {
      query = query.eq('action_type', actionFilter)
    }

    // Apply resource filter
    if (resourceFilter && resourceFilter !== 'all') {
      query = query.eq('resource_type', resourceFilter)
    }

    // Apply status filter - only if it exists in the data
    if (statusFilter && statusFilter !== 'all') {
      // Skip status filter for now as it might not exist in all records
      // query = query.eq('details->status', statusFilter)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching logs:', error)
      return NextResponse.json({ success: false, error: 'Failed to fetch logs' }, { status: 500 })
    }

    // Generate sample data if no logs found
    let finalLogs = logs || []
    if (!logs || logs.length === 0) {
      // Return empty array - no sample data
      finalLogs = []
    }

    // Transform the data to match the UI structure
    const transformedLogs = await Promise.all(
      finalLogs?.map(async log => {
        const details = log.details || {}

        // Determine status based on action type and details
        let status = 'Success'
        let totalRecords = 0
        let successCount = 0
        let failureCount = 0

        if (details.total_records) {
          totalRecords = details.total_records
          successCount = details.success_count || 0
          failureCount = details.failed_updates || details.failure_count || 0
        } else if (details.successful_updates !== undefined) {
          // For bulk editing logs
          totalRecords = (details.successful_updates || 0) + (details.failed_updates || 0)
          successCount = details.successful_updates || 0
          failureCount = details.failed_updates || 0
        }

        if (failureCount > 0 && successCount > 0) {
          status = 'Warning'
        } else if (failureCount > 0) {
          status = 'Error'
        }

        // Generate changes from real data
        let changes: Array<{
          pageName: string
          field: string
          previousValue: string
          newValue: string
        }> = []

        if (log.action_type === 'bulk_edit_publish' || log.action_type === 'bulk_edit_failed') {
          // For bulk editing, prioritize stored page_changes if available
          if (details.page_changes && Array.isArray(details.page_changes) && details.page_changes.length > 0) {
            // Use the stored page_changes data directly
            changes = details.page_changes.map((change: any) => ({
              pageName: change.pageName || `Page ${change.pageId}`,
              field: change.field || 'Unknown Field',
              previousValue: change.previousValue || 'No previous value',
              newValue: change.newValue || 'Updated value',
            }))
          } else {
            // Fallback to generating changes from the actual updates_applied
            const updatesApplied = details.updates_applied || {}
            const fieldsChanged = details.fields_changed || Object.keys(updatesApplied)
            const selectedPageIds = details.selected_page_ids || []

          try {
            if (selectedPageIds.length > 0) {
              // Get page names and previous values from page_snapshots using the stored page IDs
              const { data: pageSnapshots } = await supabase
                .from('page_snapshots')
                .select('page_id, page_name, page_data')
                .eq('user_id', user.id)
                .in('page_id', selectedPageIds)

              

              if (pageSnapshots && pageSnapshots.length > 0) {
                const pageNameMap = new Map(pageSnapshots.map(ps => [ps.page_id, ps.page_name]))
                const pageDataMap = new Map(pageSnapshots.map(ps => [ps.page_id, ps.page_data]))

                // Create changes for each field that was modified in each selected page
                fieldsChanged.forEach((field: string) => {
                  selectedPageIds.forEach((pageId: string) => {
                    const pageName = pageNameMap.get(pageId) || 'Unknown Page'
                    const pageData = pageDataMap.get(pageId) || {}

                    // Get the actual previous value from page_data
                    const previousValue = pageData[field] || 'No previous value'

                    changes.push({
                      pageName,
                      field: field.charAt(0).toUpperCase() + field.slice(1),
                      previousValue: previousValue.toString(),
                      newValue: updatesApplied[field] || 'Updated value',
                    })
                  })
                })


              } else {
                // Fallback if page snapshots not found
                fieldsChanged.forEach((field: string) => {
                  selectedPageIds.forEach((pageId: string) => {
                    changes.push({
                      pageName: `Page ${pageId}`,
                      field: field.charAt(0).toUpperCase() + field.slice(1),
                      previousValue: 'No previous value',
                      newValue: updatesApplied[field] || 'Updated value',
                    })
                  })
                })
              }
            } else {
              // Fallback if no selected page IDs stored

              fieldsChanged.forEach((field: string) => {
                changes.push({
                  pageName: 'Multiple Pages',
                  field: field.charAt(0).toUpperCase() + field.slice(1),
                  previousValue: 'No previous value',
                  newValue: updatesApplied[field] || 'Updated value',
                })
              })
            }
                      } catch (error) {
              console.error('Error fetching page snapshots:', error)
              // Fallback to basic changes
              fieldsChanged.forEach((field: string) => {
                changes.push({
                  pageName: 'Multiple Pages',
                  field: field.charAt(0).toUpperCase() + field.slice(1),
                  previousValue: 'No previous value',
                  newValue: updatesApplied[field] || 'Updated value',
                })
              })
            }
          }
        } else {
          // For activity logs, use existing changes or generate basic ones
          changes = details.changes || []
        }

        return {
          id: log.id,
          action_type: log.action_type,
          resource_type: log.resource_type,
          resource_id: log.resource_id,
          details: {
            ...details,
            total_records: totalRecords,
            success_count: successCount,
            failure_count: failureCount,
            changes: changes,
          },
          created_at: log.created_at,
          timestamp: log.created_at,
          user_name: log.user_name || user.email || 'Current User',
          status,
          total_records: totalRecords,
          success_count: successCount,
          failure_count: failureCount,
        }
      }) || []
    )

    return NextResponse.json({
      success: true,
      data: transformedLogs,
      pagination: {
        page,
        limit,
        total: finalLogs.length,
        totalPages: Math.ceil(finalLogs.length / limit),
      },
    })
  } catch (error) {
    console.error('Audit logs API error:', error)
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
