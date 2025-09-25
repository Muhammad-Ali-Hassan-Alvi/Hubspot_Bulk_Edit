'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'

export default function GoogleAuthButton() {
  const supabase = createClient()
  const { toast } = useToast()

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('Google OAuth Error:', error.message)
      toast({
        title: 'Google Sign-In Failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full bg-background border border-gray-300 hover:bg-popover text-gray-700 font-medium shadow-sm transition flex items-center justify-center gap-2"
      onClick={handleGoogleSignIn}
    >
      <Image
        src="https://www.svgrepo.com/show/475656/google-color.svg"
        alt="Google"
        width={20}
        height={20}
        className="h-5 w-5 text-accent-foreground"
      />
      Continue with Google
    </Button>
  )
}
