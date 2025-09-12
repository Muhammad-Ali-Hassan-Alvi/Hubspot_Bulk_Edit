'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmChangesModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  changes: { [key: string]: any }
  selectedCount: number
  isProcessing?: boolean
}

export default function ConfirmChangesModal({
  isOpen,
  onClose,
  onConfirm,
  changes,
  selectedCount,
  isProcessing = false,
}: ConfirmChangesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirm Changes</DialogTitle>
          <DialogDescription>
            Review and confirm the changes that will be applied to your selected items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The following changes will be uploaded to HubSpot for {selectedCount} selected item
            {selectedCount !== 1 ? 's' : ''}:
          </p>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-semibold">Field</th>
                  <th className="text-left p-3 font-semibold">New Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(changes).map(([field, value]) => (
                  <tr key={field} className="border-t">
                    <td className="p-3 font-medium">{field}</td>
                    <td className="p-3">
                      {Array.isArray(value)
                        ? value.join(', ')
                        : typeof value === 'object' && value !== null
                          ? JSON.stringify(value)
                          : String(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm">
              <span className="font-semibold text-orange-800">Note:</span>
              <span className="text-orange-700 ml-1">
                These changes will be permanently applied to your HubSpot content. Make sure you
                have reviewed all changes before proceeding.
              </span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>
                <svg className="h-4 w-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Applying...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
