import { z } from "zod";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const accountTabSchema = z.enum(["profil", "securite", "export"]);
export type AccountTab = z.infer<typeof accountTabSchema>;

type AccountPageState = {
  activeTab: AccountTab;
  avatarDataUrl: string | null;
  setActiveTab: (tab: AccountTab) => void;
  setAvatarDataUrl: (dataUrl: string | null) => void;
};

const useAccountPageStore = create<AccountPageState>()(
  persist(
    (set) => ({
      activeTab: "profil",
      avatarDataUrl: null,
      setActiveTab: (tab) => set({ activeTab: tab }),
      setAvatarDataUrl: (avatarDataUrl) => set({ avatarDataUrl }),
    }),
    {
      name: "creacontenu-account-page",
    },
  ),
);

export const useAccountActiveTab = () =>
  useAccountPageStore((state) => state.activeTab);

export const useAccountAvatarDataUrl = () =>
  useAccountPageStore((state) => state.avatarDataUrl);

export const useSetAccountActiveTab = () =>
  useAccountPageStore((state) => state.setActiveTab);

export const useSetAccountAvatarDataUrl = () =>
  useAccountPageStore((state) => state.setAvatarDataUrl);
