import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppTheme = "light" | "dark";

type ThemeState = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "light" ? "dark" : "light",
        })),
    }),
    {
      name: "creacontenu-theme",
    },
  ),
);

export const useAppTheme = () => useThemeStore((state) => state.theme);
export const useSetAppTheme = () => useThemeStore((state) => state.setTheme);
export const useToggleAppTheme = () =>
  useThemeStore((state) => state.toggleTheme);
