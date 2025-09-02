'use client'

import React from 'react'
import type { User } from '@supabase/supabase-js'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Camera, User as UserIcon } from 'lucide-react'

interface ProfileInformationProps {
  user: User
  firstName: string
  lastName: string
  companyName: string
  companyAddress: string
  isSavingProfile: boolean
  isSavingSettings: boolean
  setFirstName: React.Dispatch<React.SetStateAction<string>>
  setLastName: React.Dispatch<React.SetStateAction<string>>
  setCompanyName: React.Dispatch<React.SetStateAction<string>>
  setCompanyDomain: React.Dispatch<React.SetStateAction<string>>
  setIsSavingProfile: React.Dispatch<React.SetStateAction<boolean>>
  setIsSavingSettings: React.Dispatch<React.SetStateAction<boolean>>
}

export default function ProfileInformation({
  firstName,
  lastName,
  companyName,
  companyAddress,
  isSavingProfile,
  setFirstName,
  setLastName,
  setCompanyName,
  setCompanyDomain,
  setIsSavingProfile,
}: ProfileInformationProps) {
  const supabase = createClient()
  const { toast } = useToast()

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim()) {
      toast({ title: 'First name is required ', variant: 'destructive' })
      return
    }
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/
    if (companyAddress && !domainRegex.test(companyAddress.trim())) {
      toast({
        title: 'Invalid Company Domain',
        description: 'Please enter a valid domain (e.g., example.com)',
        variant: 'destructive',
      })
      return
    }
    setIsSavingProfile(true)
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
    const [authRes, settingsRes] = await Promise.all([
      supabase.auth.updateUser({
        data: { first_name: firstName, last_name: lastName, full_name: fullName },
      }),
      fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: companyName, company_address: companyAddress }),
      }),
    ])
    if (authRes.error || !settingsRes.ok) {
      toast({
        title: 'Error saving profile',
        description: authRes.error?.message,
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Profile Updated', description: 'Your info was saved successfully.' })
    }
    setIsSavingProfile(false)
  }

  return (
    <div>
      <Card className="mb-8">
        <form onSubmit={handleProfileUpdate}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="h-6 w-6" />
                <h1 className="text-2xl font-semibold">Profile Information</h1>
              </div>

              {/* Avatar block */}
              <div className="relative group cursor-not-allowed opacity-75">
                {/* Avatar Circle */}
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 border-2" />

                {/* Camera icon */}
                <div className="absolute bottom-0 right-0 h-7 w-7 bg-background border rounded-full flex items-center justify-center">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Coming soon on hover */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-2xl bg-background border border-border px-2 py-1 text-xs font-extrabold text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  Coming Soon
                </div>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Company Name</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </div>
            <div>
              <Label>Company Domain</Label>
              <Input value={companyAddress} onChange={e => setCompanyDomain(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Profile
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
