import type { User } from "@supabase/supabase-js";

/** Champs profil lus depuis `user_metadata` (typage explicite) */
export type AuthProfileMetadata = {
  firstname: string;
  lastname: string;
  phone_number: string;
  country: string;
  region: string;
};

/**
 * Extrait les champs texte utiles depuis `User.user_metadata`.
 * Les accès sont réduits à des `string` via garde `typeof`.
 */
export function userToProfileMetadata(user: User): AuthProfileMetadata {
  const m = user.user_metadata;
  const pick = (key: keyof AuthProfileMetadata): string => {
    const v = m[key as keyof typeof m];
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    firstname: pick("firstname"),
    lastname: pick("lastname"),
    phone_number: pick("phone_number"),
    country: pick("country"),
    region: pick("region"),
  };
}
