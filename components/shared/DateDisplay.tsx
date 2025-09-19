'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface DateDisplayProps {
  date: string | Date | number | null | undefined
  format?: 'full' | 'short' | 'time' | 'relative'
  className?: string
  fallback?: string
  showTime?: boolean
}

/**
 * Reusable DateDisplay component that ensures consistent dd/mm/yyyy formatting
 * across the entire platform
 */
export function DateDisplay({
  date,
  format = 'full',
  className,
  fallback = 'N/A',
  showTime = false,
}: DateDisplayProps) {
  if (!date) {
    return <span className={cn('text-muted-foreground', className)}>{fallback}</span>
  }

  const dateObj = new Date(date)
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return <span className={cn('text-muted-foreground', className)}>{fallback}</span>
  }

  const formatDate = (date: Date, format: string, showTime: boolean) => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    switch (format) {
      case 'short':
        return `${day}/${month}/${year}`
      case 'time':
        return showTime ? `${day}/${month}/${year} ${hours}:${minutes}:${seconds}` : `${day}/${month}/${year}`
      case 'relative':
        return getRelativeTime(date)
      case 'full':
      default:
        return showTime ? `${day}/${month}/${year} ${hours}:${minutes}:${seconds}` : `${day}/${month}/${year}`
    }
  }

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    // For older dates, show the actual date
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const formattedDate = formatDate(dateObj, format, showTime)

  return (
    <span className={cn('inline-block', className)}>
      {formattedDate}
    </span>
  )
}

/**
 * Hook for consistent date formatting
 */
export function useDateFormatter() {
  const formatDate = React.useCallback((date: string | Date | number | null | undefined, options?: {
    format?: 'full' | 'short' | 'time' | 'relative'
    showTime?: boolean
  }) => {
    if (!date) return 'N/A'
    
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return 'N/A'
    
    const { format = 'full', showTime = false } = options || {}
    
    const day = String(dateObj.getDate()).padStart(2, '0')
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const year = dateObj.getFullYear()
    const hours = String(dateObj.getHours()).padStart(2, '0')
    const minutes = String(dateObj.getMinutes()).padStart(2, '0')
    const seconds = String(dateObj.getSeconds()).padStart(2, '0')

    switch (format) {
      case 'short':
        return `${day}/${month}/${year}`
      case 'time':
        return showTime ? `${day}/${month}/${year} ${hours}:${minutes}:${seconds}` : `${day}/${month}/${year}`
      case 'relative':
        const now = new Date()
        const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
        
        if (diffInSeconds < 60) return 'Just now'
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
        
        return `${day}/${month}/${year}`
      case 'full':
      default:
        return showTime ? `${day}/${month}/${year} ${hours}:${minutes}:${seconds}` : `${day}/${month}/${year}`
    }
  }, [])

  return { formatDate }
}

export default DateDisplay
