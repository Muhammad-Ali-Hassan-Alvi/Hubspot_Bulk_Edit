import { getServerUserSettingsWithUser } from '@/lib/store/serverUtils'
import { UserSettingsProvider } from '@/components/providers/UserSettingsProvider'
import ImportsPage from '@/components/imports/ImportsPage'

export default async function Imports() {
  const { user, userSettings } = await getServerUserSettingsWithUser()

  if (!user) {
    return <div className="text-red-500">User not found</div>
  }

  if (!userSettings) {
    return <div className="text-red-500">User settings not found</div>
  }

  return (
    <UserSettingsProvider initialUserSettings={userSettings}>
      <ImportsPage user={user} userSettings={userSettings} />
    </UserSettingsProvider>
  )
}
