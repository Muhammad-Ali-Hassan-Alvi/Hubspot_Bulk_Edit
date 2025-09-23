// components/shared/Navbar.tsx
'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
// import { usePathname } from 'next/navigation'
import {
  Menu,
  LogOut,
  PanelLeftClose,
  User,
  CreditCard,
  Gift,
  Paintbrush,
  Sun,
  Moon,
  Laptop,
  PanelRightClose,
  Bell,
  Plug,
} from 'lucide-react'
import { useLayout } from '@/app/(protected)/layout-context'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUserSettings } from '@/hooks/useUserSettings'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import ComingSoonBadge from '../ui/coming-soon-badge'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'

// function getTitleFromPathname(pathname: string): string {
//   const parts = pathname.split('/').filter(Boolean)
//   if (parts.length === 0) return 'Dashboard'
//   const lastPart = parts[parts.length - 1]
//   return lastPart.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
// }

export default function Navbar() {
  // const pathname = usePathname()
  // const pageTitle = getTitleFromPathname(pathname)
  const { setTheme } = useTheme()
  const { userSettings: _userSettings } = useUserSettings()

  // **THE FIX IS HERE**: Rename `isSidebarCollapsed` to `isCollapsed` for local use
  const {
    isSidebarCollapsed: isCollapsed,
    toggleSidebar,
    toggleMobileSidebar,
    connectionStatus,
  } = useLayout()

  const handleNavigation = () => {
    redirect('/dashboard')
  }

  const StatusIndicator = ({ connected }: { connected: boolean }) => (
    <span className={`mr-2 h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
  )

  return (
    <header className="sticky top-0 z-[50] flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="flex shrink-0 lg:hidden"
        onClick={toggleMobileSidebar}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Toggle mobile menu</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="hidden shrink-0 lg:flex"
        onClick={toggleSidebar}
      >
        {isCollapsed ? (
          <PanelRightClose className="h-6 w-6" />
        ) : (
          <PanelLeftClose className="h-6 w-6" />
        )}
      </Button>

      <div className="flex-1">
        {/* <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1> */}
      </div>

      <div className="flex items-center justify-end gap-2 md:gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Plug
                className={`h-5 w-5 ${
                  connectionStatus.loading
                    ? 'text-gray-400'
                    : connectionStatus.hubspot && connectionStatus.google
                      ? 'text-green-500'
                      : 'text-red-500'
                }`}
              />
              <span className="sr-only">Connection Status</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Connection Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {connectionStatus.loading ? (
              <DropdownMenuItem disabled>
                <span className="text-sm text-muted-foreground">Loading...</span>
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem disabled className="cursor-default">
                  <StatusIndicator connected={connectionStatus.hubspot} />
                  <span>HubSpot</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="cursor-default">
                  <StatusIndicator connected={connectionStatus.google} />
                  <span>Google Sheets</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <Link href="/dashboard" onClick={handleNavigation}>
              <DropdownMenuItem>Manage Integrations</DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-4 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-9 w-9 relative cursor-pointer">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[260px] bg-background">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/profile" onClick={handleNavigation}>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
            </Link>
            <Link
              aria-disabled
              href="/billing"
              onClick={e => {
                e.preventDefault()
              }}
            >
              <DropdownMenuItem className="flex items-center">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Change Plan</span>
                <ComingSoonBadge className="ml-auto text-[13px]" />
              </DropdownMenuItem>
            </Link>
            <Link
              href="/referrals"
              onClick={e => {
                e.preventDefault()
              }}
            >
              <DropdownMenuItem>
                <Gift className="mr-2 h-4 w-4" />
                <span>Referrals</span>
                <ComingSoonBadge className="ml-auto text-[13px]" />
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Paintbrush className="mr-2 h-4 w-4" />
                <span>Theme</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-background">
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Laptop className="mr-2 h-4 w-4" />
                  System
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                window.location.href = '/auth'
              }}
              className=""
            >
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
