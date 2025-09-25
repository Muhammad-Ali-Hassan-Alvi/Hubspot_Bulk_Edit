import { getServerUserSettingsWithUser } from '@/lib/store/serverUtils'
import { UserSettingsProvider } from '@/components/providers/UserSettingsProvider'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HelpPageContent from '@/components/help/HelpPageContent'
import PremiumUpgrade from '@/components/premium/PremiumUpgrade'

export default async function HelpPage() {
  const { user, userSettings } = await getServerUserSettingsWithUser()

  if (!user) return redirect('/login')

  if (!userSettings?.has_seen_help) {
    // Mark help as seen
    const supabase = createClient()
    await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, has_seen_help: true }, { onConflict: 'user_id' })
      .eq('user_id', user.id)
  } else {
    return redirect('/dashboard')
  }

  return (
    <UserSettingsProvider initialUserSettings={userSettings}>
      <div className="max-w-6xl mx-auto py-12 px-6 space-y-6">
        <HelpPageContent />
        {!userSettings?.is_premium && (
          <div className="mt-8">
            <PremiumUpgrade user={user} />
          </div>
        )}
      </div>
    </UserSettingsProvider>
  )
}
