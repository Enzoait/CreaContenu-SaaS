import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore, type AuthSession } from "../../../shared/model";
import { DashboardOverview } from "./dashboard-overview";

function renderDashboard(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const dashboardMocks = vi.hoisted(() => ({
  useDashboardData: vi.fn(),
}));

vi.mock("../../../entities/dashboard/model/use-dashboard-data", () => ({
  useDashboardData: () => dashboardMocks.useDashboardData(),
}));

vi.mock("../../../features/account-profile", () => ({
  useProfileTitleSuffix: () => "Test",
}));

vi.mock("../../../pages/account-page/model", () => ({
  useAccountAvatarDataUrl: () => null,
}));

const session: AuthSession = {
  accessToken: "token",
  user: {
    id: "u1",
    email: "u@test.com",
    createdAt: new Date().toISOString(),
  },
};

describe("DashboardOverview", () => {
  beforeEach(() => {
    useAuthStore.setState({
      session,
      setSession: useAuthStore.getState().setSession,
      clearSession: useAuthStore.getState().clearSession,
    });
    dashboardMocks.useDashboardData.mockReset();
  });

  it("affiche le chargement", () => {
    dashboardMocks.useDashboardData.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    renderDashboard(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Chargement du dashboard…"),
    ).toBeInTheDocument();
  });

  it("affiche le contenu principal quand les données sont prêtes", () => {
    dashboardMocks.useDashboardData.mockReturnValue({
      data: {
        stats: {
          totalViews: 0,
          engagementRate: 0,
          publishedThisMonth: 0,
        },
        planning: [],
        videos: [],
        todos: [],
        platforms: [],
      },
      isLoading: false,
      isError: false,
    });

    renderDashboard(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/Dashboard créateur — Test/i),
    ).toBeInTheDocument();
  });

  it("affiche un message d’erreur si le chargement échoue", () => {
    dashboardMocks.useDashboardData.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    renderDashboard(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Une erreur est survenue pendant le chargement."),
    ).toBeInTheDocument();
  });
});
