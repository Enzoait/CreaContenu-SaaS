import type { z } from "zod";
import type { PlanningItemSchema } from "../model/schemas";
import type { VideoItemSchema } from "../model/schemas";

type PlanningStatus = z.infer<typeof PlanningItemSchema>["status"];
type VideoStage = z.infer<typeof VideoItemSchema>["stage"];

/** Statut agenda aligné sur l’étape du suivi vidéo (lien planning ↔ vidéo). */
export function planningStatusFromVideoStage(stage: VideoStage): PlanningStatus {
  return stage === "published" ? "published" : "scheduled";
}
