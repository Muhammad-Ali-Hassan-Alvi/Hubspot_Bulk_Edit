import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowBigDown, Camera } from 'lucide-react'
import { StaticTradingChart } from './StaticBarChart'
import InDevelopmentOverlay from '@/components/ui/in-development-overlay'
import ComingSoonBadge from '@/components/ui/coming-soon-badge'

export const SnapshotsCard = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-xl gap-2">
              <ArrowBigDown className="h-4 w-4" /> Import Snapshots
            </CardTitle>
            <CardDescription className="mt-1">
              Visualize key metrics from your past imports.
            </CardDescription>
          </div>
          <ComingSoonBadge className="border-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-52 w-full rounded-lg border-2 border-dashed border-foreground p-2">
          <InDevelopmentOverlay Icon={Camera} />
          <StaticTradingChart />
        </div>
      </CardContent>
    </Card>
  )
}
