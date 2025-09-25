export const StaticBackupChart = () => (
  <div className="h-full w-full animate-pulse">
    <svg className="h-full w-full" preserveAspectRatio="xMidYMid meet" viewBox="0 0 200 100">
      <defs>
        <linearGradient id="backup-chart-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x="10" y="40" width="20" height="60" fill="#3b82f6" rx="2" />
      <rect x="40" y="20" width="20" height="80" fill="#3b82f6" rx="2" />
      <rect x="70" y="50" width="20" height="50" fill="#3b82f6" rx="2" />
      <rect x="100" y="30" width="20" height="70" fill="#3b82f6" rx="2" />
      <rect x="130" y="60" width="20" height="40" fill="#3b82f6" rx="2" />
      <rect x="160" y="25" width="20" height="75" fill="#3b82f6" rx="2" />
    </svg>
  </div>
)
