'use client'

import { useState, useEffect } from 'react'

export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) return null // Don't render until mounted (no SSR)
  return <>{children}</>
}
