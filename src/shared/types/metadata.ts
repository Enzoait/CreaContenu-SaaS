/**
 * Métadonnées utilisateur (clés string, valeurs JSON primitives).
 * Couvre les champs profil Supabase utilisés côté app.
 */
export type JsonPrimitive = string | number | boolean | null;

export type FlatUserMetadata = Record<string, JsonPrimitive | undefined>;
