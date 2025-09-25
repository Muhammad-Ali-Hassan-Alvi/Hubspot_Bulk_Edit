const ConnectCardSkeleton = () => {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24 mb-2.5"></div>
          <div className="w-32 mb-2  h-2 bg-gray-200 rounded-full dark:bg-gray-700"></div>
          <div className="mt-2 mb-2  h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24 mb-2.5"></div>
          <div className="w-32 mb-2  h-2 bg-gray-200 rounded-full dark:bg-gray-700"></div>
        </div>
        <div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-12"></div>
      </div>
      <div className="mb-2 flex items-center w-full">
        <div className="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"></div>
      </div>
    </>
  )
}
export default ConnectCardSkeleton
