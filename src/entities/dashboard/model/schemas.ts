import { z } from "zod";

export const StatsSchema = z.object({
  totalViews: z.number().nonnegative(),
  engagementRate: z.number().nonnegative(),
  publishedThisMonth: z.number().int().nonnegative(),
});

export const PlanningItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  platform: z.string().min(1),
  publishAt: z.string().min(1),
  status: z.enum(["draft", "scheduled", "published"]),
  videoId: z.string().min(1).optional(),
});

export const VideoItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  platform: z.string().min(1),
  stage: z.enum(["idea", "scripting", "recording", "editing", "published"]),
  deadline: z.string().min(1),
  /** Lien vers la vidéo publiée (colonne video_url) */
  videoUrl: z.string().optional(),
  /** Image de couverture (colonne cover_image_url, NOT NULL en BDD, chaîne vide si absent) */
  coverImageUrl: z.string().optional(),
  /** Ordre d’affichage (colonne sort_order) */
  sortOrder: z.number().int().nonnegative().optional(),
});

export const TodoItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  platform: z.string().min(1),
  priority: z.enum(["low", "medium", "high"]),
  done: z.boolean(),
  column: z.enum(["todo", "doing", "done"]).optional(),
});

export const DashboardDataSchema = z.object({
  stats: StatsSchema,
  planning: z.array(PlanningItemSchema),
  videos: z.array(VideoItemSchema),
  todos: z.array(TodoItemSchema),
  platforms: z.array(z.string()).optional(),
});
