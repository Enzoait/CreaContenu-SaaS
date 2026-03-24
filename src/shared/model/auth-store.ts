import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthUser = {
  id: string;
  email: string | null;
  createdAt: string;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

type AuthStoreState = {
  session: AuthSession | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: "creacontenu-auth-session",
    },
  ),
);

export const selectAuthSession = (state: AuthStoreState): AuthSession | null =>
  state.session;

export const selectAuthUser = (state: AuthStoreState): AuthUser | null =>
  state.session?.user ?? null;

export const selectIsAuthenticated = (state: AuthStoreState): boolean =>
  Boolean(state.session);
