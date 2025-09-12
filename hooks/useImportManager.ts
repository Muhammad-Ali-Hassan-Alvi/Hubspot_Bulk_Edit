'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useUser, useUserSettings } from '@/hooks/useUserSettings'
import { useUploadFlow } from '@/hooks/useUploadFlow'

// --- ➕ Keep your type definitions here, as they relate to the data logic ---
interface ImportData {
  id: string
  [key: string]: any
}

interface TabInfo {
  id: string
  name: string
}

interface SheetInfo {
  id: string
  name: string
  tabs: TabInfo[]
}

interface ImportManagerProps {
  contentType?: string
  onImportComplete?: (data: ImportData[]) => void
  onContentTypeChange?: (contentType: string) => void
}

// --- 👇 This is our new hook! ---
export const useImportManager = ({
  contentType = 'pages',
  onImportComplete,
}: ImportManagerProps) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'gsheet'>('gsheet')
  const [, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<ImportData[]>([])
  const [sheets, setSheets] = useState<SheetInfo[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [selectedTab, setSelectedTab] = useState<string>('')
  const [sheetData, setSheetData] = useState<ImportData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTabs, setIsLoadingTabs] = useState(false)
  const [isSyncing] = useState(false)
  const [syncProgress] = useState(0)
  const [changes, setChanges] = useState<any[]>([])
  const [selectedChangedRows, setSelectedChangedRows] = useState<string[]>([])
  const [importProgress, setImportProgress] = useState({
    active: false,
    progress: 0,
    message: '',
  })
  const [validationError, setValidationError] = useState<string>('')
  const [isValidating, setIsValidating] = useState(false)

  // Clear validation errors when content type changes
  useEffect(() => {
    setValidationError('')
  }, [contentType])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user } = useUser()
  const { userSettings } = useUserSettings()
  const uploadFlow = useUploadFlow()


  const fetchUserSheets = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/google/sheets')
      if (response.ok) {
        const data = await response.json()
        setSheets(data.sheets || [])
      } else {
        const errorData = await response.json()
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to fetch Google Sheets',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Sheets fetch error:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch Google Sheets',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, toast])

  useEffect(() => {
    if (activeTab === 'gsheet' && user?.id) {
      fetchUserSheets()
    }
  }, [activeTab, user?.id, fetchUserSheets])

  const parseCsvFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const data = lines
        .slice(1)
        .filter(line => line.trim())
        .map((line, index) => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
          const row: ImportData = { id: `csv_${index}` }
          headers.forEach((header, i) => {
            row[header] = values[i] || ''
          })
          return row
        })
      setCsvData(data)
      toast({ title: 'CSV Loaded', description: `${data.length} rows imported successfully` })
    }
    reader.readAsText(file)
  }

  const parseCsvFileData = (file: File): Promise<ImportData[]> => {
    return new Promise((resolve, reject) => {
      // Check if it's an Excel file
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // For Excel files, we need to use a different approach
        // For now, show an error message
        reject(
          new Error('Excel files (.xlsx/.xls) are not supported yet. Please convert to CSV format.')
        )
        return
      }

      const reader = new FileReader()
      reader.onload = e => {
        const text = e.target?.result as string

        // Check if the content looks like binary data (Excel file)
        if (text.includes('\x00') || text.startsWith('PK\x03\x04')) {
          reject(
            new Error(
              'This appears to be an Excel file. Please convert to CSV format or use a proper CSV file.'
            )
          )
          return
        }

        const lines = text.split('\n')
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        const data = lines
          .slice(1)
          .filter(line => line.trim())
          .map((line, index) => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
            const row: ImportData = { id: `csv_${index}` }
            headers.forEach((header, i) => {
              row[header] = values[i] || ''
            })
            return row
          })

        // Debug: Log CSV parsing results
        console.log('=== CSV PARSING DEBUG ===')
        console.log('CSV Headers:', headers)
        console.log('CSV Data Length:', data.length)
        console.log('Sample CSV Row:', data[0])

        resolve(data)
      }
      reader.readAsText(file)
    })
  }

  const validateImport = async (
    importType: 'csv' | 'gsheet',
    fileName?: string,
    sheetId?: string,
    tabId?: string
  ) => {
    if (!user?.id) return { isValid: false, error: 'User not authenticated' }

    setIsValidating(true)
    setValidationError('')

    try {
      const response = await fetch('/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          contentType,
          importType,
          fileName,
          sheetId,
          tabId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.validation) {
          if (data.validation.isValid) {
            setValidationError('')
            return { isValid: true, exportDetails: data.validation.exportDetails }
          } else {
            setValidationError(data.validation.error)
            return { isValid: false, error: data.validation.error }
          }
        }
      }

      const errorData = await response.json()
      setValidationError(errorData.error || 'Validation failed')
      return { isValid: false, error: errorData.error || 'Validation failed' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed'
      setValidationError(errorMessage)
      return { isValid: false, error: errorMessage }
    } finally {
      setIsValidating(false)
    }
  }

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast({
        title: 'Invalid File',
        description: 'Please select a CSV or Excel file',
        variant: 'destructive',
      })
      return
    }

    // Start import progress
    setImportProgress({
      active: true,
      progress: 0,
      message: 'Validating CSV file...',
    })

    try {
      // Validate the file first
      const validation = await validateImport('csv', file.name)
      if (!validation.isValid) {
        setImportProgress({ active: false, progress: 0, message: '' })
        toast({
          title: 'Validation Failed',
          description: validation.error,
          variant: 'destructive',
          duration: 4000, // Auto-hide after 4 seconds
        })
        return
      }

      setImportProgress({
        active: true,
        progress: 50,
        message: 'Processing CSV data...',
      })

      setCsvFile(file)
      parseCsvFile(file)

      setImportProgress({
        active: true,
        progress: 100,
        message: 'CSV file loaded successfully',
      })

      // Auto-detect changes after successful validation
      setTimeout(async () => {
        setImportProgress({ active: false, progress: 0, message: '' })
        // Auto-detect changes after CSV is loaded - use the parsed data directly
        try {
          const parsedData = await parseCsvFileData(file)
          if (parsedData && parsedData.length > 0) {
            await detectChanges(parsedData, 'csv', 'csv-file')
          }
        } catch (error) {
          toast({
            title: 'File Format Error',
            description: error instanceof Error ? error.message : 'Invalid file format',
            variant: 'destructive',
          })
        }
      }, 1000)

      toast({
        title: 'File Validated',
        description: `File validated for ${contentType} content type`,
      })
    } catch (error) {
      setImportProgress({ active: false, progress: 0, message: '' })
      toast({
        title: 'Upload Failed',
        description: 'Failed to process CSV file',
        variant: 'destructive',
      })
    }
  }

  const handleSheetChange = async (sheetId: string) => {
    setSelectedSheet(sheetId)
    setSelectedTab('')
    setSheetData([])
    setChanges([])
    if (!sheetId) return
    setIsLoadingTabs(true)
    try {
      const response = await fetch(`/api/google/sheets/${sheetId}/tabs`)
      if (response.ok) {
        const data = await response.json()
        setSheets(prev => prev.map(s => (s.id === sheetId ? { ...s, tabs: data.tabs || [] } : s)))
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch sheet tabs', variant: 'destructive' })
    } finally {
      setIsLoadingTabs(false)
    }
  }

  const detectChanges = async (importData: ImportData[], sheetId: string, tabName: string) => {
    if (!user?.id || importData.length === 0) return

    // Determine import type based on sheetId
    const importType = sheetId === 'csv' ? 'csv' : 'sheets'

    // For CSV, we need to provide valid sheetId and tabName for the API
    const apiSheetId = sheetId === 'csv' ? 'csv-import' : sheetId
    const apiTabName = tabName === 'csv-file' ? 'csv-data' : tabName

    // Debug: Log the data being sent for CSV
    if (sheetId === 'csv') {
      console.log('=== CSV DETECT CHANGES DEBUG ===')
      console.log('Import Data Length:', importData.length)
      console.log('Sample CSV Row:', importData[0])
      console.log('CSV Headers:', Object.keys(importData[0]))
      console.log('Content Type:', contentType)
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/import/detect-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          contentType,
          importData,
          sheetId: apiSheetId,
          tabName: apiTabName,
          importType,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setChanges(data.changes || [])
        if (data.changes && data.changes.length > 0) {
          toast({
            title: 'Changes Detected',
            description: `Found ${data.changes.length} changes to sync`,
          })
        } else {
          toast({
            title: 'No Changes',
            description: 'No changes detected between CSV and HubSpot data',
          })
        }
      } else {
        const errorData = await response.json()
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to detect changes',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to detect changes', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTabChange = async (tabName: string) => {
    setSelectedTab(tabName)
    setSheetData([])
    setChanges([])
    if (!selectedSheet || !tabName) return

    // Validate the sheet/tab combination first
    setImportProgress({ active: true, progress: 0, message: 'Validating import...' })
    const validation = await validateImport('gsheet', undefined, selectedSheet, tabName)
    if (!validation.isValid) {
      setImportProgress({ active: false, progress: 0, message: '' })
      toast({
        title: 'Validation Failed',
        description: validation.error,
        variant: 'destructive',
        duration: 4000, // Auto-hide after 4 seconds
      })
      return
    }

    setImportProgress({
      active: true,
      progress: 25,
      message: 'Validation passed, fetching data...',
    })
    try {
      setTimeout(
        () => setImportProgress(p => ({ ...p, progress: 50, message: 'Reading structure...' })),
        100
      )
      const response = await fetch(`/api/google/sheets/${selectedSheet}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabName }),
      })
      setTimeout(
        () => setImportProgress(p => ({ ...p, progress: 75, message: 'Fetching rows...' })),
        500
      )
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSheetData(data.rows || [])
          setTimeout(
            () => setImportProgress(p => ({ ...p, progress: 90, message: 'Detecting changes...' })),
            1000
          )
          if (data.rows?.length > 0) {
            await detectChanges(data.rows, selectedSheet, tabName)
          }
          setImportProgress({ active: true, progress: 100, message: 'Done!' })
          toast({
            title: 'Sheet Data Loaded',
            description: `${data.rows?.length || 0} rows imported and validated for ${contentType}`,
          })
        } else {
          throw new Error(data.error || 'Failed to fetch sheet data')
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch sheet data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setTimeout(() => setImportProgress({ active: false, progress: 0, message: '' }), 1500)
    }
  }

  const syncToHubSpot = () => {
    const currentData = activeTab === 'csv' ? csvData : sheetData
    if (currentData.length === 0) {
      toast({
        title: 'No data available',
        description: 'Please import data first.',
        variant: 'destructive',
      })
      return
    }

    // Check if we have changes to sync
    const allChanges = [...changes]
    if (allChanges.length === 0) {
      toast({
        title: 'No changes detected',
        description: 'Please detect changes first.',
        variant: 'destructive',
      })
      return
    }

    uploadFlow.startConfirmation()
  }

  const handleConfirmSync = async () => {
    const currentData = activeTab === 'csv' ? csvData : sheetData
    const allChanges = [...changes]

    await uploadFlow.confirmChanges(async () => {
      try {
        const response = await fetch('/api/import/sync-to-hubspot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            contentType,
            importData: currentData, // Keep for fallback
            changes: allChanges, // Send the specific changes to sync
          }),
        })
        if (response.ok) {
          const data = await response.json()
          uploadFlow.completeUpload(data.synced || 0, data.failed || 0)
          setChanges([])
          setSelectedChangedRows([])
          onImportComplete?.(currentData)
        } else {
          throw new Error('Sync failed')
        }
      } catch (error) {
        uploadFlow.completeUpload(0, allChanges.length)
        toast({
          title: 'Sync Failed',
          description: 'Failed to sync data to HubSpot',
          variant: 'destructive',
        })
      }
    })
  }

  // --- Derived State and Data Processing ---
  const currentData = activeTab === 'csv' ? csvData : sheetData
  const hasData = currentData && currentData.length > 0
  const allChanges = [...changes]
  const hasChanges = allChanges && allChanges.length > 0

  const renderChangeValue = (value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (value.layoutSections || value.widgets || value.translations) return '[Complex Object]'
      if (Array.isArray(value)) return `[Array with ${value.length} items]`
      const jsonString = JSON.stringify(value)
      return jsonString.length > 50 ? `${jsonString.substring(0, 50)}...` : jsonString
    }
    return String(value ?? '')
  }

  const flattenedChanges = Object.values(
    allChanges.reduce((acc, change) => {
      const pageId = change.pageId
      if (!acc[pageId])
        acc[pageId] = { pageId, pageName: change.name || change.pageName || pageId, changes: [] }
      if (change.fields) {
        Object.entries(change.fields).forEach(([fieldName, fieldData]: [string, any]) => {
          acc[pageId].changes.push({
            field: fieldData.header || fieldName,
            oldValue: fieldData.old,
            newValue: fieldData.new,
          })
        })
      } else {
        acc[pageId].changes.push({
          field: change.header || change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
        })
      }
      return acc
    }, {} as any)
  ).flatMap((pageChange: any) => {
    return pageChange.changes.map((change: any) => ({
      id: `${pageChange.pageId}_${change.field}`,
      pageName: pageChange.pageName,
      pageId: pageChange.pageId,
      field: change.field,
      oldValue: renderChangeValue(change.oldValue),
      newValue: renderChangeValue(change.newValue),
    }))
  })

  const groupedChangesArray = Object.values(
    flattenedChanges.reduce((acc, item) => {
      if (!acc[item.pageId]) acc[item.pageId] = { ...item, changes: [] }
      acc[item.pageId].changes.push(item)
      return acc
    }, {} as any)
  )

  const resetCsvData = () => {
    setCsvData([])
    setValidationError('')
    setChanges([])
    setSelectedChangedRows([])
  }

  // --- 👇 Return everything the component needs ---
  return {
    // State
    activeTab,
    sheets,
    selectedSheet,
    selectedTab,
    sheetData,
    isLoading,
    isLoadingTabs,
    isSyncing,
    syncProgress,
    importProgress,
    selectedChangedRows,
    validationError,
    isValidating,
    user,
    userSettings,
    // Derived Data
    currentData,
    hasData,
    hasChanges,
    allChanges,
    flattenedChanges,
    groupedChangesArray,
    // Upload Flow
    uploadFlow,
    handleConfirmSync,
    // Refs
    fileInputRef,
    // Handlers
    setActiveTab,
    handleCsvUpload,
    handleSheetChange,
    handleTabChange,
    detectChanges,
    syncToHubSpot,
    setSelectedChangedRows,
    resetCsvData,
  }
}
