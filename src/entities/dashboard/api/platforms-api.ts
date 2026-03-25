import { supabase } from '../../../shared/api/supabase/client'

export async function fetchUserPlatforms(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_platforms')
    .select('name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.name as string)
}

export async function addUserPlatform(userId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('user_platforms')
    .upsert({ user_id: userId, name }, { onConflict: 'user_id,name', ignoreDuplicates: true })

  if (error) throw new Error(error.message)
}

export async function renameUserPlatform(
  userId: string,
  from: string,
  to: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_platforms')
    .update({ name: to })
    .eq('user_id', userId)
    .eq('name', from)

  if (error) throw new Error(error.message)
}

export async function deleteUserPlatform(userId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('user_platforms')
    .delete()
    .eq('user_id', userId)
    .eq('name', name)

  if (error) throw new Error(error.message)
}
