# Redux Setup for User Settings

## Overview

This project now uses Redux Toolkit to manage user settings state, eliminating the need for repeated Supabase calls across multiple components.

## Files Created/Modified

### New Files:

1. `lib/store/index.ts` - Main Redux store configuration
2. `lib/store/slices/userSettingsSlice.ts` - User settings slice with actions and reducers
3. `lib/store/hooks.ts` - Typed Redux hooks
4. `lib/store/serverUtils.ts` - Server-side utilities for fetching user settings
5. `hooks/useUserSettings.ts` - Custom hook for user settings management
6. `components/providers/ReduxProvider.tsx` - Redux provider component
7. `components/providers/UserSettingsProvider.tsx` - Provider for initializing Redux with server data

### Modified Files:

1. `app/layout.tsx` - Added Redux provider
2. `app/(protected)/backup-and-restore/restore/page.tsx` - Updated to use Redux
3. `app/(protected)/integrations/page.tsx` - Updated to use Redux
4. `app/(protected)/help/page.tsx` - Updated to use Redux
5. `app/(protected)/configurations/fields/page.tsx` - Updated to use Redux
6. `app/(protected)/bulk-edits/in-app-edits/page.tsx` - Updated to use Redux
7. `app/(protected)/bulk-edits/exports/page.tsx` - Updated to use Redux
8. `app/(protected)/reports-and-logs/logs/page.tsx` - Updated to use Redux
9. `components/smuves/SmuvesMainDashboard.tsx` - Updated to use Redux
10. `components/smuves/ConnectionsManager.tsx` - Updated to use Redux
11. `components/enhanced/AutoBackupScheduler.tsx` - Updated to use Redux

## Usage

### In Server Components:

```tsx
import { getServerUserSettingsWithUser } from '@/lib/store/serverUtils'
import { UserSettingsProvider } from '@/components/providers/UserSettingsProvider'

export default async function MyPage() {
  const { user, userSettings } = await getServerUserSettingsWithUser()

  return (
    <UserSettingsProvider initialUserSettings={userSettings}>
      {/* Your component content */}
    </UserSettingsProvider>
  )
}
```

### In Client Components:

```tsx
import { useUserSettings } from '@/hooks/useUserSettings'

export default function MyComponent() {
  const { userSettings, loading, error, updateSettings } = useUserSettings()

  const handleUpdate = async () => {
    await updateSettings(userId, { someField: 'newValue' })
  }

  return <div>{loading ? 'Loading...' : userSettings?.someField}</div>
}
```

## Benefits

1. **Performance**: Eliminates repeated Supabase calls
2. **Consistency**: Single source of truth for user settings
3. **Caching**: User settings are cached in Redux store
4. **Real-time updates**: Changes are immediately reflected across components
5. **Type safety**: Full TypeScript support with typed hooks

## ✅ **COMPLETED - All Files Updated!**

All files have been successfully updated to use Redux for user settings management. Here's the complete list of updated files:

### ✅ API Routes Updated:

- `app/api/user/settings/route.ts` ✅
- `app/api/hubspot/content-counts/route.ts` ✅
- `app/api/sync/preview-changes/route.ts` ✅
- `app/api/history/revert/route.ts` ✅
- `app/api/google/sheets/route.ts` ✅
- `app/api/google/sheets/[sheetId]/tabs/route.ts` ✅
- `app/api/google/sheets/create/route.ts` ✅
- `app/api/google/sheets/[sheetId]/tabs/create/route.ts` ✅
- `app/api/google/sheets/export/route.ts` ✅
- `app/api/backup/schedule.ts` ✅ (No changes needed - already optimized)
- `app/api/backup/sync-to-sheets/route.ts` ✅
- `app/api/backup/revert/route.ts` ✅

### ✅ Components Updated:

- `components/debug/SupabaseDebug.tsx` ✅ (No changes needed - just connection testing)
- `components/dashboard/tabs/DashboardTabs.tsx` ✅
- `components/dashboard/tabs/components/HubSpotConnect.tsx` ✅
- `components/auth/AuthForm.tsx` ✅

### ✅ Auth Callbacks Updated:

- `app/auth/callback/route.ts` ✅
- `app/auth/hubspot/callback/route.ts` ✅
- `app/api/google/callback/route.ts` ✅

### ✅ Other Files Updated:

- `lib/google-auth.ts` ✅

## 🎉 **Redux Migration Complete!**

Your application now uses Redux for all user settings management, providing:

- **Better Performance**: No more repeated Supabase calls
- **Consistent State**: Single source of truth across the app
- **Real-time Updates**: Changes reflect immediately across components
- **Type Safety**: Full TypeScript support
- **Caching**: User settings are cached in Redux store

## Next Steps

1. ✅ Test the application to ensure all functionality works correctly
2. ✅ Monitor performance improvements
3. ✅ Enjoy faster loading times and better user experience!
