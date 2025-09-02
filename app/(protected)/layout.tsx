import { LayoutProvider } from './layout-context'
import { LoadingProvider } from './loading-context'
import DashboardClientLayout from './DashboardClientLayout'
import { ThemeProvider } from '@/components/theme-provider'

// This is a Server Component by default
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <LayoutProvider>
          <DashboardClientLayout>{children}</DashboardClientLayout>
        </LayoutProvider>
      </LoadingProvider>
    </ThemeProvider>
  )
}
