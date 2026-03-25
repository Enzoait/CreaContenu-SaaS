import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import {
  selectAuthUser,
  useAuthStore,
  type AuthSession,
} from "../../shared/model";
import { ProtectedRoute } from "./ProtectedRoute";

const session: AuthSession = {
  accessToken: "token",
  user: {
    id: "u1",
    email: "x@test.com",
    createdAt: new Date().toISOString(),
  },
};

describe("ProtectedRoute", () => {
  beforeEach(() => {
    useAuthStore.setState({
      session: null,
      setSession: useAuthStore.getState().setSession,
      clearSession: useAuthStore.getState().clearSession,
    });
  });

  it("redirige vers /auth si non authentifié", () => {
    render(
      <MemoryRouter initialEntries={["/secret"]}>
        <Routes>
          <Route path="/auth" element={<span>page auth</span>} />
          <Route
            path="/secret"
            element={
              <ProtectedRoute>
                <span>contenu protégé</span>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("page auth")).toBeInTheDocument();
    expect(screen.queryByText("contenu protégé")).not.toBeInTheDocument();
  });

  it("affiche les enfants si authentifié", () => {
    useAuthStore.getState().setSession(session);
    expect(selectAuthUser(useAuthStore.getState())).not.toBeNull();

    render(
      <MemoryRouter initialEntries={["/secret"]}>
        <Routes>
          <Route path="/auth" element={<span>page auth</span>} />
          <Route
            path="/secret"
            element={
              <ProtectedRoute>
                <span>contenu protégé</span>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("contenu protégé")).toBeInTheDocument();
    expect(screen.queryByText("page auth")).not.toBeInTheDocument();
  });
});
