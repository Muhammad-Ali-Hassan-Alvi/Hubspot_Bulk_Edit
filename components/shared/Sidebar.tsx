// components/shared/Sidebar.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  X,
  LayoutDashboard,
  // ClipboardEdit,
  BarChart2,
  RotateCcw,
  ArrowBigDownDash,
  ArrowBigUpDash,
  Import,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLayout } from '@/app/(protected)/layout-context'
import { useLoading } from '@/app/(protected)/loading-context'

const dashboardLink = { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }
const bulkEditLinks = [
  { name: 'Exports', href: '/bulk-edits/exports', icon: ArrowBigUpDash },
  { name: 'Imports', href: '/bulk-edits/imports', icon: ArrowBigDownDash },
  // { name: 'In-App Edits', href: '/bulk-edits/in-app-edits', icon: ClipboardEdit },
]
const backupLinks = [
  { name: 'Backup', href: '/backup-and-restore/backup', icon: Import },
  { name: 'Restore', href: '/backup-and-restore/restore', icon: RotateCcw },
]
const dataLinks = [
  { name: 'Reports', href: '/reports-and-logs/reports', icon: BarChart2 },
  { name: 'Logs', href: '/reports-and-logs/logs', icon: ShieldCheck },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  // This line now works perfectly.
  const { isSidebarCollapsed: isCollapsed, isMobileOpen, closeMobileSidebar } = useLayout()
  const { setIsLoading } = useLoading()

  // Ensure component is mounted before using theme
  useEffect(() => {
    setMounted(true)
  }, [])

  // Debug: Log theme values
  // console.log('Theme debug:', { theme, resolvedTheme, mounted })

  // Determine which logo to show based on theme and sidebar state
  const logoSrc =
    mounted && resolvedTheme === 'dark'
      ? isCollapsed
        ? '/Logo-Shrink-Dark.png'
        : '/Logo-Dark.png'
      : isCollapsed
        ? '/Logo-Shrink-Light.png'
        : '/Logo-Light.png'
  // console.log('Logo src:', logoSrc, 'Collapsed:', isCollapsed)

  const handleNavigation = () => {
    setIsLoading(true)
    closeMobileSidebar()
  }

  const NavLink = ({ link }: { link: { name: string; href: string; icon: React.ElementType } }) => (
    <Link
      href={link.href}
      onClick={handleNavigation}
      className={cn(
        'flex items-center rounded-lg py-2 font-medium transition-all group',
        pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
          ? 'bg-[linear-gradient(to_right,_#66A9EA,_#76E8A2)] text-[hsl(var(--sidebar-accent-foreground))] shadow-md'
          : 'hover:bg-[linear-gradient(to_right,_#66A9EA22,_#76E8A222)] hover:text-[#66A9EA]',
        isCollapsed ? 'justify-center px-3' : 'gap-4 px-4'
      )}
      title={isCollapsed ? link.name : ''}
    >
      <link.icon
        className={cn(
          'h-5 w-5 shrink-0 transition-all group-hover:scale-110',
          // Icon color matches text color for active and hover states
          pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
            ? 'text-white'
            : 'text-foreground group-hover:text-[#66A9EA]'
        )}
      />
      <span
        className={cn(
          'overflow-hidden transition-all duration-200',
          isCollapsed ? 'w-0' : 'w-full'
        )}
      >
        {link.name}
      </span>
    </Link>
  )

  const SidebarHeading = ({ title }: { title: string }) => (
    <AnimatePresence>
      {!isCollapsed && (
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
      {/* Desktop header with logo and close button */}
      <div
        className={cn(
          'hidden lg:flex h-16 items-center border-b',
          isCollapsed ? 'justify-center' : 'justify-between px-4'
        )}
      >
        <Link href="/" onClick={() => setIsLoading(true)} className="flex items-center">
          <div className={cn('relative shrink-0', isCollapsed ? 'h-10 w-10' : 'h-36 w-48')}>
            <Image
              fill
              src={logoSrc}
              alt="Smuves Logo"
              className="object-contain"
              priority
              key={`${resolvedTheme}-${isCollapsed}`} // Force re-render when theme or collapse state changes
            />
          </div>
        </Link>
      </div>

      {/* Mobile close button - positioned at top right */}
      <div className="flex lg:hidden justify-end p-4">
        <button
          onClick={closeMobileSidebar}
          className="text-secondary-foreground hover:text-red-500"
        >
          <X size={24} />
        </button>
      </div>

      <nav className={cn('flex-1 space-y-2 py-4', isCollapsed ? 'px-2' : 'px-3')}>
        <div className="space-y-1">
          <NavLink key={dashboardLink.href} link={dashboardLink} />
        </div>
        <div>
          <SidebarHeading title="Bulk Edits" />
          <div className="space-y-1">
            {bulkEditLinks.map(link => (
              <NavLink key={link.href} link={link} />
            ))}
          </div>
        </div>
        <div>
          <SidebarHeading title="Backup and Restore" />
          <div className="space-y-1">
            {backupLinks.map(link => (
              <NavLink key={link.href} link={link} />
            ))}
          </div>
        </div>
        <div>
          <SidebarHeading title="Reports and Logs" />
          <div className="space-y-1">
            {dataLinks.map(link => (
              <NavLink key={link.href} link={link} />
            ))}
          </div>
        </div>
      </nav>
    </>
  )

  return (
    <>
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
      <aside
        className={cn(
          'hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-10 lg:flex lg:flex-col lg:overflow-y-auto custom-scrollbar',
          'transition-all duration-300 ease-in-out',
          isCollapsed ? 'lg:w-[70px]' : 'lg:w-64'
        )}
      >
        <div className="flex h-full flex-col bg-background/60 shadow-md backdrop-blur-lg">
          <SidebarContent />
        </div>
      </aside>
    </>
  )
}
