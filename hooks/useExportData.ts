import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/lib/store'
import {
  fetchContentCounts,
  fetchAllRecordsForContentType,
  clearContentTypeData,
  clearAllData,
  setLoading,
  setError,
} from '@/lib/store/slices/exportDataSlice'

export const useExportData = () => {
  const dispatch = useDispatch<AppDispatch>()
  const exportData = useSelector((state: RootState) => state.exportData)

  // Fetch content counts
  const loadContentCounts = useCallback(
    async (forceRefresh = false) => {
      // Check if we already have data and it's not a forced refresh
      if (!forceRefresh && exportData.contentCounts.length > 0 && exportData.lastUpdated) {
        console.log('✅ useExportData: Using cached content counts')
        return
      }

      try {
        console.log('🔄 useExportData: Fetching content counts from API')
        await dispatch(fetchContentCounts()).unwrap()
      } catch (error) {
        console.error('Failed to fetch content counts:', error)
        throw error
      }
    },
    [dispatch, exportData.contentCounts, exportData.lastUpdated]
  )

  // Fetch all records for a specific content type
  const loadAllRecordsForContentType = useCallback(
    async (contentType: string, totalCount: number, forceRefresh: boolean = false) => {
      try {
        const result = await dispatch(
          fetchAllRecordsForContentType({ contentType, totalCount, forceRefresh })
        ).unwrap()
        return result
      } catch (error) {
        console.error(`Failed to fetch records for ${contentType}:`, error)
        throw error
      }
    },
    [dispatch]
  )

  // Get content count for a specific type
  const getContentCount = useCallback(
    (contentType: string) => {
      const count = exportData.contentCounts.find(c => c.type === contentType)
      return count?.total || 0
    },
    [exportData.contentCounts]
  )

  // Get stored records for a content type
  const getStoredRecords = useCallback(
    (contentType: string) => {
      return exportData.contentTypeData[contentType]?.records || []
    },
    [exportData.contentTypeData]
  )

  // Check if records are complete for a content type
  const isContentTypeComplete = useCallback(
    (contentType: string) => {
      return exportData.contentTypeData[contentType]?.isComplete || false
    },
    [exportData.contentTypeData]
  )

  // Get paginated records (500 per page)
  const getPaginatedRecords = useCallback(
    (contentType: string, page: number = 1, pageSize: number = 500) => {
      const records = getStoredRecords(contentType)
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      return {
        records: records.slice(startIndex, endIndex),
        totalPages: Math.ceil(records.length / pageSize),
        currentPage: page,
        totalRecords: records.length,
      }
    },
    [getStoredRecords]
  )

  // Clear data for a specific content type
  const clearContentType = useCallback(
    (contentType: string) => {
      dispatch(clearContentTypeData(contentType))
    },
    [dispatch]
  )

  // Clear all data
  const clearAllExportData = useCallback(() => {
    dispatch(clearAllData())
  }, [dispatch])

  // Set loading state
  const setLoadingState = useCallback(
    (loading: boolean) => {
      dispatch(setLoading(loading))
    },
    [dispatch]
  )

  // Set error state
  const setErrorState = useCallback(
    (error: string | null) => {
      dispatch(setError(error))
    },
    [dispatch]
  )

  return {
    // State
    contentCounts: exportData.contentCounts,
    contentTypeData: exportData.contentTypeData,
    loading: exportData.loading,
    error: exportData.error,
    lastUpdated: exportData.lastUpdated,

    // Actions
    loadContentCounts,
    loadAllRecordsForContentType,
    getContentCount,
    getStoredRecords,
    isContentTypeComplete,
    getPaginatedRecords,
    clearContentType,
    clearAllExportData,
    setLoadingState,
    setErrorState,
  }
}
