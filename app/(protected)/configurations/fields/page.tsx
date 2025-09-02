import { getServerUserSettingsWithUser } from '@/lib/store/serverUtils'
import { UserSettingsProvider } from '@/components/providers/UserSettingsProvider'
import FieldConfigurator from '@/components/fields/FieldConfigurator'
import HubSpotConnect from '@/components/hubspot/HubSpotConnect'

export default async function ConnectPage() {
  const { user, userSettings } = await getServerUserSettingsWithUser()

  if (!user) {
    return <div className="text-red-500">User not found</div>
  }

  return (
    <UserSettingsProvider initialUserSettings={userSettings}>
      <div className="space-y-6">
        <HubSpotConnect user={user} userSettings={userSettings} />
        <FieldConfigurator user={user} /* hubspotToken={userSettings?.hubspot_token_encrypted} */ />

        {/* You can still show the upgrade prompt on relevant pages */}
        {/* {!userSettings?.is_premium && (
          <div className="mt-8">
            <PremiumUpgrade user={user} />
          </div>
        )} */}
      </div>
    </UserSettingsProvider>
  )
}
