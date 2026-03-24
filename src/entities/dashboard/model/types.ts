import { z } from 'zod'
import { DashboardDataSchema } from './schemas'

export type DashboardData = z.infer<typeof DashboardDataSchema>
