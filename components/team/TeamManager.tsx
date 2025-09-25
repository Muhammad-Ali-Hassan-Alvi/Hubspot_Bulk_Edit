'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DateDisplay } from '@/components/shared/DateDisplay'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Users, UserPlus, Crown, Shield, Eye, Mail, Calendar } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface TeamManagerProps {
  user: User
  isPremium: boolean
}

interface TeamMember {
  id: string
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  status: 'active' | 'pending' | 'inactive'
  joinedAt: string
  lastActive: string
}

export default function TeamManager({ user, isPremium }: TeamManagerProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: user.id,
      email: user.email || '',
      role: 'owner',
      status: 'active',
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    },
  ])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />
      case 'member':
        return <Users className="h-4 w-4 text-green-600" />
      case 'viewer':
        return <Eye className="h-4 w-4 text-muted-foreground" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default'
      case 'admin':
        return 'secondary'
      case 'member':
        return 'outline'
      case 'viewer':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'inactive':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const inviteTeamMember = async () => {
    if (!isPremium) {
      toast({
        title: 'Premium Feature',
        description: 'Team collaboration is available with Premium plans',
        variant: 'destructive',
      })
      return
    }

    if (!inviteEmail.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter an email address',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      const newMember: TeamMember = {
        id: `temp-${Date.now()}`,
        email: inviteEmail,
        role: inviteRole,
        status: 'pending',
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      }

      setTeamMembers([...teamMembers, newMember])
      setInviteEmail('')
      setInviteRole('member')

      toast({
        title: 'Invitation Sent! 📧',
        description: `Invited ${inviteEmail} as ${inviteRole}`,
      })
    } catch (error) {
      console.error('Failed to send invitation:', error)
      toast({
        title: 'Invitation Failed',
        description: 'Failed to send team invitation',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const removeTeamMember = async (memberId: string) => {
    if (!isPremium) return

    try {
      setTeamMembers(teamMembers.filter(member => member.id !== memberId))
      toast({
        title: 'Member Removed',
        description: 'Team member has been removed',
      })
    } catch (error) {
      console.error('Failed to remove team member:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive',
      })
    }
  }

  const updateMemberRole = async (memberId: string, newRole: string) => {
    if (!isPremium) return

    try {
      setTeamMembers(
        teamMembers.map(member =>
          member.id === memberId ? { ...member, role: newRole as any } : member
        )
      )
      toast({
        title: 'Role Updated',
        description: `Member role updated to ${newRole}`,
      })
    } catch (error) {
      console.error('Failed to update member role:', error)
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive',
      })
    }
  }

  if (!isPremium) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Management
          </CardTitle>
          <CardDescription>Collaborate with your team on HubSpot backups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Crown className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Premium Feature</h3>
            <p className="text-muted-foreground mb-4">
              Team collaboration and role-based permissions are available with Premium plans
            </p>
            <Button
              onClick={() =>
                (document.querySelector('[value="premium"]') as HTMLButtonElement | null)?.click()
              }
            >
              Upgrade to Premium
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
                <p className="text-sm text-muted-foreground">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">
                  {teamMembers.filter(m => m.status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {teamMembers.filter(m => m.role === 'admin').length}
                </p>
                <p className="text-sm text-muted-foreground">Administrators</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite New Member */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </CardTitle>
          <CardDescription>Add new members to collaborate on your HubSpot backups</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                type="email"
              />
            </div>
            <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={inviteTeamMember} disabled={loading} className="w-full">
            {loading ? 'Sending Invitation...' : 'Send Invitation'}
          </Button>
        </CardContent>
      </Card>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage your team members and their permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map(member => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-muted/50 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{member.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={getRoleBadgeVariant(member.role)}
                        className="flex items-center gap-1"
                      >
                        {getRoleIcon(member.role)}
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(member.status)}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Joined <DateDisplay date={member.joinedAt} format="short" />
                      </span>
                    </div>
                  </div>

                  {member.role !== 'owner' && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={value => updateMemberRole(member.id, value)}
                        disabled={member.status === 'pending'}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeTeamMember(member.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>Understanding what each role can do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Owner</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Full access to all features</li>
                <li>• Manage team members</li>
                <li>• Billing and subscription</li>
                <li>• Delete account</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Administrator</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Manage backups</li>
                <li>• Configure settings</li>
                <li>• View audit logs</li>
                <li>• Invite members</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                <span className="font-medium">Member</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create backups</li>
                <li>• View pages</li>
                <li>• Basic settings</li>
                <li>• View own activity</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Viewer</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View pages</li>
                <li>• View backup history</li>
                <li>• Read-only access</li>
                <li>• No modifications</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
