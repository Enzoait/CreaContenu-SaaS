import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore, type AuthSession } from "../../shared/model";
import { AppRouter } from "./AppRouter";

vi.mock("../../pages", () => ({
  AuthPage: () => <div data-testid="page-auth">AuthPage</div>,
  DashboardPage: () => <div data-testid="page-dashboard">DashboardPage</div>,
  AccountPage: () => <div data-testid="page-account">AccountPage</div>,
}));

const session: AuthSession = {
  accessToken: "token",
  user: {
    id: "u1",
    email: "x@test.com",
    createdAt: new Date().toISOString(),
  },
};

function renderWithProviders(initialEntries: string[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        <AppRouter />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AppRouter", () => {
  beforeEach(() => {
    useAuthStore.setState({
      session: null,
      setSession: useAuthStore.getState().setSession,
      clearSession: useAuthStore.getState().clearSession,
    });
  });

  it("route /auth affiche la page d’authentification", () => {
    renderWithProviders(["/auth"]);
    expect(screen.getByTestId("page-auth")).toBeInTheDocument();
  });

  it("redirige /dashboard vers /auth si non connecté", () => {
    renderWithProviders(["/dashboard"]);
    expect(screen.getByTestId("page-auth")).toBeInTheDocument();
  });

  it("affiche le dashboard si connecté sur /dashboard", () => {
    useAuthStore.getState().setSession(session);
    renderWithProviders(["/dashboard"]);
    expect(screen.getByTestId("page-dashboard")).toBeInTheDocument();
  });

  it("route * redirige vers /auth si non connecté", () => {
    renderWithProviders(["/inconnu"]);
    expect(screen.getByTestId("page-auth")).toBeInTheDocument();
  });

  it("route * redirige vers /dashboard si connecté", () => {
    useAuthStore.getState().setSession(session);
    renderWithProviders(["/inconnu"]);
    expect(screen.getByTestId("page-dashboard")).toBeInTheDocument();
  });
});
