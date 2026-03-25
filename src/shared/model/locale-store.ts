import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppLocale = "fr" | "en";

type LocaleState = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "fr",
      setLocale: (locale) => set({ locale }),
    }),
    { name: "creacontenu-locale" },
  ),
);

export const selectLocale = (state: LocaleState): AppLocale => state.locale;
