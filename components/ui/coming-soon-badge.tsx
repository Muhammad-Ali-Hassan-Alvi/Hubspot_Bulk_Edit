import { Badge } from './badge'
import { cn } from '@/lib/utils'

interface ComingSoonBadgeProps {
  className?: string
}

const ComingSoonBadge = ({ className }: ComingSoonBadgeProps) => {
  return (
    <Badge variant="outline" className={cn('border-foreground', className)}>
      Coming Soon
    </Badge>
  )
}

export default ComingSoonBadge
