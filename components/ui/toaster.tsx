'use client'

import { useToast } from '@/hooks/use-toast'
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'
import { CircleCheck, CircleX, Info, AlertTriangle } from 'lucide-react'
import * as ToastPrimitives from '@radix-ui/react-toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-center w-full">
              {/* Center: Title and Description */}
              <div className="flex flex-col flex-1 justify-center">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
              {/* Right: Icon as close button */}
              <ToastPrimitives.Close asChild>
                <button
                  className="flex items-center justify-center ml-3 rounded-full p-2 h-9 w-9 transition hover:bg-black/10"
                  aria-label="Close"
                >
                  {variant === 'success' && (
                    <CircleCheck className="w-8 h-8 text-green-500 hover:text-green-700" />
                  )}
                  {variant === 'destructive' && (
                    <CircleX className="w-8 h-8 text-red-400 hover:text-red-700" />
                  )}
                  {variant === 'warning' && (
                    <AlertTriangle className="w-8 h-8 text-yellow-400 hover:text-yellow-600" />
                  )}
                  {(!variant || variant === 'default') && (
                    <Info className="w-8 h-8 text-blue-400 hover:text-blue-700" />
                  )}
                </button>
              </ToastPrimitives.Close>
            </div>
          </Toast>
        )
      })}
      {/* Set position to top right */}
      <ToastViewport className="fixed bottom-4 right-4 z-[100] flex flex-col max-w-[420px]" />
    </ToastProvider>
  )
}
