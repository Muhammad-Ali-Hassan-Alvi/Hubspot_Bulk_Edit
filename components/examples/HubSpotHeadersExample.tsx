'use client'

import { useState } from 'react'
import { createHeaderManager, getAvailableContentTypes } from '@/lib/hubspot-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function HubSpotHeadersExample() {
  const [selectedContentType, setSelectedContentType] = useState<string>('Landing Page')
  const availableContentTypes = getAvailableContentTypes()

  const headerManager = createHeaderManager(selectedContentType)
  const allHeaders = headerManager.getAllHeaders()
  const { recommended, additional } = headerManager.getHeadersByCategory()
  const { readOnly, editable } = headerManager.getHeadersByReadOnlyStatus()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>HubSpot Headers Manager</CardTitle>
          <CardDescription>Explore headers for different HubSpot content types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Content Type</label>
              <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableContentTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Headers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{allHeaders.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Editable</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{editable.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Read Only</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{readOnly.length}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Headers</TabsTrigger>
          <TabsTrigger value="recommended">Recommended</TabsTrigger>
          <TabsTrigger value="additional">Additional</TabsTrigger>
          <TabsTrigger value="status">By Status</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Headers for {selectedContentType}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allHeaders.map(header => (
                  <div
                    key={header.header}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <div className="font-medium">{header.header}</div>
                      <div className="text-sm text-gray-500">{header.dataType}</div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={header.category === 'Recommended' ? 'default' : 'secondary'}>
                        {header.category}
                      </Badge>
                      <Badge variant={header.isReadOnly ? 'destructive' : 'outline'}>
                        {header.isReadOnly ? 'Read Only' : 'Editable'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommended" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommended Headers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recommended.map(header => (
                  <div
                    key={header.header}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <div className="font-medium">{header.header}</div>
                      <div className="text-sm text-gray-500">{header.dataType}</div>
                    </div>
                    <Badge variant={header.isReadOnly ? 'destructive' : 'outline'}>
                      {header.isReadOnly ? 'Read Only' : 'Editable'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="additional" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Additional Headers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {additional.map(header => (
                  <div
                    key={header.header}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <div className="font-medium">{header.header}</div>
                      <div className="text-sm text-gray-500">{header.dataType}</div>
                    </div>
                    <Badge variant={header.isReadOnly ? 'destructive' : 'outline'}>
                      {header.isReadOnly ? 'Read Only' : 'Editable'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Editable Headers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {editable.map(header => (
                    <div
                      key={header.header}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <div className="font-medium">{header.header}</div>
                        <div className="text-sm text-gray-500">{header.dataType}</div>
                      </div>
                      <Badge variant="outline">{header.category}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Read Only Headers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {readOnly.map(header => (
                    <div
                      key={header.header}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <div className="font-medium">{header.header}</div>
                        <div className="text-sm text-gray-500">{header.dataType}</div>
                      </div>
                      <Badge variant="secondary">{header.category}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
