import { SnapshotsCard } from './SnapshotsCard'

export default function ImportsPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Imports</h1>
        <p className="text-muted-foreground">View and manage all your historical data imports.</p>
      </div>

      <SnapshotsCard />
    </div>
  )
}
