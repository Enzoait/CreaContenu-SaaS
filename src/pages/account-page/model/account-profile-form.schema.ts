import { z } from "zod";

export const accountProfileFormSchema = z.object({
  firstname: z.string().trim().min(1, "Le prénom est obligatoire"),
  lastname: z.string().trim().min(1, "Le nom est obligatoire"),
  email: z.string().trim().email("Email invalide"),
  phoneNumber: z
    .string()
    .trim()
    .min(1, "Le numéro de téléphone est obligatoire"),
  country: z.string().trim().min(1, "Le pays est obligatoire"),
  region: z.string().trim().min(1, "La région est obligatoire"),
});

export type AccountProfileFormValues = z.infer<typeof accountProfileFormSchema>;
