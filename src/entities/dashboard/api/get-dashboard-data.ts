import { fetchPlanningItems } from "./planning-api";
import { fetchVideoItems } from "./videos-api";
import { fetchTodoItems } from "./todos-api";
import { fetchUserPlatforms } from "./platforms-api";
import type { DashboardData } from "../model/types";

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [planning, videos, todoRows, storedPlatforms] = await Promise.all([
    fetchPlanningItems(userId),
    fetchVideoItems(userId),
    fetchTodoItems(userId),
    fetchUserPlatforms(userId),
  ]);

  const now = new Date();
  const publishedThisMonth = planning.filter((item) => {
    if (item.status !== "published") return false;
    const d = new Date(`${item.publishAt}T00:00:00`);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  }).length;

  const todos = todoRows.map((row) => ({
    id: row.id,
    label: row.label,
    platform: row.platform,
    priority: row.priority,
    done: row.column === "done",
    column: row.column,
  }));

  const derivedPlatforms = [
    ...planning.map((i) => i.platform),
    ...videos.map((i) => i.platform),
    ...todos.map((i) => i.platform),
  ];
  const platforms = Array.from(
    new Set([...storedPlatforms, ...derivedPlatforms]),
  );

  return {
    stats: {
      totalViews: 0,
      engagementRate: 0,
      publishedThisMonth,
    },
    planning,
    videos,
    todos,
    platforms,
  };
}
