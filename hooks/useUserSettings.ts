import { useAppDispatch, useAppSelector } from '@/lib/store/hooks'
import {
  fetchUserSettings,
  updateUserSettings,
  createUserSettings,
} from '@/lib/store/slices/userSettingsSlice'

export const useUserSettings = () => {
  const dispatch = useAppDispatch()
  const {
    data: userSettings,
    loading,
    error,
    isInitialized,
  } = useAppSelector(state => state.userSettings)

  const loadUserSettings = async (userId: string) => {
    try {
      await dispatch(fetchUserSettings(userId)).unwrap()
    } catch (error) {
      console.error('Failed to load user settings:', error)
    }
  }

  const updateSettings = async (userId: string, updates: any) => {
    try {
      await dispatch(updateUserSettings({ userId, updates })).unwrap()
    } catch (error) {
      console.error('Failed to update user settings:', error)
      throw error
    }
  }

  const createSettings = async (settings: any) => {
    try {
      await dispatch(createUserSettings(settings)).unwrap()
    } catch (error) {
      console.error('Failed to create user settings:', error)
      throw error
    }
  }

  return {
    userSettings,
    loading,
    error,
    isInitialized,
    loadUserSettings,
    updateSettings,
    createSettings,
  }
}

// Hook to automatically load user settings when component mounts
export const useUserSettingsWithAuth = () => {
  const {
    data: userSettings,
    loading,
    error,
    isInitialized,
  } = useAppSelector(state => state.userSettings)

  // Note: This hook now relies on the user being passed from parent components
  // or being available in the Redux store. The actual user fetching should be
  // handled at a higher level in the app (like in layout or auth context)

  return {
    userSettings,
    loading,
    error,
    isInitialized,
  }
}

// New hook to get user from Redux state
export const useUser = () => {
  const user = useAppSelector(state => state.user.user)
  const loading = useAppSelector(state => state.user.loading)
  const error = useAppSelector(state => state.user.error)

  return {
    user,
    loading,
    error,
  }
}
