'use client'

import Sidebar from '@/components/shared/Sidebar'
import Navbar from '@/components/shared/Navbar'
import TopLoader from '@/components/shared/TopLoader'
import { cn } from '@/lib/utils'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { useUserSettingsWithAuth } from '@/hooks/useUserSettings'

const inter = Inter({ subsets: ['latin'] })

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  // Use Redux to manage user settings instead of direct Supabase calls
  const {
    userSettings: _userSettings,
    loading: _loading,
    error: _error,
  } = useUserSettingsWithAuth()

  return (
    <>
      <TopLoader />
      <div className={`${inter.className} bg-background flex min-h-screen`}>
        <Sidebar />
        <main className={cn('flex-1 transition-all duration-300 ease-in-out lg:ml-64')}>
          <Navbar />
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
        <Toaster />
      </div>
    </>
  )
}
