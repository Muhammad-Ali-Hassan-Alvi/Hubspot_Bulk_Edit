import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface HeadersTableSkeletonProps {
  rows?: number
}

const HeadersTableSkeleton = ({ rows = 10 }: HeadersTableSkeletonProps) => {
  return (
    <div className="space-y-4">
      {/* Informational Note Skeleton */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="text-blue-600 mt-0.5">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-blue-800 font-medium">Important Note</p>
            <p className="text-sm text-blue-700">
              Header configurations (category, filters, read-only, in-app edit) are only saved when
              at least one content type is selected. Make sure to enable the header for the desired
              content types before configuring its settings.
            </p>
          </div>
        </div>
      </div>

      <div className="relative border rounded-lg">
        <Table>
          <TableHeader className="bg-background">
            <TableRow className="border-b">
              {/* All column headers */}
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-12 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-20 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-16 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-16 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-20 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-16 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-10 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-8 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-12 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-20 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-18 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-14 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-14 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-18 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-12 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">
                <div className="flex items-center py-2 whitespace-nowrap w-full">
                  <Skeleton className="h-4 w-20 mr-2" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="px-4 bg-background">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(rows)].map((_, index) => (
              <TableRow key={index}>
                {/* Header Name */}
                <TableCell>
                  <Skeleton className="h-8 w-48" />
                </TableCell>

                {/* Display Name */}
                <TableCell>
                  <Skeleton className="h-8 w-48" />
                </TableCell>

                {/* Header Type */}
                <TableCell>
                  <Skeleton className="h-8 w-48" />
                </TableCell>

                {/* Site Pages - Checkbox */}
                <TableCell>
                  <Skeleton className="h-4 w-4 rounded" />
                </TableCell>

                {/* Landing Pages - Checkbox */}
                <TableCell>
                  <Skeleton className="h-4 w-4 rounded" />
                </TableCell>

                {/* Blog Posts - Checkbox */}
                <TableCell>
                  <Skeleton className="h-4 w-4 rounded" />
                </TableCell>

                {/* Blogs - Checkbox */}
                <TableCell>
                  <Skeleton className="h-4 w-4 rounded" />
                </TableCell>

                {/* Tags - Checkbox */}
                <TableCell>
                  <Skeleton className="h-4 w-4 rounded" />
                </TableCell>

                {/* Authors - Checkbox */}
                <TableCell>
                  <Skeleton className="h-4 w-4 rounded" />
                </TableCell>

                {/* URL Redirects - Checkbox */}
                <TableCell>
                  <Skeleton className="h-4 w-4 rounded" />
                </TableCell>

                {/* HubDB Tables - Checkbox */}
                <TableCell>
                  <Skeleton className="h-4 w-4 rounded" />
                </TableCell>

                {/* Category - Select */}
                <TableCell>
                  <Skeleton className="h-8 w-48" />
                </TableCell>

                {/* Read Only - Checkbox */}
                <TableCell>
                  <Skeleton className="h-4 w-4 rounded" />
                </TableCell>

                {/* In App Edit - Checkbox */}
                <TableCell>
                  <Skeleton className="h-4 w-4 rounded" />
                </TableCell>

                {/* Filters - Checkbox */}
                <TableCell>
                  <Skeleton className="h-4 w-4 rounded" />
                </TableCell>

                {/* Last Updated */}
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <Skeleton className="h-8 w-16" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default HeadersTableSkeleton
