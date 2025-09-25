import { SnapshotsCard } from './SnapshotsCard'

export default function BackupPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Backups</h1>
        <p className="text-muted-foreground">View and manage all your historical data backups.</p>
      </div>

      <SnapshotsCard />
    </div>
  )
}
