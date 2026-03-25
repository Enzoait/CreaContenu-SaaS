import { supabase } from '../../../shared/api/supabase/client'
import type { z } from 'zod'
import type { PlanningItemSchema } from '../model/schemas'

type PlanningItem = z.infer<typeof PlanningItemSchema>

function mapRow(row: {
  id: string
  title: string
  platform: string
  publish_at: string
  status: string
}): PlanningItem {
  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    publishAt: row.publish_at,
    status: row.status as PlanningItem['status'],
  }
}

export async function fetchPlanningItems(userId: string): Promise<PlanningItem[]> {
  const { data, error } = await supabase
    .from('planning_items')
    .select('id, title, platform, publish_at, status')
    .eq('user_id', userId)
    .order('publish_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

export async function addPlanningItem(
  userId: string,
  item: Omit<PlanningItem, 'id'>,
): Promise<PlanningItem> {
  const { data, error } = await supabase
    .from('planning_items')
    .insert({
      user_id: userId,
      title: item.title,
      platform: item.platform,
      publish_at: item.publishAt,
      status: item.status,
    })
    .select('id, title, platform, publish_at, status')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data)
}

export async function updatePlanningItem(
  id: string,
  patch: Partial<Omit<PlanningItem, 'id'>>,
): Promise<void> {
  const update: Record<string, unknown> = {}
  if (patch.title !== undefined) update.title = patch.title
  if (patch.platform !== undefined) update.platform = patch.platform
  if (patch.publishAt !== undefined) update.publish_at = patch.publishAt
  if (patch.status !== undefined) update.status = patch.status

  const { error } = await supabase.from('planning_items').update(update).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deletePlanningItem(id: string): Promise<void> {
  const { error } = await supabase.from('planning_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function renamePlatformInPlanning(
  userId: string,
  from: string,
  to: string,
): Promise<void> {
  const { error } = await supabase
    .from('planning_items')
    .update({ platform: to })
    .eq('user_id', userId)
    .eq('platform', from)

  if (error) throw new Error(error.message)
}

export async function deletePlatformInPlanning(
  userId: string,
  platform: string,
  fallback: string,
): Promise<void> {
  const { error } = await supabase
    .from('planning_items')
    .update({ platform: fallback })
    .eq('user_id', userId)
    .eq('platform', platform)

  if (error) throw new Error(error.message)
}
