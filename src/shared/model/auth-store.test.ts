import { beforeEach, describe, expect, it } from "vitest";
import {
  selectIsAuthenticated,
  selectAuthUser,
  useAuthStore,
  type AuthSession,
} from "./auth-store";

const createSession = (): AuthSession => ({
  accessToken: "token",
  user: {
    id: "6f7bbf02-fd8d-4ec4-a7db-c54dcf370b9f",
    email: "test@creacontenu.com",
    createdAt: new Date().toISOString(),
  },
});

describe("auth-store", () => {
  beforeEach(() => {
    useAuthStore.setState({
      session: null,
      setSession: useAuthStore.getState().setSession,
      clearSession: useAuthStore.getState().clearSession,
    });
  });

  it("retourne isAuthenticated=true quand une session existe", () => {
    const session = createSession();
    useAuthStore.getState().setSession(session);

    const state = useAuthStore.getState();
    expect(selectIsAuthenticated(state)).toBe(true);
    expect(selectAuthUser(state)?.email).toBe("test@creacontenu.com");
  });

  it("clearSession supprime la session", () => {
    useAuthStore.getState().setSession(createSession());
    useAuthStore.getState().clearSession();

    const state = useAuthStore.getState();
    expect(selectIsAuthenticated(state)).toBe(false);
    expect(selectAuthUser(state)).toBeNull();
  });
});
