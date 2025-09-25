// app/dashboard/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileManager from '@/components/dashboard/profile/ProfileManager'

export default async function ProfilePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If there's no user, redirect them to the login page
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <ProfileManager user={user} />
    </div>
  )
}
