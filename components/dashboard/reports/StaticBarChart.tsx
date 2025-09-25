// components/dashboard/reports/StaticBarChart.tsx
export const StaticBarChart = () => (
  <div className="flex h-48 w-full items-end justify-center gap-4 p-4">
    <div className="w-8 animate-pulse rounded-t-lg bg-slate-300" style={{ height: '40%' }}></div>
    <div className="w-8 animate-pulse rounded-t-lg bg-slate-300" style={{ height: '60%' }}></div>
    <div className="w-8 animate-pulse rounded-t-lg bg-indigo-200" style={{ height: '75%' }}></div>
    <div className="w-8 animate-pulse rounded-t-lg bg-slate-300" style={{ height: '55%' }}></div>
    <div className="w-8 animate-pulse rounded-t-lg bg-indigo-200" style={{ height: '85%' }}></div>
    <div className="w-8 animate-pulse rounded-t-lg bg-slate-300" style={{ height: '65%' }}></div>
  </div>
)
