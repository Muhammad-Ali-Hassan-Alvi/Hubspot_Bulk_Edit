'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  FileText,
  TrendingUp,
} from 'lucide-react'
import { ContentTypeT } from '@/lib/content-types'
import HeadersViewModal from './HeadersViewModal'

interface FieldChange {
  id: string
  field: string
  originalValue: any
  newValue: any
  hasChanged: boolean
}

interface ComparisonSummary {
  [fieldName: string]: {
    totalChanges: number
    sampleChanges: Array<{
      id: string
      from: any
      to: any
    }>
  }
}

interface FieldChangesDisplayProps {
  changes: FieldChange[]
  summary: ComparisonSummary
  totalRows: number
  changedRows: number
  onImportConfirm: () => void
  loading?: boolean
  contentType?: ContentTypeT
}

export default function FieldChangesDisplay({
  changes,
  summary,
  totalRows,
  changedRows,
  onImportConfirm,
  loading = false,
  contentType,
}: FieldChangesDisplayProps) {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())
  const [showHeadersModal, setShowHeadersModal] = useState(false)

  const toggleFieldExpansion = (fieldName: string) => {
    const newExpanded = new Set(expandedFields)
    if (newExpanded.has(fieldName)) {
      newExpanded.delete(fieldName)
    } else {
      newExpanded.add(fieldName)
    }
    setExpandedFields(newExpanded)
  }

  const formatValue = (value: any) => {
    if (value === null || value === undefined)
      return <span className="text-muted-foreground">null</span>
    if (value === '') return <span className="text-muted-foreground">empty</span>
    if (typeof value === 'object') return <code className="text-xs">{JSON.stringify(value)}</code>
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    return String(value)
  }

  // const groupedChanges = changes.reduce(
  //   (acc, change) => {
  //     if (!acc[change.field]) {
  //       acc[change.field] = []
  //     }
  //     acc[change.field].push(change)
  //     return acc
  //   },
  //   {} as Record<string, FieldChange[]>
  // )

  if (changes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            No Changes Detected
          </CardTitle>
          <CardDescription>
            The current sheet data matches the last exported snapshot. No import needed.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Changes Detected
          </CardTitle>
          <CardDescription>Review the changes before importing data to HubSpot.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalRows}</div>
              <div className="text-sm text-muted-foreground">Total Rows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{changedRows}</div>
              <div className="text-sm text-muted-foreground">Changed Rows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(summary).length}
              </div>
              <div className="text-sm text-muted-foreground">Changed Fields</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{changes.length}</div>
              <div className="text-sm text-muted-foreground">Total Changes</div>
            </div>
          </div>

          {/* Read-only fields notice */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Read-Only Fields Notice</p>
                <p className="text-blue-700">
                  Only editable fields are considered for change detection. Fields marked as "Read
                  Only" are completely excluded from comparison - even if you modify these fields in
                  your Google Sheet or exported file, they won't be detected as changes and won't be
                  synchronized back to HubSpot. This protects critical HubSpot system fields from
                  unintended modifications.
                  {contentType && (
                    <>
                      {' '}
                      <button
                        onClick={() => setShowHeadersModal(true)}
                        className="underline hover:text-blue-800 font-medium"
                      >
                        View all headers for {contentType.name}
                      </button>
                      .
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Changes Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Field Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">Summary by Field</TabsTrigger>
              <TabsTrigger value="detailed">Detailed Changes</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <div className="space-y-2">
                {Object.entries(summary).map(([fieldName, fieldSummary]) => (
                  <Collapsible key={fieldName}>
                    <CollapsibleTrigger
                      onClick={() => toggleFieldExpansion(fieldName)}
                      className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedFields.has(fieldName) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">{fieldName}</span>
                        <Badge variant="secondary">{fieldSummary.totalChanges} changes</Badge>
                      </div>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-3 pb-3">
                      <div className="mt-2 space-y-2">
                        <div className="text-sm text-muted-foreground mb-2">Sample changes:</div>
                        {fieldSummary.sampleChanges.map((sample, index) => (
                          <div key={index} className="text-sm bg-muted/30 p-2 rounded">
                            <div className="font-mono text-xs">ID: {sample.id}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-red-600">From:</span>
                              <span className="flex-1">{formatValue(sample.from)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-green-600">To:</span>
                              <span className="flex-1">{formatValue(sample.to)}</span>
                            </div>
                          </div>
                        ))}
                        {fieldSummary.totalChanges > fieldSummary.sampleChanges.length && (
                          <div className="text-xs text-muted-foreground text-center">
                            ... and {fieldSummary.totalChanges - fieldSummary.sampleChanges.length}{' '}
                            more changes
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="detailed">
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Original Value</TableHead>
                      <TableHead>New Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changes.map((change, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">{change.id}</TableCell>
                        <TableCell className="font-medium">{change.field}</TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {formatValue(change.originalValue)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">{formatValue(change.newValue)}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Import Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Ready to Import?</h3>
              <p className="text-sm text-muted-foreground">
                This will update {changedRows} rows with {changes.length} field changes in HubSpot.
              </p>
            </div>
            <Button onClick={onImportConfirm} disabled={loading} size="lg">
              {loading ? 'Importing...' : 'Confirm Import'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Headers View Modal */}
      <HeadersViewModal
        isOpen={showHeadersModal}
        onOpenChange={setShowHeadersModal}
        contentType={contentType}
      />
    </div>
  )
}
