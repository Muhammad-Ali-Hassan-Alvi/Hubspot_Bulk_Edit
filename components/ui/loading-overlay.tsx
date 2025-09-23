'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface LoadingOverlayProps {
  isLoading: boolean
  delay?: number
  message?: string
  delayedMessage?: string
  fullScreen?: boolean
}

export function LoadingOverlay({
  isLoading,
  delay = 2000,
  message = 'Loading...',
  delayedMessage = 'Just there...',
}: LoadingOverlayProps) {
  const [showDelayedMessage, setShowDelayedMessage] = useState(false)

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowDelayedMessage(true)
      }, delay)

      return () => {
        clearTimeout(timer)
        setShowDelayedMessage(false)
      }
    } else {
      setShowDelayedMessage(false)
    }
  }, [isLoading, delay])

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="relative"
            >
              <Loader2 className="h-8 w-8 text-primary" />
            </motion.div>

            <div className="text-center space-y-2">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-medium text-foreground"
              >
                {message}
              </motion.p>

              <AnimatePresence>
                {showDelayedMessage && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm text-muted-foreground"
                  >
                    {delayedMessage}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
