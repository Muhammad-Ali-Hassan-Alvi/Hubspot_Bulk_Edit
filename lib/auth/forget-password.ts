import { createClient } from '@/lib/supabase/client'

export async function sendPasswordReset(
  email: string,
  redirectTo?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // Only use window.location if it's running in the browser
  const fallbackRedirect =
    typeof window !== 'undefined' ? `${window.location.origin}/auth/update-password` : undefined

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || fallbackRedirect,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
