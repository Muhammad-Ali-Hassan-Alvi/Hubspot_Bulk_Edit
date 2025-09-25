import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Crown, Rocket } from 'lucide-react'
import ComingSoonBadge from '@/components/ui/coming-soon-badge'

const AccountPlan = () => {
  const [activePlan, setActivePlan] = useState<'premium' | 'free'>('free')

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePlan(prev => (prev === 'premium' ? 'free' : 'premium'))
    }, 4500)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Account Plan</h3>
        <ComingSoonBadge className="text-sm font-semibold flex items-center" />
      </div>

      <div className="flex gap-3">
        <Badge
          variant="secondary"
          className={`flex items-center gap-1.5 w-fit px-3 py-1.5  ${
            activePlan === 'free'
              ? 'bg-primary dark:bg-primary/80 text-primary-foreground hover:text-primary shadow shadow-primary/40 animate-pulse'
              : 'opacity-70'
          }`}
        >
          <Rocket className="h-4 w-4" />
          Free Plan
        </Badge>
        <Badge
          variant="secondary"
          className={`flex items-center gap-1.5 w-fit px-3 py-1.5  ${
            activePlan === 'premium'
              ? 'bg-primary dark:bg-primary/80 text-primary-foreground hover:text-primary shadow shadow-primary/40 animate-pulse'
              : 'opacity-70'
          }`}
        >
          <Crown className="h-4 w-4" />
          Premium
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground mt-2 transition-opacity duration-500">
        {activePlan === 'premium'
          ? 'Unlock all features — enjoy the Premium plan.'
          : 'Free to start — upgrade anytime.'}
      </p>
    </>
  )
}

export default AccountPlan
