'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScrollToTopButtonProps {
  /**
   * The scroll threshold in pixels after which the button becomes visible
   * @default 400
   */
  threshold?: number
  /**
   * Additional CSS classes to apply to the button
   */
  className?: string
  /**
   * The size of the button
   * @default "default"
   */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /**
   * The variant of the button
   * @default "default"
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  /**
   * Smooth scroll behavior
   * @default true
   */
  smooth?: boolean
}

export default function ScrollToTopButton({
  threshold = 200,
  className,

  smooth = true,
}: ScrollToTopButtonProps) {
  const [_isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const toggleVisibility = () => {
      const scrolled = window.pageYOffset || document.documentElement.scrollTop
      console.log('Current scroll position:', scrolled, 'Threshold:', threshold) // Debug log

      if (scrolled > threshold) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    // Check initial scroll position
    toggleVisibility()

    // Add scroll event listener
    window.addEventListener('scroll', toggleVisibility, { passive: true })

    // Cleanup
    return () => {
      window.removeEventListener('scroll', toggleVisibility)
    }
  }, [threshold])

  const scrollToTop = () => {
    if (smooth) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    } else {
      window.scrollTo(0, 0)
    }
  }

  // Temporarily always show for debugging
  // if (!isVisible) {
  //   return null
  // }

  return (
    <>
      <Button
        onClick={scrollToTop}
        className={cn(
          'fixed bottom-8 right-8 z-[9999] shadow-2xl transition-all duration-300 hover:shadow-xl hover:scale-110',
          // Force black background - removing variant to avoid conflicts
          '!bg-foreground border-2 border-white hover:!bg-foreground',
          'w-14 h-14 rounded-full flex items-center justify-center',
          className
        )}
        aria-label="Scroll to top"
        style={{ position: 'fixed', bottom: '3rem', right: '2rem' }}
      >
        <ArrowUp className="h-8 w-8" />
      </Button>
    </>
  )
}
