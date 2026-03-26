import { supabase } from "../../../shared/api/supabase/client";
import {
  mapSupabaseUserDataToModel,
  mapUserDataUpsertInputToSupabase,
  userDataUpsertSchema,
  type UserDataModel,
  type UserDataUpsertInput,
} from "../model/user-data.schema";

export const upsertUserData = async (
  payload: UserDataUpsertInput,
): Promise<UserDataModel> => {
  const validatedPayload = userDataUpsertSchema.parse(payload);

  const { data: existing, error: existingError } = await supabase
    .from("user_data")
    .select("id")
    .eq("user_id", validatedPayload.userId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const serialized = mapUserDataUpsertInputToSupabase(validatedPayload);
  const mutation = existing ? { ...serialized, id: existing.id } : serialized;

  const { data, error } = await supabase
    .from("user_data")
    .upsert(mutation)
    .select(
      "id, created_at, user_id, firstname, lastname, phone_number, country, region, email, profile_picture",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSupabaseUserDataToModel(data);
};
