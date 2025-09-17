'use client'

import { Inter } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { X, FileText, Menu, PanelLeftClose, PanelRightClose, Lock, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const inter = Inter({ subsets: ['latin'] })

const adminLinks = [{ name: 'Headers', href: '/admin/headers', icon: FileText }]

// Hardcoded password

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Check if user is authenticated for admin access
    const checkAdminAuth = async () => {
      const sessionKey = 'admin_authenticated'
      const isAuth = sessionStorage.getItem(sessionKey)
      if (isAuth === 'true') {
        setIsAuthenticated(true)
      }
      setIsCheckingAuth(false)
    }
    checkAdminAuth()
  }, [])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setAuthError('')

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        sessionStorage.setItem('admin_authenticated', 'true')
        setIsAuthenticated(true)
        setPassword('')
      } else {
        setAuthError('Incorrect password. Please try again.')
        setPassword('')
      }
    } catch (err) {
      console.error('Auth request failed', err)
      setAuthError('Something went wrong. Please try again later.')
    }

    setIsLoading(false)
  }

  const handleBackToApp = () => {
    router.push('/dashboard')
  }

  // Listen for navigation to main app to clear admin session
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear admin session when leaving the page
      sessionStorage.removeItem('admin_authenticated')
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Clear admin session when tab becomes hidden
        sessionStorage.removeItem('admin_authenticated')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const logoSrc =
    mounted && resolvedTheme === 'dark'
      ? isSidebarCollapsed
        ? '/Logo-Shrink-Dark.png'
        : '/Logo-Dark.png'
      : isSidebarCollapsed
        ? '/Logo-Shrink-Light.png'
        : '/Logo-Light.png'

  const closeMobileSidebar = () => setIsMobileOpen(false)

  const NavLink = ({ link }: { link: { name: string; href: string; icon: React.ElementType } }) => (
    <Link
      href={link.href}
      onClick={closeMobileSidebar}
      className={cn(
        'flex items-center rounded-lg py-2 font-medium transition-all group',
        pathname === link.href
          ? 'bg-[linear-gradient(to_right,_#66A9EA,_#76E8A2)] text-[hsl(var(--sidebar-accent-foreground))] shadow-md'
          : 'hover:bg-[linear-gradient(to_right,_#66A9EA22,_#76E8A222)] hover:text-[#66A9EA]',
        isSidebarCollapsed ? 'justify-center px-3' : 'gap-4 px-4'
      )}
      title={isSidebarCollapsed ? link.name : ''}
    >
      <link.icon
        className={cn(
          'h-5 w-5 shrink-0 transition-all group-hover:scale-110',
          pathname === link.href ? 'text-white' : 'text-foreground group-hover:text-[#66A9EA]'
        )}
      />
      <span
        className={cn(
          'overflow-hidden transition-all duration-200',
          isSidebarCollapsed ? 'w-0' : 'w-full'
        )}
      >
        {link.name}
      </span>
    </Link>
  )

  const SidebarHeading = ({ title }: { title: string }) => (
    <AnimatePresence>
      {!isSidebarCollapsed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto', transition: { duration: 0.2 } }}
          exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
          className="overflow-hidden"
        >
          <h2 className="px-4 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-primary">
            {title}
          </h2>
        </motion.div>
      )}
    </AnimatePresence>
  )

  const SidebarContent = () => (
    <>
      {/* Desktop header with logo and collapse button */}
      <div
        className={cn(
          'hidden lg:flex h-16 items-center border-b',
          isSidebarCollapsed ? 'justify-center' : 'justify-between px-4'
        )}
      >
        <Link href="/admin" className="flex items-center">
          <div className={cn('relative shrink-0', isSidebarCollapsed ? 'h-10 w-10' : 'h-36 w-48')}>
            <Image
              fill
              src={logoSrc}
              alt="Smuves Admin"
              className="object-contain"
              priority
              key={`${resolvedTheme}-${isSidebarCollapsed}`}
            />
          </div>
        </Link>
        {!isSidebarCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="h-8 w-8 p-0"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Mobile close button */}
      <div className="flex lg:hidden justify-end p-4">
        <button
          onClick={closeMobileSidebar}
          className="text-secondary-foreground hover:text-red-500"
        >
          <X size={24} />
        </button>
      </div>

      <nav className={cn('flex-1 space-y-2 py-4', isSidebarCollapsed ? 'px-2' : 'px-3')}>
        <div>
          <SidebarHeading title="Settings" />
          <div className="space-y-1">
            {adminLinks.map(link => (
              <NavLink key={link.href} link={link} />
            ))}
          </div>
        </div>
      </nav>
    </>
  )

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <ThemeProvider>
        <div
          className={`${inter.className} flex min-h-screen bg-background items-center justify-center`}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Verifying admin access...</p>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  // Show authentication modal if not authenticated
  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <div className={`${inter.className} flex min-h-screen bg-background`}>
          <div className="flex-1 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Lock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Admin Access Required</CardTitle>
                  <CardDescription>
                    Please enter the admin password to access the admin panel.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter admin password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className={cn(
                            'pr-10',
                            authError && 'border-red-500 focus-visible:ring-red-500'
                          )}
                          disabled={isLoading}
                          autoFocus
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {authError && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-red-600"
                        >
                          {authError}
                        </motion.p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={!password.trim() || isLoading}
                      >
                        {isLoading ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                            Verifying...
                          </>
                        ) : (
                          'Access Admin Panel'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleBackToApp}
                        disabled={isLoading}
                      >
                        Back to Main App
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <div className={`${inter.className} flex min-h-screen bg-background`}>
        {/* Mobile Sidebar */}
        <AnimatePresence>
          {isMobileOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeMobileSidebar}
              />
              <motion.div
                className="fixed top-0 left-0 z-50 flex h-full w-64 flex-col rounded-r-2xl bg-background shadow-2xl"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <SidebarContent />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        <aside
          className={cn(
            'hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-10 lg:flex lg:flex-col lg:overflow-y-auto',
            'transition-all duration-300 ease-in-out',
            isSidebarCollapsed ? 'lg:w-[70px]' : 'lg:w-64'
          )}
        >
          <div className="flex h-full flex-col bg-background/60 shadow-md backdrop-blur-lg">
            <SidebarContent />
          </div>
        </aside>

        {/* Main Content */}
        <main
          className={cn(
            'flex flex-1 flex-col transition-all duration-300 ease-in-out fill-available',
            isSidebarCollapsed ? 'lg:ml-[70px]' : 'lg:ml-64'
          )}
        >
          {/* Top Navigation */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="hidden shrink-0 lg:flex"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            >
              {isSidebarCollapsed ? (
                <PanelRightClose className="h-6 w-6" />
              ) : (
                <PanelLeftClose className="h-6 w-6" />
              )}
            </Button>

            <div className="flex flex-1 items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">Admin Panel</h1>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Clear admin session when going back to main app
                      sessionStorage.removeItem('admin_authenticated')
                    }}
                  >
                    Back to App
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 p-4 !pb-20 sm:p-6 lg:p-8 bg-content [&>*]:bg-content">
            {children}
          </div>

          {/* Footer */}
          <footer
            className={cn(
              'fixed bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ease-in-out',
              isSidebarCollapsed ? 'right-0 lg:left-[70px]' : 'right-0 lg:left-64'
            )}
          >
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
              <p className="text-sm text-muted-foreground">
                © 2024 Smuves Admin Panel. All rights reserved.
              </p>
              <p className="text-sm text-muted-foreground">Super Admin Access Only</p>
            </div>
          </footer>
        </main>
      </div>
    </ThemeProvider>
  )
}
