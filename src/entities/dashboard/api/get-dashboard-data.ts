import mockDashboardData from './mock-dashboard.json'
import { DashboardDataSchema } from '../model/schemas'
import type { DashboardData } from '../model/types'

export async function getDashboardData(): Promise<DashboardData> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  return DashboardDataSchema.parse(mockDashboardData)
}
