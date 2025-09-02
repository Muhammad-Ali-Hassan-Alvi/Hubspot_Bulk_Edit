import { SnapshotsCard } from './SnapshotsCard'

export default function ReportsDashboard() {
  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Analyze your content inventory and track changes over time.
        </p>
      </div>

      <SnapshotsCard />
    </div>
  )
}
