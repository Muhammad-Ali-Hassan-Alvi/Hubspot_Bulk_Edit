import AuthForm from '@/components/auth/AuthForm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import React from 'react'

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function page({ searchParams }: PageProps) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const error = searchParams.error

  if (error) {
    redirect('/auth')
  }
  return (
    <div className="justify-center items-center flex h-screen bg-muted">
      <AuthForm />
    </div>
  )
}
