import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const apiMocks = vi.hoisted(() => ({
  addVideoItem: vi.fn(),
  addPlanningItem: vi.fn(),
  addUserPlatform: vi.fn(),
}));

vi.mock("../../../entities/dashboard/model/use-dashboard-data", () => ({
  useDashboardData: () => dashboardMocks.useDashboardData(),
}));

vi.mock("../../../entities/dashboard/api/videos-api", async (importOriginal) => {
  const mod = await importOriginal<
    typeof import("../../../entities/dashboard/api/videos-api")
  >();
  return { ...mod, addVideoItem: apiMocks.addVideoItem };
});

vi.mock("../../../entities/dashboard/api/planning-api", async (importOriginal) => {
  const mod = await importOriginal<
    typeof import("../../../entities/dashboard/api/planning-api")
  >();
  return { ...mod, addPlanningItem: apiMocks.addPlanningItem };
});

vi.mock("../../../entities/dashboard/api/platforms-api", async (importOriginal) => {
  const mod = await importOriginal<
    typeof import("../../../entities/dashboard/api/platforms-api")
  >();
  return { ...mod, addUserPlatform: apiMocks.addUserPlatform };
});

vi.mock("../../../features/account-profile", () => ({
  useProfileTitleSuffix: () => "Test",
}));

vi.mock("../../../entities/user", () => ({
  useCurrentUserDataQuery: () => ({ data: null }),
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
    apiMocks.addVideoItem.mockReset();
    apiMocks.addPlanningItem.mockReset();
    apiMocks.addUserPlatform.mockReset();
    apiMocks.addVideoItem.mockImplementation(async () => ({
      id: "vid-new",
      title: "Ma vidéo",
      platform: "youtube",
      deadline: "2026-12-15",
      stage: "idea" as const,
    }));
    apiMocks.addPlanningItem.mockImplementation(async () => ({
      id: "plan-new",
      title: "Ma vidéo",
      platform: "youtube",
      publishAt: "2026-12-15",
      status: "scheduled" as const,
      videoId: "vid-new",
    }));
    apiMocks.addUserPlatform.mockResolvedValue(undefined);
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

  it("crée un événement planning après l’ajout d’une vidéo dans le suivi", async () => {
    const user = userEvent.setup();

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
        platforms: ["youtube"],
      },
      isLoading: false,
      isError: false,
    });

    renderDashboard(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>,
    );

    const toggles = screen.getAllByRole("button", {
      name: /Ajouter un suivi vidéo/i,
    });
    await user.click(toggles[0]);

    const titles = screen.getAllByPlaceholderText("Titre de la vidéo");
    await user.type(titles[0], "Ma vidéo");

    const dates = screen.getAllByDisplayValue("");
    const dateInput = dates.find(
      (el) => el.getAttribute("type") === "date",
    ) as HTMLInputElement;
    await user.type(dateInput, "2026-12-15");

    const submits = screen.getAllByRole("button", {
      name: /Ajouter un suivi vidéo/i,
    });
    await user.click(submits[0]);

    await waitFor(() => {
      expect(apiMocks.addVideoItem).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({
          title: "Ma vidéo",
          platform: "youtube",
          deadline: "2026-12-15",
          stage: "idea",
        }),
      );
    });

    await waitFor(() => {
      expect(apiMocks.addPlanningItem).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({
          title: "Ma vidéo",
          platform: "youtube",
          publishAt: "2026-12-15",
          status: "scheduled",
          videoId: "vid-new",
        }),
      );
    });

    expect(apiMocks.addPlanningItem).toHaveBeenCalledTimes(1);
  });
});
