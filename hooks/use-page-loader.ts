// hooks/usePageLoader.ts
'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function usePageLoader() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 500) // adjust based on perceived transition

    return () => clearTimeout(timeout)
  }, [pathname])

  return loading
}
