import ImportManager from './ImportManager'

export default function ImportsPage() {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Import pages</h1>
        <p className="text-muted-foreground">Import data from CSV files or Google Sheets and sync changes to HubSpot</p>
      </div>

      <ImportManager contentType="pages" />
    </div>
  )
}
