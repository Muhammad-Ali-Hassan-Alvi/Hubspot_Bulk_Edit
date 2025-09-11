'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Plus, FileSpreadsheet } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { User } from '@supabase/supabase-js'

interface GoogleSheet {
  id: string
  name: string
  url?: string
  createdTime?: string
  tabs?: GoogleSheetTab[]
}

interface GoogleSheetTab {
  id: string
  name: string
}

interface SheetAndTabSelectorProps {
  user: User
  userSettings?: any
  selectedSheetId: string
  setSelectedSheetId: (sheetId: string) => void
  selectedTabName: string
  setSelectedTabName: (tabName: string) => void
  showNewOptions?: boolean // Optional prop to show/hide new tab/sheet options
  onSheetChange?: (sheetId: string) => void
  onTabChange?: (tabName: string) => void
  sheets?: GoogleSheet[] // Pass sheets data from parent
  isLoadingSheets?: boolean // Pass loading state from parent
  isLoadingTabs?: boolean // Pass tab loading state from parent
}

const SheetAndTabSelector = ({
  user,
  userSettings,
  selectedSheetId,
  setSelectedSheetId,
  selectedTabName,
  setSelectedTabName,
  showNewOptions = true, // Default to true as requested
  onSheetChange,
  onTabChange,
  sheets: parentSheets,
  isLoadingSheets: parentIsLoadingSheets,
  isLoadingTabs: parentIsLoadingTabs,
}: SheetAndTabSelectorProps) => {
  const [isNewSheetModalOpen, setIsNewSheetModalOpen] = useState(false)
  const [sheets, setSheets] = useState<GoogleSheet[]>([])
  const [tabs, setTabs] = useState<GoogleSheetTab[]>([])
  const [newSheetName, setNewSheetName] = useState('')
  const [newTabName, setNewTabName] = useState('')
  const [fetchingSheets, setFetchingSheets] = useState(false)
  const [fetchingTabs, setFetchingTabs] = useState(false)

  // Use parent sheets data if available, otherwise use local state
  const displaySheets = parentSheets || sheets
  const isLoadingSheets = parentIsLoadingSheets !== undefined ? parentIsLoadingSheets : fetchingSheets
  const isLoadingTabs = parentIsLoadingTabs !== undefined ? parentIsLoadingTabs : fetchingTabs
  const [saving, setSaving] = useState(false)
  const [isNewTabModalOpen, setIsNewTabModalOpen] = useState(false)

  const { toast } = useToast()

  const loadSheets = useCallback(async () => {
    setFetchingSheets(true)
    try {
      const response = await fetch('/api/google/sheets')
      if (response.status === 409) {
        toast({
          title: 'Error',
          description: 'Google Sheets not connected.',
          variant: 'destructive',
        })
        return
      }

      const data = await response.json()
      if (data.success && data.sheets) {
        setSheets(data.sheets)
      } else if (data.sheets) {
        setSheets(data.sheets)
      } else if (data.error) {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error loading sheets:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch Google Sheets.',
        variant: 'destructive',
      })
    }
    setFetchingSheets(false)
  }, [toast])

  useEffect(() => {
    if (userSettings?.google_access_token && !parentSheets) {
      loadSheets()
    }
  }, [userSettings?.google_access_token, loadSheets, parentSheets])

  const loadTabs = async (sheetId: string) => {
    setFetchingTabs(true)
    try {
      const response = await fetch(`/api/google/sheets/${sheetId}/tabs`)
      const data = await response.json()
      if (data.success && data.tabs) {
        setTabs(data.tabs)
        // Update the sheets array with tabs data
        setSheets(prev => prev.map(s => (s.id === sheetId ? { ...s, tabs: data.tabs } : s)))
      } else if (data.tabs) {
        setTabs(data.tabs)
        setSheets(prev => prev.map(s => (s.id === sheetId ? { ...s, tabs: data.tabs } : s)))
      } else {
        setTabs([])
      }
    } catch (error) {
      console.error('Error loading tabs:', error)
      setTabs([])
    }
    setFetchingTabs(false)
  }

  const handleSheetSelection = async (sheetId: string) => {
    setSelectedSheetId(sheetId)
    setSelectedTabName('')
    if (sheetId) {
      // Show loading state while fetching tabs
      setFetchingTabs(true)
      await loadTabs(sheetId)
    } else {
      setTabs([])
    }
    onSheetChange?.(sheetId)
  }

  const handleTabSelection = (tabName: string) => {
    setSelectedTabName(tabName)
    onTabChange?.(tabName)
  }

  const handleSheetSelectionWithModal = (value: string) => {
    if (value === 'new' && showNewOptions) {
      setIsNewSheetModalOpen(true)
      handleSheetSelection('')
      setSaving(false)
      setNewSheetName('')
    } else {
      handleSheetSelection(value)
    }
  }

  const handleTabSelectionWithModal = (value: string) => {
    if (value === 'new' && showNewOptions) {
      setIsNewTabModalOpen(true)
      setSelectedTabName('')
      setSaving(false)
      setNewTabName('')
    } else {
      handleTabSelection(value)
    }
  }

  const handleSaveNewSheet = async () => {
    if (!newSheetName.trim()) {
      toast({ title: 'Sheet Name Required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const createResponse = await fetch('/api/google/sheets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSheetName,
          userId: user.id,
        }),
      })

      const createData = await createResponse.json()
      if (!createData.success) {
        throw new Error(createData.error || 'Failed to create new sheet')
      }

      toast({
        title: 'Sheet Created!',
        description: `Successfully created "${createData.sheet.name}"`,
      })

      setFetchingSheets(true)
      await loadSheets()
      setFetchingSheets(false)

      setSelectedSheetId(createData.sheet.id)
      await loadTabs(createData.sheet.id)
      onSheetChange?.(createData.sheet.id)

      setIsNewSheetModalOpen(false)
      setNewSheetName('')
    } catch (error) {
      console.error('Error creating new sheet:', error)
      toast({
        title: 'Sheet Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create new sheet',
        variant: 'destructive',
      })
    }
    setSaving(false)
  }

  const handleSaveNewTab = async () => {
    if (!newTabName.trim()) {
      toast({ title: 'Tab Name Required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const createResponse = await fetch(`/api/google/sheets/${selectedSheetId}/tabs/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tabName: newTabName,
        }),
      })

      const createData = await createResponse.json()
      if (!createData.success) {
        throw new Error(createData.error || 'Failed to create new tab')
      }

      toast({
        title: 'Tab Created!',
        description: `Successfully created "${newTabName}" tab`,
      })

      setFetchingTabs(true)
      await loadTabs(selectedSheetId)
      setFetchingTabs(false)

      setSelectedTabName(newTabName)
      onTabChange?.(newTabName)

      setIsNewTabModalOpen(false)
      setNewTabName('')
    } catch (error) {
      console.error('Error creating new tab:', error)
      toast({
        title: 'Tab Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create new tab',
        variant: 'destructive',
      })
    }
    setSaving(false)
  }

  return (
    <>
      <div className="space-y-4 p-4 border rounded-lg bg-content">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          <Label className="text-sm font-medium">Select Google Sheet and Tab</Label>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Choose Sheet</Label>
              <Select
                value={selectedSheetId}
                onValueChange={handleSheetSelectionWithModal}
                disabled={isLoadingSheets}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={isLoadingSheets ? 'Fetching sheets...' : 'Choose a sheet...'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {showNewOptions && (
                    <SelectItem value="new">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Plus className="h-3 w-3" />
                        Create New Sheet
                      </div>
                    </SelectItem>
                  )}
                  {isLoadingSheets ? (
                    <SelectItem value="loading" disabled>
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Fetching sheets...
                      </div>
                    </SelectItem>
                  ) : (
                    displaySheets.map(sheet => (
                      <SelectItem key={sheet.id} value={sheet.id}>
                        <div className="flex items-center gap-2">
                          {sheet.name}
                          {isLoadingTabs && selectedSheetId === sheet.id && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Choose Tab</Label>
              <Select
                value={selectedTabName}
                onValueChange={handleTabSelectionWithModal}
                disabled={isLoadingTabs || !selectedSheetId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={isLoadingTabs ? 'Loading tabs...' : 'Choose a tab...'} />
                </SelectTrigger>
                <SelectContent>
                  {showNewOptions && (
                    <SelectItem value="new">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Plus className="h-3 w-3" />
                        Create New Tab
                      </div>
                    </SelectItem>
                  )}
                  {isLoadingTabs ? (
                    <SelectItem value="loading" disabled>
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading tabs...
                      </div>
                    </SelectItem>
                  ) : (
                    tabs.map(tab => (
                      <SelectItem key={tab.id} value={tab.name}>
                        {tab.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* New Tab Modal */}
      <Dialog
        open={isNewTabModalOpen}
        onOpenChange={setIsNewTabModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{saving ? 'Creating Tab...' : 'Create New Tab'}</DialogTitle>
            <DialogDescription>
              {saving
                ? 'Please wait while we create your new tab...'
                : 'Enter a name for the new tab in your selected sheet.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-tab-name">Tab Name</Label>
              <Input
                id="new-tab-name"
                placeholder="Enter tab name..."
                value={newTabName}
                onChange={e => setNewTabName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newTabName.trim()) {
                    handleSaveNewTab()
                  }
                }}
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            {!saving && (
              <Button variant="outline" onClick={() => setIsNewTabModalOpen(false)}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSaveNewTab} disabled={!newTabName.trim() || saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Tab'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Sheet Modal */}
      <Dialog open={isNewSheetModalOpen} onOpenChange={setIsNewSheetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{saving ? 'Creating Sheet...' : 'Create New Sheet'}</DialogTitle>
            <DialogDescription>
              {saving
                ? 'Please wait while we create a new sheet...'
                : 'Enter a name for the new Google Sheet.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-sheet-name">Sheet Name</Label>
              <Input
                id="new-sheet-name"
                placeholder="Enter sheet name..."
                value={newSheetName}
                onChange={e => setNewSheetName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSheetName.trim()) {
                    handleSaveNewSheet()
                  }
                }}
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            {!saving && (
              <Button variant="outline" onClick={() => setIsNewSheetModalOpen(false)}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSaveNewSheet} disabled={!newSheetName.trim() || saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Sheet'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SheetAndTabSelector
