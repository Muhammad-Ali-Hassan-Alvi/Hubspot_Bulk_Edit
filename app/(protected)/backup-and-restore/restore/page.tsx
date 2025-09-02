// app/dashboard/rollback/page.tsx

import { getServerUserSettingsWithUser } from '@/lib/store/serverUtils'
import { UserSettingsProvider } from '@/components/providers/UserSettingsProvider'
import VersionHistory from '@/components/dashboard/VersionHistory'

export default async function RollbackRoute() {
  const { user, userSettings } = await getServerUserSettingsWithUser()

  if (!user) {
    return <div className="text-red-500">User not found</div>
  }

  if (!userSettings) {
    return <div className="text-red-500">User settings not found</div>
  }

  return (
    <UserSettingsProvider initialUserSettings={userSettings}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Restore</h1>
          <p className="mt-1 text-muted-foreground">
            Recover your Hubspot Pages back to the previous verisons.
          </p>
        </div>
        <VersionHistory />
      </div>
    </UserSettingsProvider>
  )
}
