'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect after a short delay (optional)
    const timer = setTimeout(() => {
      router.push('/auth')
    }, 1000) // 1 second delay

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen text-xl font-semibold">
      Loading...
    </div>
  )
}
