import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../api/get-dashboard-data'

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: getDashboardData,
    staleTime: 30_000,
  })
}
