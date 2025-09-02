import { getServerUserSettingsWithUser } from '@/lib/store/serverUtils'
import { UserSettingsProvider } from '@/components/providers/UserSettingsProvider'
import PageManager from '@/components/pages/PageManager'

export default async function ExportsRoute() {
  const { user, userSettings } = await getServerUserSettingsWithUser()

  if (!user) {
    return <div className="text-red-500">User not found</div>
  }

  if (!userSettings) {
    return <div className="text-red-500">User settings not found</div>
  }

  return (
    <UserSettingsProvider initialUserSettings={userSettings}>
      <>
        <div className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Exports</h1>
              <p className="mt-1 mb-2.5 text-muted-foreground">
                Export data from HubSpot to Google Sheets for bulk editing.
              </p>
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              Last Updated: <span id="last-updated-display" className="font-medium">—</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <PageManager user={user} userSettings={userSettings} />
        </div>
      </>
    </UserSettingsProvider>
  )
}
