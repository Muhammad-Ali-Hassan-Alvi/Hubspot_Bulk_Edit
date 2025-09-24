import { configureStore } from '@reduxjs/toolkit'
import userSettingsReducer from './slices/userSettingsSlice'
import userReducer from './slices/userSlice'
import exportDataReducer from './slices/exportDataSlice'

export const store = configureStore({
  reducer: {
    userSettings: userSettingsReducer,
    user: userReducer,
    exportData: exportDataReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'userSettings/setUserSettings', 
          'userSettings/updateUserSettings',
          'exportData/setContentTypeData',
          'exportData/fetchAllRecordsForContentType/fulfilled'
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.created_at', 'payload.updated_at', 'payload.lastFetched'],
        // Ignore these paths in the state
        ignoredPaths: [
          'userSettings.data.created_at', 
          'userSettings.data.updated_at',
          'exportData.contentTypeData.*.lastFetched',
          'exportData.lastUpdated'
        ],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
