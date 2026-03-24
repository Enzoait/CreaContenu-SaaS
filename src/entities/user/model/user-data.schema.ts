import { z } from "zod";

export const userDataSchema = z.object({
  id: z.number().int(),
  createdAt: z.string().datetime({ offset: true }),
  userId: z.string().uuid(),
  firstname: z.string(),
  lastname: z.string(),
  phoneNumber: z.string(),
  country: z.string(),
  region: z.string(),
  email: z.string().email(),
});

export const userDataUpsertSchema = z.object({
  userId: z.string().uuid(),
  firstname: z.string().trim().min(1, "Le prénom est obligatoire"),
  lastname: z.string().trim().min(1, "Le nom est obligatoire"),
  phoneNumber: z
    .string()
    .trim()
    .min(1, "Le numéro de téléphone est obligatoire"),
  country: z.string().trim().min(1, "Le pays est obligatoire"),
  region: z.string().trim().min(1, "La région est obligatoire"),
  email: z.string().trim().email("Email invalide"),
});

export type UserDataModel = z.infer<typeof userDataSchema>;
export type UserDataUpsertInput = z.infer<typeof userDataUpsertSchema>;

type SupabaseUserDataRow = {
  id: number;
  created_at: string;
  user_id: string | null;
  firstname: string | null;
  lastname: string | null;
  phone_number: string | null;
  country: string | null;
  region: string | null;
  email: string | null;
};

export const mapSupabaseUserDataToModel = (
  row: SupabaseUserDataRow,
): UserDataModel =>
  userDataSchema.parse({
    id: row.id,
    createdAt: row.created_at,
    userId: row.user_id,
    firstname: row.firstname ?? "",
    lastname: row.lastname ?? "",
    phoneNumber: row.phone_number ?? "",
    country: row.country ?? "",
    region: row.region ?? "",
    email: row.email ?? "",
  });

export const mapUserDataUpsertInputToSupabase = (
  input: UserDataUpsertInput,
) => ({
  user_id: input.userId,
  firstname: input.firstname,
  lastname: input.lastname,
  phone_number: input.phoneNumber,
  country: input.country,
  region: input.region,
  email: input.email,
});
