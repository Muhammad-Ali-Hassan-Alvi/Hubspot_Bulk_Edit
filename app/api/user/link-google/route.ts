import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const { userId, googleEmail } = await request.json()

    if (!userId || !googleEmail) {
      return NextResponse.json({ error: 'User ID and Google email are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get the current user to check existing identities
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError || !user.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if this Google email is already linked to another account
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers()

    if (searchError) {
      return NextResponse.json({ error: 'Failed to search for existing users' }, { status: 500 })
    }

    // Check if the Google email is already linked to any user
    const emailAlreadyLinked = existingUsers.users.some(user =>
      user.identities?.some(
        identity => identity.provider === 'google' && identity.identity_data?.email === googleEmail
      )
    )

    if (emailAlreadyLinked) {
      return NextResponse.json(
        { error: 'This Google account is already linked to another user' },
        { status: 409 }
      )
    }

    // Check if the current user already has this Google email linked
    const hasGoogleLinked = user.user.identities?.some(
      identity => identity.provider === 'google' && identity.identity_data?.email === googleEmail
    )

    if (hasGoogleLinked) {
      return NextResponse.json(
        { error: 'This Google account is already linked to your profile' },
        { status: 409 }
      )
    }

    // For now, we'll return a success response indicating the user should complete OAuth
    // The actual linking will happen during the OAuth callback
    return NextResponse.json({
      success: true,
      message: 'Google account can be linked. Please complete the OAuth flow.',
      requiresOAuth: true,
    })
  } catch (error) {
    console.error('Error in link-google route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, identityId } = await request.json()

    if (!userId || !identityId) {
      return NextResponse.json({ error: 'User ID and identity ID are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get the current user to check if this is the last sign-in method
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError || !user.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if this is the last sign-in method
    const remainingIdentities =
      user.user.identities?.filter(identity => identity.id !== identityId) || []

    if (remainingIdentities.length === 0) {
      return NextResponse.json({ error: 'Cannot unlink the last sign-in method' }, { status: 400 })
    }

    // Unlink the identity
    const { error: unlinkError } = await supabase.auth.admin.unlinkIdentity(userId, identityId)

    if (unlinkError) {
      return NextResponse.json({ error: unlinkError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Google account unlinked successfully',
    })
  } catch (error) {
    console.error('Error in unlink-google route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
