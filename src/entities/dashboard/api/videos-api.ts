import { supabase } from '../../../shared/api/supabase/client'
import type { z } from 'zod'
import type { VideoItemSchema } from '../model/schemas'

type VideoItem = z.infer<typeof VideoItemSchema>

type VideoUpdateRow = {
  title?: string
  platform?: string
  stage?: VideoItem['stage']
  deadline?: string
  sort_order?: number
}

function mapRow(row: {
  id: string
  title: string
  platform: string
  stage: string
  deadline: string
  created_at?: string | null
  sort_order?: number | null
}): VideoItem {
  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    stage: row.stage as VideoItem['stage'],
    deadline: row.deadline,
    ...(row.created_at ? { createdAt: row.created_at } : {}),
    ...(row.sort_order != null ? { sortOrder: row.sort_order } : {}),
  }
}

export async function fetchVideoItems(userId: string): Promise<VideoItem[]> {
  const { data, error } = await supabase
    .from('video_items')
    .select('id, title, platform, stage, deadline, created_at, sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('deadline', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

export async function addVideoItem(
  userId: string,
  item: Omit<VideoItem, 'id'>,
): Promise<VideoItem> {
  const { data, error } = await supabase
    .from('video_items')
    .insert({
      user_id: userId,
      title: item.title,
      platform: item.platform,
      stage: item.stage,
      deadline: item.deadline,
      sort_order: item.sortOrder ?? 0,
    })
    .select('id, title, platform, stage, deadline, created_at, sort_order')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data)
}

export async function updateVideoItem(
  id: string,
  patch: Partial<Omit<VideoItem, 'id'>>,
): Promise<void> {
  const update: Partial<VideoUpdateRow> = {}
  if (patch.title !== undefined) update.title = patch.title
  if (patch.platform !== undefined) update.platform = patch.platform
  if (patch.stage !== undefined) update.stage = patch.stage
  if (patch.deadline !== undefined) update.deadline = patch.deadline
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder

  const { error } = await supabase.from('video_items').update(update).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteVideoItem(id: string): Promise<void> {
  const { error } = await supabase.from('video_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function renamePlatformInVideos(
  userId: string,
  from: string,
  to: string,
): Promise<void> {
  const { error } = await supabase
    .from('video_items')
    .update({ platform: to })
    .eq('user_id', userId)
    .eq('platform', from)

  if (error) throw new Error(error.message)
}

export async function deletePlatformInVideos(
  userId: string,
  platform: string,
  fallback: string,
): Promise<void> {
  const { error } = await supabase
    .from('video_items')
    .update({ platform: fallback })
    .eq('user_id', userId)
    .eq('platform', platform)

  if (error) throw new Error(error.message)
}
