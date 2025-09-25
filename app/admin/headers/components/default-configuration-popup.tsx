'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Settings, CheckCircle, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ConfigurationMismatch {
  header: string
  field: string
  currentValue: any
  defaultValue: any
  headerType: string
}

interface ConfigurationComparisonResult {
  success: boolean
  totalHeaders: number
  mismatchedHeaders: number
  mismatches: ConfigurationMismatch[]
  isUpToDate: boolean
  error?: string
}

export default function DefaultConfigurationPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isApplyingDefaults, setIsApplyingDefaults] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<ConfigurationComparisonResult | null>(
    null
  )
  const { toast } = useToast()

  const checkConfigurationMismatches = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/hubspot/header-configurations/compare-defaults')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setComparisonResult(result)

      if (result.success) {
        toast({
          title: 'Configuration Check Complete',
          description: result.isUpToDate
            ? 'All configurations match defaults!'
            : `Found ${result.mismatches.length} configuration mismatches`,
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to compare configurations',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error checking configuration mismatches:', error)
      toast({
        title: 'Error',
        description: `Failed to check configurations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const applyDefaultConfigurations = async () => {
    if (!comparisonResult || comparisonResult.mismatches.length === 0) {
      return
    }

    setIsApplyingDefaults(true)
    try {
      const response = await fetch('/api/hubspot/header-configurations/apply-defaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mismatches: comparisonResult.mismatches,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        const updatedCount = result.updatedCount || 0

        toast({
          title: 'Default Configurations Applied',
          description: `${updatedCount} header configurations have been updated to match defaults.`,
        })

        // COST OPTIMIZATION: Removed auto-refresh to prevent cascading API calls
        // User can manually refresh if needed
        // await checkConfigurationMismatches()
        setComparisonResult(null) // Clear result to show operation completed
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to apply default configurations',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error applying default configurations:', error)
      toast({
        title: 'Error',
        description: `Failed to apply defaults: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setIsApplyingDefaults(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    // COST OPTIMIZATION: Only auto-compare if user explicitly requests it
    // Removed automatic comparison on popup open to prevent excessive API calls
    // if (open && !comparisonResult) {
    //   checkConfigurationMismatches()
    // }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string':
        return 'bg-blue-100 text-blue-800'
      case 'number':
        return 'bg-green-100 text-green-800'
      case 'boolean':
        return 'bg-purple-100 text-purple-800'
      case 'date-time':
        return 'bg-orange-100 text-orange-800'
      case 'array':
        return 'bg-yellow-100 text-yellow-800'
      case 'object':
        return 'bg-pink-100 text-pink-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }
    if (value === null || value === undefined) {
      return 'null'
    }
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return String(value)
  }

  const getFieldDisplayName = (field: string) => {
    if (field === 'headerType') {
      return 'Data Type'
    }
    if (field.startsWith('contentType_')) {
      const contentType = field.replace('contentType_', '')
      return `Content Type: ${contentType}`
    }
    return field
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Check Default Configuration
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration Defaults Report
          </DialogTitle>
          <DialogDescription>
            Compare current header data types and content type presence with HubSpot API data
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Checking configurations...</span>
            </div>
          ) : comparisonResult ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {comparisonResult.totalHeaders}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Headers</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {comparisonResult.mismatchedHeaders}
                  </div>
                  <div className="text-sm text-muted-foreground">Headers with Mismatches</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div
                    className={`text-2xl font-bold ${comparisonResult.mismatches.length > 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {comparisonResult.mismatches.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Mismatches</div>
                </div>
              </div>

              {/* Status Alert */}
              {comparisonResult.isUpToDate ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Configurations are up to date!</strong> All header data types and
                    content type presence match HubSpot API data.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Configuration mismatches detected!</strong> The following data types or
                    content type settings don't match HubSpot API data.
                  </AlertDescription>
                </Alert>
              )}

              {/* Mismatches Table */}
              {comparisonResult.mismatches.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Header Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Current Value</TableHead>
                        <TableHead>Default Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonResult.mismatches.map((mismatch, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{mismatch.header}</TableCell>
                          <TableCell>
                            <Badge className={getTypeColor(mismatch.headerType)}>
                              {mismatch.headerType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {getFieldDisplayName(mismatch.field)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs">
                              {formatValue(mismatch.currentValue)}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                              {formatValue(mismatch.defaultValue)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Click "Check Default Configuration" to start the comparison
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={checkConfigurationMismatches}
              disabled={isLoading || isApplyingDefaults}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Check
            </Button>
            {comparisonResult &&
              !comparisonResult.isUpToDate &&
              comparisonResult.mismatches.length > 0 && (
                <Button
                  onClick={applyDefaultConfigurations}
                  disabled={isLoading || isApplyingDefaults}
                  className="flex items-center gap-2"
                >
                  {isApplyingDefaults ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Applying Defaults...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Apply Default Configurations
                    </>
                  )}
                </Button>
              )}
          </div>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
