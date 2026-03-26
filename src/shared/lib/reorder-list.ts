/** Déplace l’élément d’index `from` vers `to` dans une copie du tableau. */
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

/**
 * Reconstruit l’ordre global à partir d’un réordonnancement partiel (lignes visibles).
 * `fullOrderedIds` : tous les ids dans l’ordre actuel.
 * `visibleIdsInDisplayOrder` : sous-ensemble visible, dans l’ordre d’affichage.
 * `newVisibleOrder` : même ensemble après drag, nouvel ordre.
 */
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
