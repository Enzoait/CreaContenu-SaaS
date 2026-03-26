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

  const planningPublishedCount = planning.filter(
    (p) => p.status === "published",
  ).length;
  const videosPublishedCount = videos.filter(
    (v) => v.stage === "published",
  ).length;
  const totalViews = planningPublishedCount + videosPublishedCount;

  const todosDone = todos.filter((t) => t.done).length;
  const todosTotal = todos.length;
  const engagementRate =
    todosTotal > 0
      ? Math.round((todosDone / todosTotal) * 1000) / 10
      : planning.length + videos.length === 0
        ? 0
        : (() => {
            const denom = planning.length + videos.length;
            const num = planningPublishedCount + videosPublishedCount;
            return Math.round((num / denom) * 1000) / 10;
          })();

  return {
    stats: {
      totalViews,
      engagementRate,
      publishedThisMonth,
    },
    planning,
    videos,
    todos,
    platforms,
  };
}
