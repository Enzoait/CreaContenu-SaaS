import { z } from "zod";

export const profileSettingsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Indiquez un nom ou un pseudo.")
    .max(80, "80 caractères maximum."),
  bio: z.string().max(500, "500 caractères maximum."),
  phone: z.string().max(30, "30 caractères maximum."),
  notifyEmail: z.boolean(),
});

export type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>;
