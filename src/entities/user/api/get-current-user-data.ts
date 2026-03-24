import { supabase } from "../../../shared/api/supabase/client";
import {
  mapSupabaseUserDataToModel,
  type UserDataModel,
} from "../model/user-data.schema";

export const getCurrentUserData = async (): Promise<UserDataModel | null> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_data")
    .select(
      "id, created_at, user_id, firstname, lastname, phone_number, country, region, email",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapSupabaseUserDataToModel(data);
};
