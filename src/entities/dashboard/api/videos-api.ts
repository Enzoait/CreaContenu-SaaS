import { supabase } from '../../../shared/api/supabase/client'
import type { z } from 'zod'
import type { VideoItemSchema } from '../model/schemas'

type VideoItem = z.infer<typeof VideoItemSchema>

function mapRow(row: {
  id: string
  title: string
  platform: string
  stage: string
  deadline: string
  sort_order?: number | null
  video_url?: string | null
  cover_image_url?: string | null
}): VideoItem {
  const cover = row.cover_image_url?.trim() ?? ''
  const sortOrder =
    typeof row.sort_order === 'number' ? row.sort_order : undefined
  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    stage: row.stage as VideoItem['stage'],
    deadline: row.deadline,
    ...(sortOrder !== undefined ? { sortOrder } : {}),
    ...(row.video_url ? { videoUrl: row.video_url } : {}),
    ...(cover ? { coverImageUrl: cover } : {}),
  }
}

async function getNextSortOrder(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('video_items')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const max = data?.sort_order
  return typeof max === 'number' ? max + 1 : 0
}

export async function fetchVideoItems(userId: string): Promise<VideoItem[]> {
  const { data, error } = await supabase
    .from('video_items')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('deadline', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) =>
    mapRow(
      row as {
        id: string
        title: string
        platform: string
        stage: string
        deadline: string
        video_url?: string | null
        cover_image_url?: string | null
      },
    ),
  )
}

export async function addVideoItem(
  userId: string,
  item: Omit<VideoItem, 'id'>,
): Promise<VideoItem> {
  const cover = item.coverImageUrl?.trim() ?? ''
  const sort_order =
    item.sortOrder !== undefined ? item.sortOrder : await getNextSortOrder(userId)
  const { data, error } = await supabase
    .from('video_items')
    .insert({
      user_id: userId,
      title: item.title,
      platform: item.platform,
      stage: item.stage,
      deadline: item.deadline,
      sort_order,
      cover_image_url: cover,
      ...(item.videoUrl !== undefined && item.videoUrl !== ''
        ? { video_url: item.videoUrl }
        : {}),
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(
    data as {
      id: string
      title: string
      platform: string
      stage: string
      deadline: string
      video_url?: string | null
      cover_image_url?: string | null
    },
  )
}

type VideoUpdateRow = Partial<{
  title: string
  platform: string
  stage: VideoItem['stage']
  deadline: string
  video_url: string | null
  cover_image_url: string
  sort_order: number
}>

export async function updateVideoItem(
  id: string,
  patch: Partial<Omit<VideoItem, 'id'>>,
): Promise<void> {
  const update: VideoUpdateRow = {}
  if (patch.title !== undefined) update.title = patch.title
  if (patch.platform !== undefined) update.platform = patch.platform
  if (patch.stage !== undefined) update.stage = patch.stage
  if (patch.deadline !== undefined) update.deadline = patch.deadline
  if (patch.videoUrl !== undefined) {
    update.video_url = patch.videoUrl === '' ? null : patch.videoUrl
  }
  if (patch.coverImageUrl !== undefined) {
    update.cover_image_url = patch.coverImageUrl.trim()
  }
  if (patch.sortOrder !== undefined) {
    update.sort_order = patch.sortOrder
  }

  const { error } = await supabase.from('video_items').update(update).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function reorderVideoItems(
  userId: string,
  orderedIds: string[],
): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('video_items')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('user_id', userId),
    ),
  )
  for (const r of results) {
    if (r.error) throw new Error(r.error.message)
  }
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
