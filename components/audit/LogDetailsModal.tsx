import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DateDisplay } from '@/components/shared/DateDisplay'
import {
  Clock,
  User,
  FileText,
  //  ArrowRight
} from 'lucide-react'

interface Change {
  pageName: string
  field: string
  previousValue: any // Can be string, boolean, null, etc.
  newValue: any
}

interface LogDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLog: any
}

// BRO: I created a helper component to make the badges consistent
const ValueBadge = ({
  value,
  variant,
  className,
}: {
  value: any
  variant: 'page' | 'previous' | 'new'
  className?: string
}) => {
  const textValue = String(value ?? 'N/A')
  const variantClasses = {
    page: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors',
    previous:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors',
    new: 'bg-green-200 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors',
  }

  return (
    <Badge
      title={textValue}
      className={`rounded-full border px-3 py-1 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      <span className="truncate">{textValue}</span>
    </Badge>
  )
}

export default function LogDetailsModal({ isOpen, onClose, selectedLog }: LogDetailsModalProps) {
  if (!selectedLog) return null

  const getStatusBadge = (status: string) => {
    // ... (This function remains unchanged)
    switch (status.toLowerCase()) {
      case 'success':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            Success
          </Badge>
        )
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            Error
          </Badge>
        )
      case 'warning':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            Warning
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
            {status}
          </Badge>
        )
    }
  }

  const changes = selectedLog.details?.changes || []
  const totalRecords = selectedLog.total_records || changes.length || 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Log Entry Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* ... (Summary Cards and Statistics sections remain unchanged) ... */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-400 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timestamp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <DateDisplay date={selectedLog.timestamp} format="time" showTime={true} />
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-800 dark:text-green-400 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Modified By
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {selectedLog.user_name || 'Unknown User'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-400 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>{getStatusBadge(selectedLog.status || 'Unknown')}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedLog.total_records || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Records</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {selectedLog.success_count || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Success</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {selectedLog.failure_count || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Failures</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Record Changes</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {totalRecords} record(s) were modified in this operation
              </p>
            </CardHeader>
            <CardContent>
              {changes.length > 0 ? (
                <div className="w-full">
                  {/* Table Header */}
                  <div className="grid grid-cols-4 gap-x-4 px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-sm text-gray-500 dark:text-gray-400">
                      Page Name
                    </h4>
                    <h4 className="font-semibold text-sm text-gray-500 dark:text-gray-400">
                      Field
                    </h4>
                    <h4 className="font-semibold text-sm text-gray-500 dark:text-gray-400">
                      Previous Value
                    </h4>
                    {/* <div /> Spacer for arrow column */}
                    <h4 className="font-semibold text-sm text-gray-500 dark:text-gray-400">
                      New Value
                    </h4>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {changes.map((change: Change, index: number) => (
                      <div key={index} className="grid grid-cols-4 items-center gap-x-4 px-4 py-3">
                        {/* Page Name */}
                        <div className="min-w-0">
                          <ValueBadge value={change.pageName} variant="page" />
                        </div>

                        {/* Field */}
                        <div
                          className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate"
                          title={change.field}
                        >
                          {change.field}
                        </div>

                        {/* Previous Value */}
                        <div className="min-w-0">
                          <ValueBadge value={change.previousValue} variant="previous" />
                        </div>

                        {/* Arrow */}
                        {/* BRO: FIX HERE - Changed `justify-left` to `justify-center` */}
                        {/* <div className="flex justify-center ">
                          <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-500 ml-[-200px]" />
                        </div> */}

                        {/* New Value */}
                        <div className="min-w-0">
                          <ValueBadge value={change.newValue} variant="new" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No changes recorded for this log entry.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
