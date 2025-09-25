// In a component like /components/SyncManager.tsx or inside BackupManager.tsx

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, GitPullRequest, AlertTriangle } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

// Add some basic CSS to your global.css for the diff view
/*
  In your app/globals.css file, add this:

  .diff-container del {
    background-color: #fde8e8;
    color: #b30000;
    text-decoration: none;
  }

  .diff-container ins {
    background-color: #e6ffec;
    color: #006600;
    text-decoration: none;
  }
*/

interface SyncManagerProps {
  user: User
  sheetId: string
  sheetName: string
  // You might pass hubspotToken for the "Apply" step later
}

export default function SyncManager({ user, sheetId, sheetName }: SyncManagerProps) {
  const [changes, setChanges] = useState<any[]>([])
  const [isPreviewing, setIsPreviewing] = useState(false)
  const { toast } = useToast()

  const previewChanges = async () => {
    if (!sheetId || !sheetName) {
      toast({
        title: 'Configuration Missing',
        description: 'Sheet ID and Name are required.',
        variant: 'destructive',
      })
      return
    }

    setIsPreviewing(true)
    setChanges([]) // Clear previous changes
    try {
      const response = await fetch('/api/sync/preview-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          sheetId: sheetId,
          sheetName: sheetName,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch changes.')
      }

      setChanges(data.changes)
      toast({
        title: 'Preview Complete',
        description: `Found ${data.changes.length} page(s) with changes to review.`,
      })
    } catch (error) {
      toast({
        title: 'Error Previewing Changes',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      })
    }
    setIsPreviewing(false)
  }

  const canPreview = sheetId && sheetName

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitPullRequest className="h-5 w-5" />
          Sync Changes to HubSpot
        </CardTitle>
        <CardDescription>
          After editing content in Google Sheets, preview the changes here before syncing them back
          to HubSpot.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button
          onClick={previewChanges}
          disabled={isPreviewing || !canPreview}
          className="w-full"
          size="lg"
        >
          {isPreviewing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Comparing Sheet vs. Backup...
            </>
          ) : (
            'Preview Changes from Google Sheet'
          )}
        </Button>

        {!canPreview && (
          <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md">
            <AlertTriangle className="h-4 w-4" />
            Please select a backup sheet first to enable preview.
          </div>
        )}

        {/* Results Section */}
        {!isPreviewing && changes.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Review {changes.length} Change(s)
            </h3>
            {changes.map(change => (
              <div key={change.pageId} className="border p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-base">
                  {change.name}{' '}
                  <span className="text-xs font-mono text-gray-500">(ID: {change.pageId})</span>
                </h4>

                {/* Display Name changes */}
                {change.fields.name && (
                  <div>
                    <strong className="text-sm">Name:</strong>
                    <div className="text-sm p-2 rounded bg-popover">
                      <del className="text-red-600">{change.fields.name.old}</del>
                      <ins className="text-green-600 no-underline ml-2">
                        {change.fields.name.new}
                      </ins>
                    </div>
                  </div>
                )}

                {/* Display Body Content changes */}
                {change.fields.body_content_diff && (
                  <div>
                    <strong className="text-sm">Body Content Changes:</strong>
                    <div
                      className="diff-container border rounded mt-1 p-3 text-sm leading-relaxed"
                      // This is safe because our API generates the HTML
                      dangerouslySetInnerHTML={{ __html: change.fields.body_content_diff }}
                    />
                  </div>
                )}
              </div>
            ))}
            <Button className="w-full bg-green-600 hover:bg-green-700" disabled>
              Confirm and Sync {changes.length} Changes to HubSpot (Coming Soon)
            </Button>
          </div>
        )}

        {!isPreviewing && changes.length === 0 && (
          <p className="text-sm text-center text-gray-500 py-4">
            Click "Preview Changes" to check for modifications.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
