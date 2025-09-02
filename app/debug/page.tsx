import SupabaseDebug from '@/components/debug/SupabaseDebug'

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-popover py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Debug Dashboard</h1>
          <p className="text-muted-foreground">Diagnose connection and configuration issues</p>
        </div>

        <SupabaseDebug />
      </div>
    </div>
  )
}
