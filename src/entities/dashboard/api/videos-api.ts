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
  video_url?: string | null
  cover_image_url?: string | null
}): VideoItem {
  const cover = row.cover_image_url?.trim() ?? ''
  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    stage: row.stage as VideoItem['stage'],
    deadline: row.deadline,
    ...(row.video_url ? { videoUrl: row.video_url } : {}),
    ...(cover ? { coverImageUrl: cover } : {}),
  }
}

export async function fetchVideoItems(userId: string): Promise<VideoItem[]> {
  const { data, error } = await supabase
    .from('video_items')
    .select('*')
    .eq('user_id', userId)
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
  const { data, error } = await supabase
    .from('video_items')
    .insert({
      user_id: userId,
      title: item.title,
      platform: item.platform,
      stage: item.stage,
      deadline: item.deadline,
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

export async function updateVideoItem(
  id: string,
  patch: Partial<Omit<VideoItem, 'id'>>,
): Promise<void> {
  const update: Record<string, unknown> = {}
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
