import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore, type AuthSession } from "../../../shared/model";
import { CreatorAppShell } from "./creator-app-shell";

function renderShell(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

vi.mock("../../../entities/user", () => ({
  useCurrentUserDataQuery: () => ({ data: null }),
}));

const session: AuthSession = {
  accessToken: "token",
  user: {
    id: "u1",
    email: "creator@test.com",
    createdAt: new Date().toISOString(),
  },
};

describe("CreatorAppShell", () => {
  beforeEach(() => {
    useAuthStore.setState({
      session,
      setSession: useAuthStore.getState().setSession,
      clearSession: useAuthStore.getState().clearSession,
    });
  });

  it("affiche la navigation et le sélecteur de langue", () => {
    renderShell(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <CreatorAppShell>
          <p>contenu</p>
        </CreatorAppShell>
      </MemoryRouter>,
    );

    expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
    expect(screen.getByText("contenu")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /langue/i }),
    ).toBeInTheDocument();
  });
});
