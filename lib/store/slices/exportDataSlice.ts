import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

// Define interfaces for export data
export interface ContentCount {
  type: string
  total: number
  published?: number
  draft?: number
}

export interface ExportRecord {
  id: string
  name: string
  [key: string]: any
}

export interface ContentTypeData {
  contentType: string
  totalCount: number
  records: ExportRecord[]
  lastFetched: Date | null
  isComplete: boolean
}

interface ExportDataState {
  contentCounts: ContentCount[]
  contentTypeData: { [contentType: string]: ContentTypeData }
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

const initialState: ExportDataState = {
  contentCounts: [],
  contentTypeData: {},
  loading: false,
  error: null,
  lastUpdated: null,
}

// Async thunk to fetch content counts
export const fetchContentCounts = createAsyncThunk('exportData/fetchContentCounts', async () => {
  const response = await fetch('/api/hubspot/content-counts', {
    method: 'POST',
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch content counts')
  }

  const data = await response.json()
  return data.counts || []
})

// Async thunk to fetch all records for a content type
export const fetchAllRecordsForContentType = createAsyncThunk(
  'exportData/fetchAllRecordsForContentType',
  async (
    {
      contentType,
      totalCount,
      forceRefresh = false,
    }: { contentType: string; totalCount: number; forceRefresh?: boolean },
    { getState }
  ) => {
    const state = getState() as { exportData: ExportDataState }
    const existingData = state.exportData.contentTypeData[contentType]

    // If data already exists and is complete, and we're not forcing a refresh, return existing data
    if (
      !forceRefresh &&
      existingData &&
      existingData.isComplete &&
      existingData.records.length > 0
    ) {
      return {
        contentType,
        records: existingData.records,
        totalCount: existingData.totalCount,
        fromCache: true,
      }
    }

    const allRecords: ExportRecord[] = []
    const limit = 100 // HubSpot API limit
    let after: string | null = null

    // Fetch all pages using proper cursor-based pagination
    while (true) {
      const response: Response = await fetch('/api/hubspot/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          limit,
          after,
        }),
      })

      if (!response.ok) {
        const errorData: { error?: string } = await response.json()
        throw new Error(errorData.error || 'Failed to fetch records')
      }

      const data: {
        success: boolean
        content?: ExportRecord[]
        paging?: { next?: { after: string } }
      } = await response.json()
      if (!data.success || !data.content) {
        break
      }

      allRecords.push(...data.content)

      // Check if there are more pages using the paging.next.after cursor
      if (data.paging?.next?.after) {
        after = data.paging.next.after
      } else {
        break // No more pages
      }
    }

    return {
      contentType,
      records: allRecords,
      totalCount,
      fromCache: false,
    }
  }
)

const exportDataSlice = createSlice({
  name: 'exportData',
  initialState,
  reducers: {
    setContentCounts: (state, action: PayloadAction<ContentCount[]>) => {
      state.contentCounts = action.payload
      state.lastUpdated = new Date()
    },
    setContentTypeData: (
      state,
      action: PayloadAction<{ contentType: string; data: ContentTypeData }>
    ) => {
      const { contentType, data } = action.payload
      state.contentTypeData[contentType] = data
    },
    clearContentTypeData: (state, action: PayloadAction<string>) => {
      delete state.contentTypeData[action.payload]
    },
    clearAllData: state => {
      state.contentTypeData = {}
      state.contentCounts = []
      state.lastUpdated = null
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
  extraReducers: builder => {
    builder
      // Fetch content counts
      .addCase(fetchContentCounts.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchContentCounts.fulfilled, (state, action) => {
        state.loading = false
        state.contentCounts = action.payload
        state.lastUpdated = new Date()
      })
      .addCase(fetchContentCounts.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch content counts'
      })
      // Fetch all records for content type
      .addCase(fetchAllRecordsForContentType.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAllRecordsForContentType.fulfilled, (state, action) => {
        state.loading = false
        const { contentType, records, totalCount } = action.payload
        state.contentTypeData[contentType] = {
          contentType,
          totalCount,
          records,
          lastFetched: new Date(),
          isComplete: records.length >= totalCount,
        }
      })
      .addCase(fetchAllRecordsForContentType.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch records'
      })
  },
})

export const {
  setContentCounts,
  setContentTypeData,
  clearContentTypeData,
  clearAllData,
  setLoading,
  setError,
} = exportDataSlice.actions

export default exportDataSlice.reducer
