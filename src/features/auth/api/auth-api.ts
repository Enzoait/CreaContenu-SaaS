import { mapSupabaseUserToUserModel } from "../../../entities/user";
import { supabase } from "../../../shared/api/supabase/client";
import type { AuthSession } from "../../../shared/model";
import type { SignInFormValues } from "../model/sign-in.schema";
import type { SignUpFormValues } from "../model/sign-up.schema";

export type SignUpResult = {
  session: AuthSession | null;
  requiresEmailConfirmation: boolean;
};

const mapSupabaseAuthErrorMessage = (message: string): string => {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("over_email_send_rate_limit")
  ) {
    return "Trop de demandes d'emails de confirmation. Attendez quelques minutes avant de reessayer.";
  }

  return message;
};

const toAuthSession = (
  accessToken: string,
  userId: string,
  email: string | null,
  createdAt: string,
): AuthSession => ({
  accessToken,
  user: {
    id: userId,
    email,
    createdAt,
  },
});

export const signInWithPassword = async (
  payload: SignInFormValues,
): Promise<AuthSession> => {
  const { data, error } = await supabase.auth.signInWithPassword(payload);

  if (error) {
    throw new Error(mapSupabaseAuthErrorMessage(error.message));
  }

  if (!data.session || !data.user) {
    throw new Error("Session invalide apres connexion");
  }

  const user = mapSupabaseUserToUserModel(data.user);
  return toAuthSession(
    data.session.access_token,
    user.id,
    user.email,
    user.createdAt,
  );
};

export const signUpWithEmail = async (
  payload: SignUpFormValues,
): Promise<SignUpResult> => {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
    throw new Error(mapSupabaseAuthErrorMessage(error.message));
  }

  if (!data.user) {
    throw new Error("Inscription echouee");
  }

  if (!data.session) {
    return {
      session: null,
      requiresEmailConfirmation: true,
    };
  }

  const user = mapSupabaseUserToUserModel(data.user);
  return {
    session: toAuthSession(
      data.session.access_token,
      user.id,
      user.email,
      user.createdAt,
    ),
    requiresEmailConfirmation: false,
  };
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(mapSupabaseAuthErrorMessage(error.message));
  }
};
