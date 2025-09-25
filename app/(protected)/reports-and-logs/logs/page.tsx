import { getServerUserSettingsWithUser } from '@/lib/store/serverUtils'
import { UserSettingsProvider } from '@/components/providers/UserSettingsProvider'
import { UserProvider } from '@/components/providers/UserProvider'
// import PremiumUpgrade from '@/components/premium/PremiumUpgrade'
import LogsManager from '@/components/audit/Logs'

export default async function LogsRoute() {
  const { user, userSettings } = await getServerUserSettingsWithUser()

  if (!user) {
    return <div className="text-red-500">User not found</div>
  }

  if (!userSettings) {
    return <div className="text-red-500">User settings not found</div>
  }

  return (
    <UserSettingsProvider initialUserSettings={userSettings}>
      <UserProvider initialUser={user}>
        <div className="space-y-6">
          <LogsManager />

          {/* Premium prompt (optional) */}
          {/* {!userSettings?.is_premium && (
            <div className="mt-8">
              <PremiumUpgrade user={user} />
            </div>
          )} */}
        </div>
      </UserProvider>
    </UserSettingsProvider>
  )
}
