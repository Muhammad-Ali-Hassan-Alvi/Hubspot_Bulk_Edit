import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Test endpoint to verify route is working
export async function GET() {
  console.log('🔍 link-email GET route hit')
  return NextResponse.json({ message: 'link-email route is working' })
}

export async function POST(request: NextRequest) {
  console.log('🔍 link-email POST route hit')
  try {
    const { userId, email, password } = await request.json()
    console.log('📝 Received payload:', { userId, email, password: '***' })

    if (!userId || !email || !password) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { error: 'User ID, email, and password are required' },
        { status: 400 }
      )
    }

    console.log('🔑 Creating Supabase service client...')
    const supabase = createServiceClient()
    console.log('✅ Supabase service client created')

    // Test the service role key permissions
    console.log('🔍 Testing service role key permissions...')
    try {
      const testResult = await supabase.auth.admin.listUsers()
      console.log('🔑 Admin listUsers test result:', {
        hasData: !!testResult.data,
        hasError: !!testResult.error,
        errorMessage: testResult.error?.message,
        userCount: testResult.data?.users?.length || 0,
      })

      if (testResult.error) {
        console.log('❌ Service role key lacks admin permissions:', testResult.error.message)
        return NextResponse.json(
          {
            success: false,
            message: 'Service role key lacks admin permissions',
            error: testResult.error.message,
            suggestion: 'Please check your SUPABASE_SERVICE_ROLE_KEY in .env.local',
          },
          { status: 403 }
        )
      }
    } catch (testError) {
      console.log('❌ Admin permissions test failed:', testError)
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to test admin permissions',
          error: testError instanceof Error ? testError.message : 'Unknown error',
        },
        { status: 500 }
      )
    }

    // Try to get user info first without admin access
    console.log('🔍 Trying to get user info...')
    let userData = null
    let userError = null

    try {
      // First try with admin access
      const adminResult = await supabase.auth.admin.getUserById(userId)
      userData = adminResult.data
      userError = adminResult.error
      console.log('🔑 Admin lookup result:', { hasUser: !!userData?.user, hasError: !!userError })
    } catch (adminError) {
      console.log('❌ Admin lookup failed:', adminError)
      userError = adminError
    }

    // If admin lookup failed, try alternative approach
    if (userError || !userData?.user) {
      console.log('🔄 Admin lookup failed, trying alternative approach...')

      // For now, let's create a simple user lookup
      // This is a fallback - in production you'd want proper admin access
      try {
        // Check if we can at least verify the user exists by checking the request
        console.log('📝 Proceeding with basic validation...')

        // For debugging, let's return the user ID we received
        return NextResponse.json(
          {
            success: false,
            message: 'Admin access required for user lookup',
            receivedUserId: userId,
            error: 'Service role key may not have admin permissions',
          },
          { status: 403 }
        )
      } catch (fallbackError) {
        console.log('❌ Fallback also failed:', fallbackError)
        return NextResponse.json(
          {
            error: 'User lookup failed',
            details: (userError as any)?.message || 'Admin access required',
          },
          { status: 500 }
        )
      }
    }

    const user = userData.user

    // Check if this email is already linked to another account
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers()

    if (searchError) {
      return NextResponse.json({ error: 'Failed to search for existing users' }, { status: 500 })
    }

    // Check if the email is already linked to any user
    const emailAlreadyLinked = existingUsers.users.some(
      user =>
        user.email === email ||
        user.identities?.some(
          identity => identity.provider === 'email' && identity.identity_data?.email === email
        )
    )

    if (emailAlreadyLinked) {
      return NextResponse.json(
        { error: 'This email is already linked to another user' },
        { status: 409 }
      )
    }

    // Check if the current user already has this email linked
    const hasEmailLinked =
      user.email === email ||
      user.identities?.some(
        identity => identity.provider === 'email' && identity.identity_data?.email === email
      )

    if (hasEmailLinked) {
      return NextResponse.json(
        { error: 'This email is already linked to your profile' },
        { status: 409 }
      )
    }

    // IMPORTANT: Check if user already has a linked email (only allow ONE additional email)
    const currentMetadata = user.user_metadata || {}
    const linkedEmails = currentMetadata.linked_emails || []

    if (linkedEmails.length >= 1) {
      return NextResponse.json(
        {
          error:
            'You can only link ONE additional email account. Please unlink the existing one first.',
        },
        { status: 400 }
      )
    }

    // For email linking, we'll use a different approach
    // We'll create a custom linking table to track linked accounts
    try {
      // Add the new email to linked emails (only one allowed)
      linkedEmails.push(email)

      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...currentMetadata,
          linked_emails: linkedEmails,
        },
      })

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Now create a new user account for this email
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          linked_to_user_id: userId,
          is_linked_account: true,
          primary_user_id: userId,
        },
      })

      if (createError) {
        // If creating the linked account fails, revert the metadata change
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: currentMetadata,
        })

        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message:
          'Email account linked successfully. You now have your primary email and one linked email.',
        linkedEmail: email,
        linkedUserId: newUser.user.id,
      })
    } catch (error) {
      console.error('Error creating linked email account:', error)
      return NextResponse.json({ error: 'Failed to link email account' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in link-email route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'User ID and email are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get the current user to check if this is the last sign-in method
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError || !user.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if this is the last sign-in method
    const remainingIdentities =
      user.user.identities?.filter(
        identity => !(identity.provider === 'email' && identity.identity_data?.email === email)
      ) || []

    if (remainingIdentities.length === 0) {
      return NextResponse.json({ error: 'Cannot unlink the last sign-in method' }, { status: 400 })
    }

    // Remove the email from linked emails in metadata
    const currentMetadata = user.user.user_metadata || {}
    const linkedEmails = currentMetadata.linked_emails || []
    const updatedLinkedEmails = linkedEmails.filter((linkedEmail: string) => linkedEmail !== email)

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...currentMetadata,
        linked_emails: updatedLinkedEmails,
      },
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Find and delete the linked user account
    const { data: linkedUsers, error: searchError } = await supabase.auth.admin.listUsers()

    if (searchError) {
      return NextResponse.json({ error: 'Failed to find linked account' }, { status: 500 })
    }

    const linkedUser = linkedUsers.users.find(
      u => u.email === email && u.user_metadata?.linked_to_user_id === userId
    )

    if (linkedUser) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(linkedUser.id)

      if (deleteError) {
        console.error('Error deleting linked account:', deleteError)
        // Don't fail the entire operation if we can't delete the linked account
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Email account unlinked successfully',
    })
  } catch (error) {
    console.error('Error in unlink-email route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
