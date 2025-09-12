'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface UploadResultsModalProps {
  isOpen: boolean
  onClose: () => void
  onViewLogs?: () => void
  successCount: number
  failedCount: number
  showViewLogs?: boolean
}

export default function UploadResultsModal({
  isOpen,
  onClose,
  onViewLogs,
  successCount,
  failedCount,
  showViewLogs = true,
}: UploadResultsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Results</DialogTitle>
          <DialogDescription>Review the results of your bulk upload operation.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <h3 className="text-xl font-bold text-green-600 mb-2">Upload Complete!</h3>
            <p className="text-sm text-green-600 mb-6">
              All changes successfully applied to HubSpot
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{successCount}</div>
                <div className="text-sm text-green-600">Items Successfully Updated</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                <div className="text-sm text-red-600">Items Failed to Update</div>
              </div>
            </div>

            <div className="flex gap-3">
              {showViewLogs && (
                <Button variant="outline" className="flex-1" onClick={onViewLogs}>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  View Detailed Logs
                </Button>
              )}
              <Button onClick={onClose} className={showViewLogs ? 'flex-1' : 'w-full'}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
