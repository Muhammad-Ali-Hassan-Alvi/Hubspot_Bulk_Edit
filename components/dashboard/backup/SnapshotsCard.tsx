import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import InDevelopmentOverlay from '@/components/ui/in-development-overlay'
import ComingSoonBadge from '@/components/ui/coming-soon-badge'
import { StaticBackupChart } from './StaticBarChart'
import { Download, Server } from 'lucide-react'

export const SnapshotsCard = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex text-xl items-center gap-2">
              <Download className="h-4 w-4" /> Backup Snapshots
            </CardTitle>
            <CardDescription className="mt-1">
              Visualize key metrics from your past backups.
            </CardDescription>
          </div>
          <ComingSoonBadge className="border-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-52 w-full rounded-lg border-2 border-dashed border-foreground p-2">
          <InDevelopmentOverlay Icon={Server} />
          <StaticBackupChart />
        </div>
      </CardContent>
    </Card>
  )
}
