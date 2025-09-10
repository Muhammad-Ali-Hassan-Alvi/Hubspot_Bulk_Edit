'use client'

import { useState, useCallback } from 'react'

interface UploadFlowState {
  showConfirmation: boolean
  showProgress: boolean
  showResults: boolean
  progress: number
  currentStatus: string
  uploadResults: { success: number; failed: number }
  isProcessing: boolean
}

interface UseUploadFlowReturn extends UploadFlowState {
  startConfirmation: () => void
  confirmChanges: (onUpload: () => Promise<void>) => void
  completeUpload: (successCount: number, failedCount: number) => void
  closeResults: () => void
  reset: () => void
}

export function useUploadFlow(): UseUploadFlowReturn {
  const [state, setState] = useState<UploadFlowState>({
    showConfirmation: false,
    showProgress: false,
    showResults: false,
    progress: 0,
    currentStatus: 'Initializing upload...',
    uploadResults: { success: 0, failed: 0 },
    isProcessing: false,
  })

  const startConfirmation = useCallback(() => {
    setState(prev => ({
      ...prev,
      showConfirmation: true,
      isProcessing: false,
    }))
  }, [])

  const confirmChanges = useCallback(async (onUpload: () => Promise<void>) => {
    setState(prev => ({
      ...prev,
      showConfirmation: false,
      showProgress: true,
      progress: 0,
      currentStatus: 'Initializing upload...',
      isProcessing: true,
    }))

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setState(prev => {
        if (prev.progress >= 100) {
          clearInterval(progressInterval)
          return {
            ...prev,
            currentStatus: 'Upload completed!',
          }
        }

        const newProgress = prev.progress + Math.random() * 15 + 5
        let newStatus = prev.currentStatus

        if (newProgress > 30 && prev.progress <= 30) {
          newStatus = 'Processing items...'
        } else if (newProgress > 60 && prev.progress <= 60) {
          newStatus = 'Applying updates...'
        } else if (newProgress > 90 && prev.progress <= 90) {
          newStatus = 'Finalizing changes...'
        }

        return {
          ...prev,
          progress: Math.min(newProgress, 100),
          currentStatus: newStatus,
        }
      })
    }, 200)

    try {
      await onUpload()
      
      // Wait a bit for the progress to complete
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          showProgress: false,
          isProcessing: false,
        }))
      }, 1000)
    } catch (error) {
      clearInterval(progressInterval)
      setState(prev => ({
        ...prev,
        showProgress: false,
        isProcessing: false,
      }))
      throw error
    }
  }, [])

  const completeUpload = useCallback((successCount: number, failedCount: number) => {
    setState(prev => ({
      ...prev,
      showResults: true,
      uploadResults: { success: successCount, failed: failedCount },
    }))
  }, [])

  const closeResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      showResults: false,
    }))
  }, [])

  const reset = useCallback(() => {
    setState({
      showConfirmation: false,
      showProgress: false,
      showResults: false,
      progress: 0,
      currentStatus: 'Initializing upload...',
      uploadResults: { success: 0, failed: 0 },
      isProcessing: false,
    })
  }, [])

  return {
    ...state,
    startConfirmation,
    confirmChanges,
    completeUpload,
    closeResults,
    reset,
  }
}
