import { getServerUserSettingsWithUser } from '@/lib/store/serverUtils'
import { UserSettingsProvider } from '@/components/providers/UserSettingsProvider'
import InAppPageManager from '@/components/in-app-edits/InAppPageManager'

export default async function RollbackRoute() {
  const { user, userSettings } = await getServerUserSettingsWithUser()

  if (!user) {
    return <div className="p-4">User not authenticated.</div>
  }

  return (
    <UserSettingsProvider initialUserSettings={userSettings}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">In-App Edits</h1>
          <p className="mt-1 text-muted-foreground">
            Directly edit your HubSpot content records. All fields are dropdowns for quick
            modifications.
          </p>
        </div>
        <InAppPageManager user={user} userSettings={userSettings} />
      </div>
    </UserSettingsProvider>
  )
}
