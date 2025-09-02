// components/dashboard/reports/SnapshotsCard.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, ClockArrowDown } from 'lucide-react'
import { StaticBarChart } from './StaticBarChart' // Import the chart component
import InDevelopmentOverlay from '@/components/ui/in-development-overlay'
import ComingSoonBadge from '@/components/ui/coming-soon-badge'

export const SnapshotsCard = () => {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClockArrowDown className="h-5 w-5" /> Historical Snapshots
            </CardTitle>
            <CardDescription className="mt-1">
              Track your content growth over time. Powered by your store history.
            </CardDescription>
          </div>
          <ComingSoonBadge className="border-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative rounded-lg border-2 border-dashed border-foreground">
          <InDevelopmentOverlay Icon={Camera} />
          <StaticBarChart />
        </div>
      </CardContent>
    </Card>
  )
}
