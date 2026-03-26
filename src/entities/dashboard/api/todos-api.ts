import { supabase } from '../../../shared/api/supabase/client'

export type TodoColumn = 'todo' | 'doing' | 'done'

export type TodoItemRow = {
  id: string
  label: string
  platform: string
  priority: 'low' | 'medium' | 'high'
  column: TodoColumn
}

function mapRow(row: {
  id: string
  label: string
  platform: string
  priority: string
  kanban_column: string
}): TodoItemRow {
  return {
    id: row.id,
    label: row.label,
    platform: row.platform,
    priority: row.priority as TodoItemRow['priority'],
    column: row.kanban_column as TodoColumn,
  }
}

export async function fetchTodoItems(userId: string): Promise<TodoItemRow[]> {
  const { data, error } = await supabase
    .from('todo_items')
    .select('id, label, platform, priority, kanban_column')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

export async function addTodoItem(
  userId: string,
  item: Omit<TodoItemRow, 'id'>,
): Promise<TodoItemRow> {
  const { data, error } = await supabase
    .from('todo_items')
    .insert({
      user_id: userId,
      label: item.label,
      platform: item.platform,
      priority: item.priority,
      kanban_column: item.column,
    })
    .select('id, label, platform, priority, kanban_column')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data)
}

type TodoUpdateRow = Partial<{
  label: string
  platform: string
  priority: TodoItemRow['priority']
  kanban_column: TodoColumn
}>

export async function updateTodoItem(
  id: string,
  patch: Partial<Omit<TodoItemRow, 'id'>>,
): Promise<void> {
  const update: TodoUpdateRow = {}
  if (patch.label !== undefined) update.label = patch.label
  if (patch.platform !== undefined) update.platform = patch.platform
  if (patch.priority !== undefined) update.priority = patch.priority
  if (patch.column !== undefined) update.kanban_column = patch.column

  const { error } = await supabase.from('todo_items').update(update).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteTodoItem(id: string): Promise<void> {
  const { error } = await supabase.from('todo_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function renamePlatformInTodos(
  userId: string,
  from: string,
  to: string,
): Promise<void> {
  const { error } = await supabase
    .from('todo_items')
    .update({ platform: to })
    .eq('user_id', userId)
    .eq('platform', from)
  if (error) throw new Error(error.message)
}

export async function deletePlatformInTodos(
  userId: string,
  platform: string,
  fallback: string,
): Promise<void> {
  const { error } = await supabase
    .from('todo_items')
    .update({ platform: fallback })
    .eq('user_id', userId)
    .eq('platform', platform)
  if (error) throw new Error(error.message)
}
