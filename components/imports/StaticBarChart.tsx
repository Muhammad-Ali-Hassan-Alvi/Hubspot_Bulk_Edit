export const StaticTradingChart = () => (
  <div className="h-full w-full animate-pulse">
    <svg className="h-full w-full" preserveAspectRatio="xMidYMid meet" viewBox="0 0 200 100">
      <defs>
        <linearGradient id="trading-chart-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d="M0,70 L20,60 L40,65 L60,45 L80,55 L100,35 L120,40 L140,20 L160,30 L180,25 L200,40"
        fill="none"
        stroke="#4f46e5"
        strokeWidth="2"
      />
      <path
        d="M0,70 L20,60 L40,65 L60,45 L80,55 L100,35 L120,40 L140,20 L160,30 L180,25 L200,40 L200,100 L0,100 Z"
        fill="url(#trading-chart-gradient)"
      />
    </svg>
  </div>
)
