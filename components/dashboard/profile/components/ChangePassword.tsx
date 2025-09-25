'use client'

import React, { useState } from 'react'
// import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react'
import { isPasswordValid } from '@/lib/validators/password'
import { InputWithIcon } from '@/components/ui/input-with-icon'
import PasswordChecklist from '@/components/auth/PasswordChecklist'

export default function ChangePassword() {
  const { toast } = useToast()
  const supabase = createClient()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const isValid = isPasswordValid(newPassword)

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) {
      toast({
        title: 'Invalid Password',
        description: 'Password must meet all the requirements below.',
        variant: 'destructive',
      })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }

    setIsSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast({ title: 'Password Update Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Password Updated Successfully' })
      setNewPassword('')
      setConfirmPassword('')
    }
    setIsSavingPassword(false)
  }

  return (
    <Card>
      <form onSubmit={handlePasswordUpdate}>
        <CardHeader>
          <CardTitle>
            <KeyRound className="h-5 w-5 mr-2 inline" />
            Password
          </CardTitle>
          <CardDescription>
            You can set or change your password here. This can be used as an alternative sign-in
            method.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <InputWithIcon
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              icon={showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              onIconClick={() => setShowNewPassword(prev => !prev)}
            />
          </div>
          <PasswordChecklist password={newPassword} />
          <div>
            <Label htmlFor="confirmNewPassword">Confirm Password</Label>
            <InputWithIcon
              id="confirmNewPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              icon={
                showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />
              }
              onIconClick={() => setShowConfirmPassword(prev => !prev)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSavingPassword || !newPassword || !confirmPassword}>
            {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Set New Password
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
