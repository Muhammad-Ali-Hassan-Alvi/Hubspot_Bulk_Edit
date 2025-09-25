import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { createClient } from '@/lib/supabase/client'

// Define the UserSettings interface based on the database schema
export interface UserSettings {
  id: string
  user_id: string
  backup_sheet_id?: string
  backup_frequency?: string
  auto_backup_enabled?: boolean
  selected_fields?: any
  sheet_formatting_preferences?: any
  is_premium?: boolean
  premium_expires_at?: string
  created_at?: string
  updated_at?: string
  google_refresh_token?: string
  google_access_token?: string
  google_token_expires_at?: string
  backup_schedule?: any
  hubspot_connection_type?: string
  website_domain?: string
  hubspot_token_encrypted?: string
  selected_sheet_id?: string
  subscription_id?: string
  subscription_status?: string
  notification_preferences?: any
  team_role?: string
  organization_id?: string
  revert_log_sheet_id?: string
  theme?: string
  company_name?: string
  company_address?: string
  hubspot_portal_id?: string
  hubspot_access_token?: string
  hubspot_refresh_token?: string
  hubspot_token_expires_at?: string
  has_seen_help?: boolean
}

interface UserSettingsState {
  data: UserSettings | null
  loading: boolean
  error: string | null
  isInitialized: boolean
}

const initialState: UserSettingsState = {
  data: null,
  loading: false,
  error: null,
  isInitialized: false,
}

// Async thunk to fetch user settings
export const fetchUserSettings = createAsyncThunk(
  'userSettings/fetchUserSettings',
  async (userId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }
)

// Async thunk to update user settings
export const updateUserSettings = createAsyncThunk(
  'userSettings/updateUserSettings',
  async ({ userId, updates }: { userId: string; updates: Partial<UserSettings> }) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, ...updates })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }
)

// Async thunk to create user settings
export const createUserSettings = createAsyncThunk(
  'userSettings/createUserSettings',
  async (userSettings: Partial<UserSettings>) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_settings')
      .insert(userSettings)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }
)

const userSettingsSlice = createSlice({
  name: 'userSettings',
  initialState,
  reducers: {
    setUserSettings: (state: UserSettingsState, action: PayloadAction<UserSettings>) => {
      state.data = action.payload
      state.isInitialized = true
    },
    clearUserSettings: (state: UserSettingsState) => {
      state.data = null
      state.loading = false
      state.error = null
      state.isInitialized = false
    },
    setLoading: (state: UserSettingsState, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state: UserSettingsState, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
  extraReducers: builder => {
    builder
      // Fetch user settings
      .addCase(fetchUserSettings.pending, (state: UserSettingsState) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUserSettings.fulfilled, (state: UserSettingsState, action) => {
        state.loading = false
        state.data = action.payload
        state.isInitialized = true
      })
      .addCase(fetchUserSettings.rejected, (state: UserSettingsState, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch user settings'
      })
      // Update user settings
      .addCase(updateUserSettings.pending, (state: UserSettingsState) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateUserSettings.fulfilled, (state: UserSettingsState, action) => {
        state.loading = false
        state.data = action.payload
      })
      .addCase(updateUserSettings.rejected, (state: UserSettingsState, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to update user settings'
      })
      // Create user settings
      .addCase(createUserSettings.pending, (state: UserSettingsState) => {
        state.loading = true
        state.error = null
      })
      .addCase(createUserSettings.fulfilled, (state: UserSettingsState, action) => {
        state.loading = false
        state.data = action.payload
        state.isInitialized = true
      })
      .addCase(createUserSettings.rejected, (state: UserSettingsState, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to create user settings'
      })
  },
})

export const { setUserSettings, clearUserSettings, setLoading, setError } =
  userSettingsSlice.actions
export default userSettingsSlice.reducer
