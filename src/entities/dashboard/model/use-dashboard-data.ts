import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../api/get-dashboard-data'
import { useAuthStore, selectAuthUser } from '../../../shared/model/auth-store'

export function useDashboardData() {
  const user = useAuthStore(selectAuthUser)

  return useQuery({
    queryKey: ['dashboard', 'overview', user?.id],
    queryFn: () => getDashboardData(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  })
}
