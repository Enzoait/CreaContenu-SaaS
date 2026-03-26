/**
 * Produit une clé `YYYY-MM-DD` stable pour comparer dates agenda / deadlines.
 * Ne pas utiliser `new Date("YYYY-MM-DD")` seul : selon le fuseau, le jour peut
 * glisser d’une unité (Postgres `date`, réponses Supabase).
 */
export function toDateKey(dateInput: string | Date): string {
  if (typeof dateInput === "string") {
    const m = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return `${m[1]}-${m[2]}-${m[3]}`;
    }
  }
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
