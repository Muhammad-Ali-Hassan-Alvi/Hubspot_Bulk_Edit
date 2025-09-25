'use client'
import { Card, CardContent } from '@/components/ui/card'
import AuditLogs from '@/components/audit/AuditLogs'

export default function LogsManager() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground">
          Monitor all activities and track changes across your account and HubSpot integrations
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <AuditLogs />
        </CardContent>
      </Card>
    </div>
  )
}
