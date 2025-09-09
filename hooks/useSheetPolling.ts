import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

interface PollingOptions {
  sheetId: string
  tabName: string
  userId: string
  contentType: string
  intervalMs?: number
  enabled?: boolean
  onChangesDetected?: (changes: any[]) => void
}

interface PollingState {
  isPolling: boolean
  lastCheck: Date | null
  lastDataHash: string | null
  changes: any[]
  error: string | null
}

export function useSheetPolling({
  sheetId,
  tabName,
  userId,
  contentType,
  intervalMs = 30000, // 30 seconds default
  enabled = false,
  onChangesDetected,
}: PollingOptions) {
  const [state, setState] = useState<PollingState>({
    isPolling: false,
    lastCheck: null,
    lastDataHash: null,
    changes: [],
    error: null,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Generate a simple hash for data comparison
  const generateDataHash = useCallback((data: any[]) => {
    if (!data || data.length === 0) return 'empty'

    // Create a simple hash based on row count and first few rows
    const sample = data
      .slice(0, 3)
      .map(row => Object.values(row).join('|'))
      .join('||')

    return `${data.length}_${sample.length}_${JSON.stringify(sample).slice(0, 100)}`
  }, [])

  // Poll for changes using the optimized endpoint
  const pollForChangesOptimized = useCallback(async () => {
    if (!sheetId || !tabName || !userId) return null

    try {
      const response = await fetch('/api/import/poll-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          contentType,
          sheetId,
          tabName,
          lastDataHash: state.lastDataHash,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to poll for changes: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error polling for changes:', error)
      throw error
    }
  }, [sheetId, tabName, userId, contentType, state.lastDataHash])

  // Main polling function
  const pollForChanges = useCallback(async () => {
    if (!enabled || !sheetId || !tabName || !userId) return

    try {
      setState(prev => ({ ...prev, error: null }))

      // Use optimized polling endpoint
      const result = await pollForChangesOptimized()
      if (!result) return

      // Update state with results
      setState(prev => ({
        ...prev,
        lastDataHash: result.dataHash,
        lastCheck: new Date(),
        changes: result.hasChanges ? result.changes : prev.changes,
      }))

      // Show notification if there are changes
      if (result.hasChanges && result.changes.length > 0) {
        toast({
          title: 'Sheet Changes Detected',
          description: `${result.changes.length} changes found in your Google Sheet`,
          duration: 5000,
        })

        // Trigger callback for auto-sync
        if (onChangesDetected) {
          onChangesDetected(result.changes)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastCheck: new Date(),
      }))

      toast({
        title: 'Polling Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      })
    }
  }, [enabled, sheetId, tabName, userId, pollForChangesOptimized, toast])

  // Start polling
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    setState(prev => ({ ...prev, isPolling: true, error: null }))

    // Initial poll
    pollForChanges()

    // Set up interval
    intervalRef.current = setInterval(pollForChanges, intervalMs)
  }, [pollForChanges, intervalMs])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setState(prev => ({ ...prev, isPolling: false }))
  }, [])

  // Toggle polling
  const togglePolling = useCallback(() => {
    if (state.isPolling) {
      stopPolling()
    } else {
      startPolling()
    }
  }, [state.isPolling, startPolling, stopPolling])

  // Clear changes
  const clearChanges = useCallback(() => {
    setState(prev => ({ ...prev, changes: [] }))
  }, [])

  // Effect to handle enabled state changes
  useEffect(() => {
    if (enabled && sheetId && tabName && userId) {
      startPolling()
    } else {
      stopPolling()
    }

    return () => {
      stopPolling()
    }
  }, [enabled, sheetId, tabName, userId, startPolling, stopPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    ...state,
    startPolling,
    stopPolling,
    togglePolling,
    clearChanges,
    pollForChanges, // Manual trigger
    onChangesDetected, // Expose the callback for external updates
  }
}
