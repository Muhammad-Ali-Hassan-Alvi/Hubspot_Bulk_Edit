import { LucideIcon } from 'lucide-react'

const InDevelopmentOverlay = ({ Icon }: { Icon: LucideIcon }) => {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm">
      <Icon className="h-10 w-10 text-foreground" />
      <p className="mt-2 font-medium text-foreground ">
        {/* Graph data is not yet available. */}
        This feature is in development.
      </p>
    </div>
  )
}

export default InDevelopmentOverlay
