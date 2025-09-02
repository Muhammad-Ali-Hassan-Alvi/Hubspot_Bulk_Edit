'use client'

import { Inter } from 'next/font/google'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/shared/Sidebar'
import Navbar from '@/components/shared/Navbar'
import Footer from '@/components/shared/Footer'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { useLayout } from './layout-context'
import { useLoading } from './loading-context'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })

export default function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarCollapsed } = useLayout()
  const { isLoading } = useLoading()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error || !user) {
          router.push('/auth')
          return
        }

        setIsAuthenticated(true)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/auth')
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [router])

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className={`${inter.className} flex min-h-screen bg-background`}>
      <Sidebar />
      <main
        className={cn(
          'flex flex-1 flex-col transition-all duration-300 ease-in-out fill-available',
          isSidebarCollapsed ? 'lg:ml-[70px]' : 'lg:ml-64'
        )}
      >
        <Navbar />
        <div className="flex-1 p-4 !pb-20 sm:p-6 lg:p-8 bg-content [&>*]:bg-content">
          {children}
        </div>
        <Footer
          className={cn(
            'fixed bottom-0 z-50 transition-all duration-300 ease-in-out',
            isSidebarCollapsed ? 'right-0 lg:left-[70px]' : 'right-0 lg:left-64'
          )}
        />
      </main>
      <LoadingOverlay isLoading={isLoading} />
    </div>
  )
}
