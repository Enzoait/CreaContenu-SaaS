import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://example.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "public-anon-key-placeholder";

/**
 * Remplace le verrou Web Locks par défaut de GoTrue. En dev, React Strict Mode
 * double-monte les effets et laisse des verrous orphelins → warnings 5000ms et
 * AbortError sur la session. Ce lock exécute la callback sans synchronisation inter-onglets.
 */
async function authLock<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  return await fn();
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: authLock,
  },
});
