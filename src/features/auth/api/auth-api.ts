import { mapSupabaseUserToUserModel } from "../../../entities/user";
import { upsertUserData } from "../../../entities/user/api";
import { supabase } from "../../../shared/api/supabase/client";
import type { AuthSession } from "../../../shared/model";
import type { FlatUserMetadata } from "../../../shared/types/metadata";
import type { ChangePasswordFormValues } from "../model/change-password.schema";
import type { ForgotPasswordFormValues } from "../model/forgot-password.schema";
import type { ResetPasswordFormValues } from "../model/reset-password.schema";
import type { SignInFormValues } from "../model/sign-in.schema";
import type { SignUpFormValues } from "../model/sign-up.schema";

export type SignUpResult = {
  session: AuthSession | null;
  requiresEmailConfirmation: boolean;
};

const mapSupabaseAuthErrorMessage = (message: string): string => {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Le mot de passe actuel est incorrect.";
  }

  if (normalized.includes("new password should be different")) {
    return "Le nouveau mot de passe doit etre different de l'actuel.";
  }

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

const readStringMetadata = (
  metadata: FlatUserMetadata | undefined,
  key: string,
): string => {
  const value = metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
};

const getPasswordResetRedirectUrl = (): string | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/auth/reset-password`;
};

const syncUserDataFromMetadata = async (
  userId: string,
  email: string,
  metadata: FlatUserMetadata | undefined,
): Promise<void> => {
  const firstname = readStringMetadata(metadata, "firstname");
  const lastname = readStringMetadata(metadata, "lastname");
  const phoneNumber = readStringMetadata(metadata, "phone_number");
  const country = readStringMetadata(metadata, "country");
  const region = readStringMetadata(metadata, "region");
  const profilePicture = readStringMetadata(metadata, "profile_picture");

  if (!firstname || !lastname || !phoneNumber || !country || !region) {
    return;
  }

  await upsertUserData({
    userId,
    firstname,
    lastname,
    phoneNumber,
    country,
    region,
    email,
    profilePicture,
  });
};

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

  await syncUserDataFromMetadata(
    user.id,
    user.email ?? payload.email,
    data.user.user_metadata as FlatUserMetadata | undefined,
  );

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
    options: {
      data: {
        firstname: payload.firstname,
        lastname: payload.lastname,
        phone_number: payload.phoneNumber,
        country: payload.country,
        region: payload.region,
        profile_picture: payload.profilePicture?.trim() || "",
      },
    },
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

  await upsertUserData({
    userId: user.id,
    firstname: payload.firstname,
    lastname: payload.lastname,
    phoneNumber: payload.phoneNumber,
    country: payload.country,
    region: payload.region,
    email: payload.email,
    profilePicture: payload.profilePicture?.trim() || "",
  });

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

export const changePassword = async (
  payload: ChangePasswordFormValues,
): Promise<void> => {
  const { data: currentUserData, error: currentUserError } =
    await supabase.auth.getUser();

  if (currentUserError) {
    throw new Error(mapSupabaseAuthErrorMessage(currentUserError.message));
  }

  const currentEmail = currentUserData.user?.email;
  if (!currentEmail) {
    throw new Error("Impossible de verifier l'utilisateur connecte.");
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: currentEmail,
    password: payload.currentPassword,
  });

  if (reauthError) {
    throw new Error(mapSupabaseAuthErrorMessage(reauthError.message));
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: payload.newPassword,
  });

  if (updateError) {
    throw new Error(mapSupabaseAuthErrorMessage(updateError.message));
  }
};

export const requestPasswordReset = async (
  payload: ForgotPasswordFormValues,
): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(payload.email, {
    redirectTo: getPasswordResetRedirectUrl(),
  });

  if (error) {
    throw new Error(mapSupabaseAuthErrorMessage(error.message));
  }
};

export const resetPassword = async (
  payload: ResetPasswordFormValues,
): Promise<void> => {
  const { error: updateError } = await supabase.auth.updateUser({
    password: payload.newPassword,
  });

  if (updateError) {
    throw new Error(mapSupabaseAuthErrorMessage(updateError.message));
  }

  const { error: signOutError } = await supabase.auth.signOut();

  if (signOutError) {
    throw new Error(mapSupabaseAuthErrorMessage(signOutError.message));
  }
};
