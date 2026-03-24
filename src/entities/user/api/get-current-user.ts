import { supabase } from "../../../shared/api/supabase/client";
import {
  mapSupabaseUserToUserModel,
  type UserModel,
} from "../model/user.schema";

export const getCurrentUser = async (): Promise<UserModel | null> => {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    return null;
  }

  return mapSupabaseUserToUserModel(data.user);
};
