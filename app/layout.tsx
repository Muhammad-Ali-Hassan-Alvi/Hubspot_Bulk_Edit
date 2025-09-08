import type React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ReduxProvider } from '@/components/providers/ReduxProvider'
import UserbackProvider from '@/components/providers/UserbackProvider'
import { ContentTypesProvider } from '@/components/providers/ContentTypesProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Smuves',
  description: 'Connect Google Sheets to HubSpot content and sync data seamlessly',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ReduxProvider>
          <UserbackProvider>
            <ContentTypesProvider>
              <Toaster />
              {children}
            </ContentTypesProvider>
          </UserbackProvider>
        </ReduxProvider>
      </body>
    </html>
  )
}
