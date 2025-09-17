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
}

interface GoogleSheetTab {
  id: string
  name: string
}

interface SelectSheetAndTabProps {
  user: User
  userSettings?: any
  onTabNameChange: (name: string) => void
  onTabSelectionChange?: (tab: GoogleSheetTab) => void
  setExportingToSheets: (exporting: boolean) => void
  selectedSheetId: string
  setSelectedSheetId: (sheetId: string) => void
  showNewOptions?: boolean // Add prop to control visibility of "Create New" options
  sheets?: GoogleSheet[] // Optional sheets data from parent
  isLoadingSheets?: boolean // Optional loading state from parent
}

const SelectSheetAndTab = ({
  onTabNameChange,
  onTabSelectionChange,
  user,
  userSettings,
  selectedSheetId,
  setSelectedSheetId,
  // onConnectionUpdate = () => {},
  setExportingToSheets,
  showNewOptions = true, // Default to true for backward compatibility
  sheets: parentSheets,
  isLoadingSheets: parentIsLoadingSheets,
}: SelectSheetAndTabProps) => {
  const [isNewSheetModalOpen, setIsNewSheetModalOpen] = useState(false)
  const [sheets, setSheets] = useState<GoogleSheet[]>([])
  const [selectedTabId, setSelectedTabId] = useState('')
  const [tabs, setTabs] = useState<GoogleSheetTab[]>([])
  const [tabName, setTabName] = useState('')
  const [newSheetName, setNewSheetName] = useState('')
  const [fetchingSheets, setFetchingSheets] = useState(false)
  const [fetchingTabs, setFetchingTabs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isNewTabModalOpen, setIsNewTabModalOpen] = useState(false)

  // Use parent sheets data if available, otherwise use local state
  const displaySheets = parentSheets || sheets
  const isLoadingSheets =
    parentIsLoadingSheets !== undefined ? parentIsLoadingSheets : fetchingSheets

  // Debug logging (only when values change) - REMOVED TO PREVENT EXCESSIVE RE-RENDERS

  const { toast } = useToast()

  useEffect(() => {
    if (selectedSheetId && selectedTabId) {
      setExportingToSheets(true)
    } else {
      setExportingToSheets(false)
    }
  }, [selectedSheetId, selectedTabId, setExportingToSheets])

  const loadSheets = useCallback(
    async (forceRefresh = false) => {
      // Prevent multiple simultaneous loads, but allow force refresh
      if (fetchingSheets || (!forceRefresh && sheets.length > 0)) return

      setFetchingSheets(true)
      try {
        const response = await fetch('/api/google/sheets')
        if (response.status === 409) {
          toast({
            title: 'Google Sheets Not Connected',
            description: 'Please connect your Google Sheets account first.',
            variant: 'destructive',
          })
          setSheets([]) // Clear any existing sheets
          return
        }

        const data = await response.json()
        if (data.success && data.sheets) {
          setSheets(data.sheets)
        } else if (data.sheets) {
          setSheets(data.sheets)
        } else if (data.error) {
          throw new Error(data.error)
        } else {
          setSheets([])
        }
      } catch (error) {
        console.error('Error loading sheets:', error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to fetch Google Sheets.',
          variant: 'destructive',
        })
        setSheets([]) // Clear sheets on error
      } finally {
        setFetchingSheets(false)
      }
    },
    [toast, fetchingSheets, sheets.length]
  )

  useEffect(() => {
    // Load sheets if parent data is not provided
    if (!parentSheets) {
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
      } else if (data.tabs) {
        setTabs(data.tabs)
      } else {
        setTabs([])
      }
    } catch (error) {
      console.error('Error loading tabs:', error)
      setTabs([])
    }
    setFetchingTabs(false)
  }

  const saveSheetSelection = async (sheetIdToSave?: string, tabNameToSave?: string) => {
    const targetSheetId = sheetIdToSave || selectedSheetId
    if (!targetSheetId) return
    setSaving(true)
    try {
      // If creating a new sheet, create it first
      let finalSheetId = targetSheetId
      if (targetSheetId === 'new' && newSheetName.trim()) {
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

        finalSheetId = createData.sheet.id
        setNewSheetName('') // Clear the input after successful creation

        // Show success message for sheet creation
        toast({
          title: 'Sheet Created!',
          description: `Successfully created "${createData.sheet.name}"`,
        })
      }

      // Save the sheet selection (only save tab name if it's a newly created tab)
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_sheet_id: finalSheetId,
          selected_tab_name: tabNameToSave || null, // Only save if explicitly provided (new tab)
        }),
      })
      const data = await response.json()
      if (data.success) {
        // onSheetSelect(finalSheetId)
        // onConnectionUpdate(true, finalSheetId)
        if (tabNameToSave || tabName) {
          onTabNameChange(tabNameToSave || tabName)
        }

        // If we created a new sheet or saved a new tab, refresh the sheets list
        if (targetSheetId === 'new' || (tabNameToSave && finalSheetId)) {
          await loadSheets(true)

          // If we created a new sheet, select it
          if (targetSheetId === 'new') {
            setSelectedSheetId(finalSheetId)
            await loadTabs(finalSheetId)
          }
        }

        // If we saved a new tab, refresh the tabs list
        if (tabNameToSave && finalSheetId) {
          await loadTabs(finalSheetId)
        }
      } else {
        throw new Error(data.error || 'Failed to save selection')
      }
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save selection',
        variant: 'destructive',
      })
    }
    setSaving(false)
  }

  const handleSheetSelection = async (sheetId: string) => {
    setSelectedSheetId(sheetId)
    setSelectedTabId('')
    setTabName('')
    if (sheetId) {
      // Show loading state while fetching tabs
      setFetchingTabs(true)
      await loadTabs(sheetId)
    } else {
      setTabs([])
    }
  }

  const handleTabSelection = (value: string) => {
    if (value === 'new') {
      console.log('Opening new tab modal')
      setIsNewTabModalOpen(true)
      setSelectedTabId('') // Reset the selection
      setSaving(false) // Reset saving state
      setTabName('') // Reset tab name
    } else {
      const selectedTab = tabs.find(tab => tab.id === value)
      if (selectedTab) onTabSelectionChange?.(selectedTab)
      setSelectedTabId(value)
    }
  }

  const handleSaveNewTab = async () => {
    if (!tabName.trim()) {
      toast({ title: 'Tab Name Required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      // Create the new tab using the dedicated API
      const createResponse = await fetch(`/api/google/sheets/${selectedSheetId}/tabs/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tabName: tabName,
        }),
      })

      const createData = await createResponse.json()
      if (!createData.success) {
        throw new Error(createData.error || 'Failed to create new tab')
      }

      // Show success message for tab creation
      toast({
        title: 'Tab Created!',
        description: `Successfully created "${tabName}" tab`,
      })

      // Refresh the tabs list to include the new tab
      setFetchingTabs(true)
      await loadTabs(selectedSheetId)
      setFetchingTabs(false)

      // Save the sheet selection with the new tab
      await saveSheetSelection(selectedSheetId, tabName)

      setIsNewTabModalOpen(false)
      setTabName('')
      setSelectedTabId('')
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

  const handleSheetSelectionWithModal = (value: string) => {
    if (value === 'new' && showNewOptions) {
      setIsNewSheetModalOpen(true)
      handleSheetSelection('') // Reset the selection
      setSaving(false) // Reset saving state
      setNewSheetName('') // Reset sheet name
    } else {
      handleSheetSelection(value)
    }
  }

  const handleTabSelectionWithModal = (value: string) => {
    if (value === 'new' && showNewOptions) {
      setIsNewTabModalOpen(true)
      setSelectedTabId('') // Reset the selection
      setSaving(false) // Reset saving state
      setTabName('') // Reset tab name
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
      // Create the new sheet using the dedicated API
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

      // Show success message for sheet creation
      toast({
        title: 'Sheet Created!',
        description: `Successfully created "${createData.sheet.name}"`,
      })

      // Refresh the sheets list to include the new sheet
      await loadSheets(true)

      // Select the newly created sheet
      setSelectedSheetId(createData.sheet.id)
      await loadTabs(createData.sheet.id)

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

  return (
    <>
      <div className="space-y-4 p-4 border rounded-lg bg-content">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          <Label className="text-sm font-medium">
            {showNewOptions ? 'Select Existing Google Sheet or Create New' : 'Select Google Sheet'}
          </Label>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Choose Sheet</Label>
              <Select
                value={selectedSheetId}
                onValueChange={handleSheetSelectionWithModal}
                disabled={false}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={
                      isLoadingSheets
                        ? 'Fetching sheets...'
                        : displaySheets.length > 0
                          ? 'Choose a sheet...'
                          : 'No sheets available'
                    }
                  >
                    {selectedSheetId &&
                      displaySheets.find(sheet => sheet.id === selectedSheetId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-[9999]">
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
                          {fetchingTabs && selectedSheetId === sheet.id && (
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
                value={selectedTabId}
                onValueChange={handleTabSelectionWithModal}
                disabled={fetchingTabs || !selectedSheetId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={fetchingTabs ? 'Loading tabs...' : 'Choose a tab...'}>
                    {selectedTabId && tabs.find(tab => tab.id === selectedTabId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {showNewOptions && (
                    <SelectItem value="new">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Plus className="h-3 w-3" />
                        Create New Tab
                      </div>
                    </SelectItem>
                  )}
                  {fetchingTabs ? (
                    <SelectItem value="loading" disabled>
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading tabs...
                      </div>
                    </SelectItem>
                  ) : (
                    tabs.map(tab => (
                      <SelectItem key={tab.id} value={tab.id}>
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
        onOpenChange={open => {
          console.log('New tab modal state:', open, 'saving:', saving)
          setIsNewTabModalOpen(open)
        }}
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
                value={tabName}
                onChange={e => {
                  setTabName(e.target.value)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && tabName.trim()) {
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
            <Button onClick={handleSaveNewTab} disabled={!tabName.trim() || saving}>
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

export default SelectSheetAndTab
