export function moveInArray<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [removed] = next.splice(from, 1);
  const insertAt = to >= next.length ? next.length : to;
  next.splice(insertAt, 0, removed);
  return next;
}

export function mergeVisibleReorder(
  fullOrderedIds: string[],
  visibleIdsInDisplayOrder: string[],
  newVisibleOrder: string[],
): string[] {
  const visibleSet = new Set(visibleIdsInDisplayOrder);
  const q = [...newVisibleOrder];
  return fullOrderedIds.map((id) =>
    visibleSet.has(id) ? (q.shift() as string) : id,
  );
}
