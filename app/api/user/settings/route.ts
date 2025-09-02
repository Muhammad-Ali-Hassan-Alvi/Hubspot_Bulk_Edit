import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'
import { getServerUserSettings, getAuthenticatedUser } from '@/lib/store/serverUtils'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const supabase = createClient()

    const body = await request.json()

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    // ✅ ADDED the correct columns from your database schema
    const fieldsToUpdate = [
      'hubspot_token',
      'hubspot_connection_type',
      'hubspot_account_name', // We'll keep this for the user's email from OAuth
      'hubspot_portal_name', // Important: The portal's actual name
      'hubspot_portal_id', // Important: The portal's ID
      'hubspot_access_token',
      'hubspot_refresh_token',
      'hubspot_token_expires_at',
      'website_domain',
      'google_refresh_token',
      'google_access_token',
      'google_token_expires_at',
      'backup_sheet_id',
      'selected_sheet_id',
      'company_name',
      'company_address',
    ]

    for (const key of fieldsToUpdate) {
      if (key in body) {
        const column = key === 'hubspot_token' ? 'hubspot_token_encrypted' : key
        updateData[column] = body[key]
      }
    }

    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, ...updateData }, { onConflict: 'user_id' })

    if (upsertError) {
      return NextResponse.json(
        { success: false, error: `Failed to save settings: ${upsertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}

// GET function updated to use server utilities
export async function GET() {
  try {
    const user = await getAuthenticatedUser()

    const userSettings = await getServerUserSettings(user.id)

    return NextResponse.json({
      success: true,
      settings: userSettings || {},
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
