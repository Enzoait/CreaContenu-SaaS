import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Period = '7d' | '30d' | '90d' | 'all'
type Platform = 'all' | string

type DashboardFiltersState = {
  period: Period
  platform: Platform
  setPeriod: (period: Period) => void
  setPlatform: (platform: Platform) => void
}

const useDashboardFiltersStore = create<DashboardFiltersState>()(
  persist(
    (set) => ({
      period: '30d',
      platform: 'all',
      setPeriod: (period) => set({ period }),
      setPlatform: (platform) => set({ platform }),
    }),
    {
      name: 'dashboard-filters',
    },
  ),
)

export const useDashboardPeriod = () =>
  useDashboardFiltersStore((state) => state.period)
export const useDashboardPlatform = () =>
  useDashboardFiltersStore((state) => state.platform)
export const useSetDashboardPeriod = () =>
  useDashboardFiltersStore((state) => state.setPeriod)
export const useSetDashboardPlatform = () =>
  useDashboardFiltersStore((state) => state.setPlatform)
export const useHasActiveDashboardFilters = () =>
  useDashboardFiltersStore(
    (state) => state.period !== '30d' || state.platform !== 'all',
  )
