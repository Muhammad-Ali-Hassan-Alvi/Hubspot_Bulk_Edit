'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { Button } from '../../../ui/button'
import { useToast } from '@/hooks/use-toast'
import { usePathname } from 'next/navigation'
import { sendPasswordReset } from '@/lib/auth/forget-password'

interface CurrentPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: (password: string) => void
  email: string
}

export default function CurrentPasswordModal({
  isOpen,
  onClose,
  // onConfirm,
  email,
}: CurrentPasswordModalProps) {
  const { toast } = useToast()
  const pathname = usePathname()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleConfirm = () => {
    if (!password) {
      setError('Please enter your current password.')
      return
    }
    setError('')
    // onConfirm && onConfirm(password)
    setPassword('')
    onClose()
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: `Could not retrieve your email. Try logging in again.`,
        description: `Check your email at ${email} for a secure login link`,
      })
      return
    }

    const { success } = await sendPasswordReset(
      email,
      `${window.location.origin}/auth/reset?redirect=${encodeURIComponent(pathname)}`
    )

    if (success) {
      toast({
        title: `Reset email sent to ${email}`,
        description: `Check your email at ${email} for a secure login link`,
      })
    } /* else {
      toast({
        title: `Reset email sent to ${email}`,
        description:
          error instanceof Error ? error.message : 'Please check your email and try again',
        variant: 'destructive',
      })
    } */
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed top-0 left-0 w-screen h-screen z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex items-center justify-center text-blue-600 mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-center mb-2">Security Check</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
              Your security matters. Please confirm your current password so we know it's really you
              before making changes.
            </p>

            <input
              type="password"
              className="w-full px-4 py-2 border rounded-md bg-gray-100 dark:bg-neutral-800 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter current password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="mt-2 text-right">
              <button
                onClick={handleForgotPassword}
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-gray-300 dark:hover:bg-neutral-600"
              >
                Cancel
              </Button>
              <Button onClick={handleConfirm} className="px-4 py-2 text-sm rounded-md">
                Confirm
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
