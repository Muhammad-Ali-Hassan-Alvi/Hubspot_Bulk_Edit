// import React from 'react'
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// import { Badge } from '@/components/ui/badge'

// export default function BackupFormat() {
//   return (
//     <div>
//       <Card>
//         <CardHeader>
//           <div className="flex items-center justify-between">
//             <CardTitle>Backup Format</CardTitle>
//             <Badge variant="outline" className="text-xs">
//               Coming Soon
//             </Badge>
//           </div>
//           <CardDescription>
//             How your HubSpot data will be organized in Google Sheets
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <div className="space-y-3">
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm opacity-60">
//               <div className="font-medium bg-muted p-2 rounded">Page ID</div>
//               <div className="font-medium bg-muted p-2 rounded">Page Name</div>
//               <div className="font-medium bg-muted p-2 rounded">URL</div>
//               <div className="font-medium bg-muted p-2 rounded">Title</div>
//               <div className="bg-popover p-2 rounded text-muted-foreground">12345</div>
//               <div className="bg-popover p-2 rounded text-muted-foreground">Home Page</div>
//               <div className="bg-popover p-2 rounded text-muted-foreground">example.com</div>
//               <div className="bg-popover p-2 rounded text-muted-foreground">Welcome</div>
//             </div>
//             <p className="text-xs text-muted-foreground">
//               Each backup creates a new row with a timestamp, and updates are tracked with version
//               history.
//             </p>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }

// components/dashboard/BackupFormat.tsx
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database } from 'lucide-react' // --- 1. Import the icon
import InDevelopmentOverlay from '../ui/in-development-overlay'
import ComingSoonBadge from '@/components/ui/coming-soon-badge'

export default function BackupFormat() {
  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Backup Format</CardTitle>
            <ComingSoonBadge className="text-xs" />
          </div>
          <CardDescription>How your HubSpot data will be organized</CardDescription>
        </CardHeader>
        <CardContent>
          {/* --- 2. Create the relative wrapper with a dashed border --- */}
          <div className="relative rounded-lg border-2 border-dashed border-slate-200 p-4">
            {/* --- 3. Add the absolute overlay with blur effect --- */}
            <InDevelopmentOverlay Icon={Database} />

            {/* --- This is your original content, now behind the blur --- */}
            <div className="space-y-3">
              {/* --- 5. Removed opacity-60 from here --- */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="font-medium bg-muted p-2 rounded">Page ID</div>
                <div className="font-medium bg-muted p-2 rounded">Page Name</div>
                <div className="font-medium bg-muted p-2 rounded">URL</div>
                <div className="font-medium bg-muted p-2 rounded">Title</div>
                <div className="bg-popover p-2 rounded text-muted-foreground">12345</div>
                <div className="bg-popover p-2 rounded text-muted-foreground">Home Page</div>
                <div className="bg-popover p-2 rounded text-muted-foreground">example.com</div>
                <div className="bg-popover p-2 rounded text-muted-foreground">Welcome</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Each backup creates a new row with a timestamp, and updates are tracked with version
                history.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
