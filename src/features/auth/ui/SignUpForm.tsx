import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/i18n";
import {
  createSignUpSchema,
  type SignUpFormValues,
} from "../model/sign-up.schema";
import { useSignUpMutation } from "../model/use-sign-up-mutation";

export const SignUpForm = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const signUpSchema = useMemo(() => createSignUpSchema(t), [t]);
  const { mutateAsync, isPending, isError, error, data } = useSignUpMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstname: "",
      lastname: "",
      phoneNumber: "",
      country: "",
      region: "",
      email: "",
      profilePicture: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    const result = await mutateAsync(values);
    if (!result.requiresEmailConfirmation) {
      navigate("/dashboard");
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
      <label className="field-label" htmlFor="sign-up-firstname">
        {t("auth.fieldFirstName")}
      </label>
      <input
        id="sign-up-firstname"
        className="field-input"
        type="text"
        placeholder={t("auth.placeholderFirstName")}
        {...register("firstname")}
      />
      {errors.firstname ? (
        <p className="error">{errors.firstname.message}</p>
      ) : null}

      <label className="field-label" htmlFor="sign-up-lastname">
        {t("auth.fieldLastName")}
      </label>
      <input
        id="sign-up-lastname"
        className="field-input"
        type="text"
        placeholder={t("auth.placeholderLastName")}
        {...register("lastname")}
      />
      {errors.lastname ? (
        <p className="error">{errors.lastname.message}</p>
      ) : null}

      <label className="field-label" htmlFor="sign-up-phone">
        {t("auth.fieldPhone")}
      </label>
      <input
        id="sign-up-phone"
        className="field-input"
        type="tel"
        placeholder={t("auth.placeholderPhone")}
        {...register("phoneNumber")}
      />
      {errors.phoneNumber ? (
        <p className="error">{errors.phoneNumber.message}</p>
      ) : null}

      <label className="field-label" htmlFor="sign-up-country">
        {t("auth.fieldCountry")}
      </label>
      <input
        id="sign-up-country"
        className="field-input"
        type="text"
        placeholder={t("auth.placeholderCountry")}
        {...register("country")}
      />
      {errors.country ? (
        <p className="error">{errors.country.message}</p>
      ) : null}

      <label className="field-label" htmlFor="sign-up-region">
        {t("auth.fieldRegion")}
      </label>
      <input
        id="sign-up-region"
        className="field-input"
        type="text"
        placeholder={t("auth.placeholderRegion")}
        {...register("region")}
      />
      {errors.region ? <p className="error">{errors.region.message}</p> : null}

      <label className="field-label" htmlFor="sign-up-email">
        {t("auth.fieldEmail")}
      </label>
      <input
        id="sign-up-email"
        className="field-input"
        type="email"
        placeholder={t("auth.placeholderEmail")}
        {...register("email")}
      />
      {errors.email ? <p className="error">{errors.email.message}</p> : null}

      <label className="field-label" htmlFor="sign-up-password">
        {t("auth.fieldPassword")}
      </label>
      <input
        id="sign-up-password"
        className="field-input"
        type="password"
        placeholder={t("auth.placeholderPasswordMin8")}
        {...register("password")}
      />
      {errors.password ? (
        <p className="error">{errors.password.message}</p>
      ) : null}

      <label className="field-label" htmlFor="sign-up-confirm-password">
        {t("auth.fieldConfirmPassword")}
      </label>
      <input
        id="sign-up-confirm-password"
        className="field-input"
        type="password"
        placeholder={t("auth.placeholderConfirmPassword")}
        {...register("confirmPassword")}
      />
      {errors.confirmPassword ? (
        <p className="error">{errors.confirmPassword.message}</p>
      ) : null}

      <label className="field-label" htmlFor="sign-up-avatar">
        {t("auth.fieldProfilePicture")}
      </label>
      <input
        id="sign-up-avatar"
        className="field-input"
        type="url"
        placeholder={t("auth.placeholderProfilePicture")}
        {...register("profilePicture")}
      />
      {errors.profilePicture ? (
        <p className="error">{errors.profilePicture.message}</p>
      ) : null}

      <label className="checkbox-row">
        <input type="checkbox" />
        <span>{t("auth.acceptTerms")}</span>
      </label>

      <button className="auth-primary" type="submit" disabled={isPending}>
        {isPending ? t("auth.signUpSubmitting") : t("auth.signUpSubmit")}
      </button>

      {isError ? <p className="error">{error.message}</p> : null}
      {data?.requiresEmailConfirmation ? (
        <p className="success">{t("auth.verifyEmailMessage")}</p>
      ) : null}
    </form>
  );
};
