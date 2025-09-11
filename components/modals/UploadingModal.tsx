'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface UploadingModalProps {
  isOpen: boolean
  progress: number
  currentStatus: string
  selectedCount: number
}

export default function UploadingModal({
  isOpen,
  progress,
  currentStatus,
  selectedCount,
}: UploadingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Uploading to HubSpot</DialogTitle>
          <DialogDescription>
            Please wait while your changes are being uploaded to HubSpot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
          </div>

          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Uploading Changes to HubSpot</h3>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-teal-500 dark:bg-teal-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <p className="text-sm text-muted-foreground">
                Processing {selectedCount} {selectedCount === 1 ? 'item' : 'items'}...
              </p>
              <p className="text-sm text-muted-foreground">{currentStatus}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
