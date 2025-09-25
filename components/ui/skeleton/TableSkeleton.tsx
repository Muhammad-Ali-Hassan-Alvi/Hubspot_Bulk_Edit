interface TableSkeletonProps {
  rows?: number
  headers?: string[]
  showLastUpdated?: boolean
}

const TableSkeleton = ({
  rows = 5,
  headers = ['Content Type', 'Total Count'],
  showLastUpdated = false,
}: TableSkeletonProps) => {
  console.log(showLastUpdated)
  return (
    <div className="overflow-hidden">
      {/* Table Section */}
      <div className="p-0">
        <div className="border-b bg-background">
          <div className="flex px-6 py-3">
            {headers.map((_, index) => (
              <div
                key={index}
                className={`h-4 bg-gray-300 rounded-full dark:bg-gray-600 ${
                  index === 0 ? 'w-24' : 'w-20 ml-auto'
                }`}
              ></div>
            ))}
          </div>
        </div>
        <div className="bg-background">
          {[...Array(rows)].map((_, index) => (
            <div key={index} className="flex px-6 py-3 border-b last:border-b-0">
              <div className="h-5 bg-gray-200 rounded-full dark:bg-gray-700 w-32"></div>
              <div className="h-5 bg-gray-200 rounded-full dark:bg-gray-700 w-12 ml-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TableSkeleton
