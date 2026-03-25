import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDashboardData } from "./get-dashboard-data";

const mocks = vi.hoisted(() => ({
  fetchPlanningItems: vi.fn(),
  fetchVideoItems: vi.fn(),
  fetchTodoItems: vi.fn(),
  fetchUserPlatforms: vi.fn(),
}));

vi.mock("./planning-api", () => ({
  fetchPlanningItems: (userId: string) => mocks.fetchPlanningItems(userId),
}));

vi.mock("./videos-api", () => ({
  fetchVideoItems: (userId: string) => mocks.fetchVideoItems(userId),
}));

vi.mock("./todos-api", () => ({
  fetchTodoItems: (userId: string) => mocks.fetchTodoItems(userId),
}));

vi.mock("./platforms-api", () => ({
  fetchUserPlatforms: (userId: string) => mocks.fetchUserPlatforms(userId),
}));

describe("getDashboardData", () => {
  beforeEach(() => {
    mocks.fetchPlanningItems.mockResolvedValue([]);
    mocks.fetchVideoItems.mockResolvedValue([]);
    mocks.fetchTodoItems.mockResolvedValue([]);
    mocks.fetchUserPlatforms.mockResolvedValue([]);
  });

  it("agrège les listes vides et les stats de base", async () => {
    const data = await getDashboardData("user-1");

    expect(data.stats.totalViews).toBe(0);
    expect(data.stats.engagementRate).toBe(0);
    expect(data.stats.publishedThisMonth).toBe(0);
    expect(data.planning).toEqual([]);
    expect(data.videos).toEqual([]);
    expect(data.todos).toEqual([]);
    expect(data.platforms).toEqual([]);
    expect(mocks.fetchPlanningItems).toHaveBeenCalledWith("user-1");
  });

  it("compte les publications du mois courant", async () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const today = `${y}-${m}-${d}`;

    mocks.fetchPlanningItems.mockResolvedValue([
      {
        id: "1",
        title: "Post",
        platform: "yt",
        publishAt: today,
        status: "published" as const,
      },
    ]);

    const data = await getDashboardData("user-1");
    expect(data.stats.publishedThisMonth).toBe(1);
  });

  it("fusionne plateformes stockées et dérivées", async () => {
    mocks.fetchUserPlatforms.mockResolvedValue(["stored"]);
    mocks.fetchPlanningItems.mockResolvedValue([
      {
        id: "1",
        title: "A",
        platform: "from-planning",
        publishAt: "2099-01-01",
        status: "draft" as const,
      },
    ]);

    const data = await getDashboardData("user-1");
    expect(data.platforms).toEqual(
      expect.arrayContaining(["stored", "from-planning"]),
    );
    expect(data.platforms?.length).toBe(2);
  });
});
