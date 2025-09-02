import { useLoading } from '@/app/(protected)/loading-context'

export function useNavigationLoading() {
  const { setIsLoading } = useLoading()

  const handleNavigation = () => {
    setIsLoading(true)
  }

  return { handleNavigation }
}
