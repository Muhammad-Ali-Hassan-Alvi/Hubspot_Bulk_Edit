'use client'

import { useEffect } from 'react'
import { CheckCircle, X } from 'lucide-react'

interface Props {
  message: string
  onClose?: () => void
}

export default function SuccessAlert({ message, onClose }: Props) {
  useEffect(() => {
    if (onClose) {
      const timer = setTimeout(() => {
        onClose()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [message, onClose])

  if (!onClose) {
    return (
      <div className="max-w-7xl mx-auto mb-5">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800">{message}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto mb-5">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800">{message}</span>
        </div>
        <button
          onClick={onClose}
          className="text-green-600 hover:text-green-800"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
