import { create } from "zustand";
import { persist } from "zustand/middleware";
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
      displayName: "Aurélien",
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

export const useProfileDisplayName = () =>
  useProfilePreferencesStore((state) => state.displayName);

/** Texte court pour en-têtes (ex. dashboard) : préférence locale, pas l’email Supabase. */
export const useProfileTitleSuffix = () =>
  useProfilePreferencesStore((state) => state.displayName.trim() || "Créateur");

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
  useProfilePreferencesStore((state) => state.displayName);

export const useProfileSavedBio = () =>
  useProfilePreferencesStore((state) => state.bio);

export const useProfileSavedPhone = () =>
  useProfilePreferencesStore((state) => state.phone);

export const useProfileSavedNotifyEmail = () =>
  useProfilePreferencesStore((state) => state.notifyEmail);
