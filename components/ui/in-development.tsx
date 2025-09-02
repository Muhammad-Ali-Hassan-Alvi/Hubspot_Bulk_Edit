import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InDevelopmentProps {
  icon: LucideIcon
  message?: string
  className?: string
  children?: React.ReactNode
}

export function InDevelopment({
  icon: Icon,
  message = 'This feature is in development',
  className,
  children,
}: InDevelopmentProps) {
  return (
    <div className={cn('relative rounded-lg border-2 border-dashed border-foreground', className)}>
      {/* Overlay with frosted glass effect */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm">
        <Icon className="h-10 w-10 text-foreground" />
        <p className="mt-2 font-medium text-foreground">{message}</p>
      </div>

      {/* Content that will be blurred/disabled */}
      <div className="space-y-4 p-4 opacity-40">{children}</div>
    </div>
  )
}
