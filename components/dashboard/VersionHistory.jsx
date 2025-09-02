// import React from 'react'
// import { Badge } from '@/components/ui/badge'
// import { Button } from '@/components/ui/button'
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// import { Input } from '@/components/ui/input'
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select'
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table'
// import { History, Search, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react'

// export default function VersionHistory() {
//   return (
//     <div>
//       <Card>
//         <CardHeader>
//           <div className="flex items-center">
//             <CardTitle className="flex items-center gap-2">
//               <History className="h-5 w-5" />
//               Version History
//             </CardTitle>
//             <Badge variant="outline" className="ml-auto text-xs">
//               Coming Soon
//             </Badge>
//           </div>
//           <CardDescription>
//             Search, filter, and revert your live site to a previous version.
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
//               <Input placeholder="Search by Version ID..." className="pl-10" disabled />
//             </div>
//             <Select disabled>
//               <SelectTrigger>
//                 <SelectValue placeholder="Filter by type" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Types</SelectItem>
//                 <SelectItem value="Backup">Backup</SelectItem>
//                 <SelectItem value="Sync">Sync</SelectItem>
//                 <SelectItem value="Revert">Revert</SelectItem>
//               </SelectContent>
//             </Select>
//             <Button variant="outline" className="w-full md:w-auto bg-transparent" disabled>
//               <RefreshCcw className="h-4 w-4 mr-2" />
//               Refresh History
//             </Button>
//           </div>
//           <div className="border rounded-lg overflow-hidden opacity-60">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead className="w-[200px]">Version ID</TableHead>
//                   <TableHead>Type</TableHead>
//                   <TableHead>Date</TableHead>
//                   <TableHead className="text-right">Actions</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 <TableRow>
//                   <TableCell colSpan={4} className="py-16 text-center text-muted-foreground">
//                     Feature is currently in development.
//                   </TableCell>
//                 </TableRow>
//               </TableBody>
//             </Table>
//           </div>
//           <div className="flex justify-end items-center gap-2 mt-4">
//             <Button variant="outline" size="sm" disabled>
//               <ChevronLeft className="h-4 w-4" />
//             </Button>
//             <span className="text-sm text-gray-600">Page 1 of 1</span>
//             <Button variant="outline" size="sm" disabled>
//               <ChevronRight className="h-4 w-4" />
//             </Button>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { History, Search, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import InDevelopmentOverlay from '../ui/in-development-overlay'
import ComingSoonBadge from '@/components/ui/coming-soon-badge'

export default function VersionHistory() {
  return (
    // The main container Card
    <Card>
      {/* Card Header now holds the title and the correctly placed "Coming Soon" badge */}
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
          <CardDescription>
            Search, filter, and revert your live site to a previous version.
          </CardDescription>
        </div>
        <ComingSoonBadge />
      </CardHeader>

      <CardContent>
        {/* Container for the dashed border and relative positioning for the overlay */}
        <div className="relative rounded-lg border-2 border-dashed border-foreground p-2">
          {/* The "frosted glass" overlay with the centered icon and text */}
          <InDevelopmentOverlay Icon={History} />

          {/* 
            The original UI, now nested and with reduced opacity to appear faded
            behind the overlay. All inputs/buttons are disabled.
          */}
          <div className="space-y-4 p-4 opacity-40">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search by Version ID..." className="pl-10" disabled />
              </div>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Backup">Backup</SelectItem>
                  <SelectItem value="Sync">Sync</SelectItem>
                  <SelectItem value="Revert">Revert</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="w-full md:w-auto" disabled>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh History
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Version ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Dummy rows for visual effect */}
                  <TableRow>
                    <TableCell className="font-mono text-xs">v_123abc456def</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Backup</Badge>
                    </TableCell>
                    <TableCell>Oct 26, 2024</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" disabled>
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">v_789ghi012jkl</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Sync</Badge>
                    </TableCell>
                    <TableCell>Oct 25, 2024</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" disabled>
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end items-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">Page 1 of 1</span>
              <Button variant="outline" size="sm" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
