'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/useUserSettings'
import { useSheetPolling } from '@/hooks/useSheetPolling'

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
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [changes, setChanges] = useState<any[]>([])
  const [selectedChangedRows, setSelectedChangedRows] = useState<string[]>([])
  const [importProgress, setImportProgress] = useState({
    active: false,
    progress: 0,
    message: '',
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user } = useUser()

  const polling = useSheetPolling({
    sheetId: selectedSheet,
    tabName: selectedTab,
    userId: user?.id || '',
    contentType,
    intervalMs: 30000,
    enabled: false,
    onChangesDetected: undefined,
  })

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
      toast({ title: 'Error', description: 'Failed to fetch Google Sheets', variant: 'destructive' })
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
      const data = lines.slice(1).filter(line => line.trim()).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const row: ImportData = { id: `csv_${index}` }
        headers.forEach((header, i) => { row[header] = values[i] || '' })
        return row
      })
      setCsvData(data)
      toast({ title: 'CSV Loaded', description: `${data.length} rows imported successfully` })
    }
    reader.readAsText(file)
  }

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      toast({ title: 'Invalid File', description: 'Please select a CSV file', variant: 'destructive' })
      return
    }
    setCsvFile(file)
    parseCsvFile(file)
  }

  const handleSheetChange = async (sheetId: string) => {
    setSelectedSheet(sheetId)
    setSelectedTab('')
    setSheetData([])
    setChanges([])
    if (!sheetId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/google/sheets/${sheetId}/tabs`)
      if (response.ok) {
        const data = await response.json()
        setSheets(prev => prev.map(s => s.id === sheetId ? { ...s, tabs: data.tabs || [] } : s))
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch sheet tabs', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const detectChanges = async (importData: ImportData[], sheetId: string, tabName: string) => {
    if (!user?.id || importData.length === 0) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/import/detect-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, importData, sheetId, tabName }),
      })
      if (response.ok) {
        const data = await response.json()
        setChanges(data.changes || [])
        console.log(`Detected ${data.changes?.length || 0} changes from database backup`)
      } else {
        const errorData = await response.json()
        toast({ 
          title: 'Error detecting changes', 
          description: errorData.error || 'Failed to detect changes', 
          variant: 'destructive' 
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
    setImportProgress({ active: true, progress: 0, message: 'Initiating connection...' })
    try {
      setTimeout(() => setImportProgress(p => ({ ...p, progress: 25, message: 'Reading structure...' })), 100)
      const response = await fetch(`/api/google/sheets/${selectedSheet}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabName }),
      })
      setTimeout(() => setImportProgress(p => ({ ...p, progress: 50, message: 'Fetching rows...' })), 500)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSheetData(data.rows || [])
          setTimeout(() => setImportProgress(p => ({ ...p, progress: 75, message: 'Detecting changes...' })), 1000)
          if (data.rows?.length > 0) {
            await detectChanges(data.rows, selectedSheet, tabName)
          }
          setImportProgress({ active: true, progress: 100, message: 'Done!' })
          toast({ title: 'Sheet Data Loaded', description: `${data.rows?.length || 0} rows imported` })
        } else { throw new Error(data.error || 'Failed to fetch sheet data') }
      } else { throw new Error(`HTTP ${response.status}: ${response.statusText}`) }
    } catch (error) {
      toast({ title: 'Error', description: `Failed to fetch sheet data: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: 'destructive' })
    } finally {
      setTimeout(() => setImportProgress({ active: false, progress: 0, message: '' }), 1500)
    }
  }

  const syncToHubSpot = async () => {
    const currentData = activeTab === 'csv' ? csvData : sheetData
    const allChanges = [...changes, ...polling.changes]
    if (currentData.length === 0) return
    const dataToSync = selectedChangedRows.length > 0
      ? currentData.filter(item => selectedChangedRows.includes(item.Id || item.id))
      : currentData
    if (dataToSync.length === 0) {
      toast({ title: 'No items selected', description: 'Please select items to sync.', variant: 'destructive' })
      return
    }
    setIsSyncing(true)
    setSyncProgress(0)
    try {
      const response = await fetch('/api/import/sync-to-hubspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, contentType, importData: dataToSync, changes: allChanges }),
      })
      if (response.ok) {
        const data = await response.json()
        const interval = setInterval(() => {
          setSyncProgress(prev => {
            if (prev >= 100) {
              clearInterval(interval)
              setIsSyncing(false)
              toast({ title: 'Sync Complete', description: `Synced ${data.synced || 0} items` })
              polling.clearChanges()
              setChanges([])
              setSelectedChangedRows([])
              onImportComplete?.(currentData)
              return 100
            }
            return prev + Math.random() * 20 + 10
          })
        }, 200)
      }
    } catch (error) {
      setIsSyncing(false)
      toast({ title: 'Sync Failed', description: 'Failed to sync data to HubSpot', variant: 'destructive' })
    }
  }

  // --- Derived State and Data Processing ---
  const currentData = activeTab === 'csv' ? csvData : sheetData
  const hasData = currentData && currentData.length > 0
  const allChanges = [...changes, ...polling.changes]
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

  const flattenedChanges = Object.values(allChanges.reduce((acc, change) => {
    const pageId = change.pageId
    if (!acc[pageId]) acc[pageId] = { pageId, pageName: change.name || change.pageName || pageId, changes: [] }
    if (change.fields) {
      Object.entries(change.fields).forEach(([fieldName, fieldData]: [string, any]) => acc[pageId].changes.push({ field: fieldData.header || fieldName, oldValue: fieldData.old, newValue: fieldData.new }))
    } else {
      acc[pageId].changes.push({ field: change.header || change.field, oldValue: change.oldValue, newValue: change.newValue })
    }
    return acc
  }, {} as any)).flatMap((pageChange: any) =>
    pageChange.changes.map((change: any) => ({
      id: `${pageChange.pageId}_${change.field}`,
      pageName: pageChange.pageName,
      pageId: pageChange.pageId,
      field: change.field,
      oldValue: renderChangeValue(change.oldValue),
      newValue: renderChangeValue(change.newValue),
    }))
  )
  
  const groupedChangesArray = Object.values(flattenedChanges.reduce((acc, item) => {
      if (!acc[item.pageId]) acc[item.pageId] = { ...item, changes: [] };
      acc[item.pageId].changes.push(item);
      return acc;
  }, {} as any));

  // --- 👇 Return everything the component needs ---
  return {
    // State
    activeTab,
    sheets,
    selectedSheet,
    selectedTab,
    sheetData,
    isLoading,
    isSyncing,
    syncProgress,
    importProgress,
    selectedChangedRows,
    // Derived Data
    currentData,
    hasData,
    hasChanges,
    allChanges,
    flattenedChanges,
    groupedChangesArray,
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
  }
}