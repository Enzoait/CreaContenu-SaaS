import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useCurrentUserDataQuery } from "../../../entities/user";
import type { ProfileSettingsFormValues } from "./profile-settings.schema";

type ProfilePreferencesState = {
  displayName: string;
  bio: string;
  phone: string;
  notifyEmail: boolean;
  setFromForm: (values: ProfileSettingsFormValues) => void;
};

const useProfilePreferencesStore = create<ProfilePreferencesState>()(
  persist(
    (set) => ({
      displayName: "",
      bio: "",
      phone: "",
      notifyEmail: true,
      setFromForm: (values) =>
        set({
          displayName: values.displayName,
          bio: values.bio,
          phone: values.phone,
          notifyEmail: values.notifyEmail,
        }),
    }),
    { name: "creacontenu-profile-preferences" },
  ),
);

const normalizeLegacyDisplayName = (value: string): string => {
  const trimmed = value.trim();
  const normalized = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized === "aurelien") {
    return "";
  }

  return trimmed;
};

export const useProfileDisplayName = () =>
  useProfilePreferencesStore((state) =>
    normalizeLegacyDisplayName(state.displayName),
  );

/** Texte court pour en-têtes (ex. dashboard) : préférence locale, pas l’email Supabase. */
export const useProfileTitleSuffix = () => {
  const displayName = useProfilePreferencesStore((state) =>
    normalizeLegacyDisplayName(state.displayName),
  );
  const { data: userData } = useCurrentUserDataQuery();
  const firstname = userData?.firstname?.trim() ?? "";

  return displayName || firstname || "Créateur";
};

/** État dérivé : nombre de champs « remplis » côté préférences. */
export const useProfileCompleteness = () =>
  useProfilePreferencesStore((state) => {
    let score = 0;
    if (state.displayName.trim()) score += 1;
    if (state.bio.trim()) score += 1;
    if (state.phone.trim()) score += 1;
    return score;
  });

export const useProfilePreferencesActions = () =>
  useProfilePreferencesStore((state) => state.setFromForm);

export const useProfileSavedDisplayName = () =>
  useProfilePreferencesStore((state) =>
    normalizeLegacyDisplayName(state.displayName),
  );

export const useProfileSavedBio = () =>
  useProfilePreferencesStore((state) => state.bio);

export const useProfileSavedPhone = () =>
  useProfilePreferencesStore((state) => state.phone);

export const useProfileSavedNotifyEmail = () =>
  useProfilePreferencesStore((state) => state.notifyEmail);
