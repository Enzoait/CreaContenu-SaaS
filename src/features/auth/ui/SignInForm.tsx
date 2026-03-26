import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/i18n";
import {
  createSignInSchema,
  type SignInFormValues,
} from "../model/sign-in.schema";
import { useSignInMutation } from "../model/use-sign-in-mutation";

type SignInFormProps = {
  onForgotPassword?: () => void;
};

export const SignInForm = ({ onForgotPassword }: SignInFormProps) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const signInSchema = useMemo(() => createSignInSchema(t), [t]);
  const { mutateAsync, isPending, isError, error } = useSignInMutation();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, submitCount },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      acceptTerms: false,
    },
  });

  const isTermsAccepted = watch("acceptTerms");

  const onSubmit = async (values: SignInFormValues) => {
    await mutateAsync(values);
    navigate("/dashboard");
  };

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <label className="field-label" htmlFor="sign-in-email">
        {t("auth.fieldEmail")}
      </label>
      <input
        id="sign-in-email"
        className="field-input"
        type="email"
        placeholder={t("auth.placeholderEmail")}
        {...register("email")}
      />
      {errors.email ? <p className="error">{errors.email.message}</p> : null}

      <div className="row-between">
        <label className="field-label" htmlFor="sign-in-password">
          {t("auth.fieldPassword")}
        </label>
        <button
          type="button"
          className="text-action"
          tabIndex={-1}
          onClick={onForgotPassword}
        >
          {t("auth.forgotPasswordLink")}
        </button>
      </div>
      <input
        id="sign-in-password"
        className="field-input"
        type="password"
        placeholder={t("auth.placeholderPasswordMin8")}
        {...register("password")}
      />
      {errors.password ? (
        <p className="error">{errors.password.message}</p>
      ) : null}

      <label className="checkbox-row" htmlFor="sign-in-accept-terms">
        <input
          id="sign-in-accept-terms"
          type="checkbox"
          {...register("acceptTerms")}
        />
        <span>{t("auth.acceptTerms")}</span>
      </label>
      {submitCount > 0 && !isTermsAccepted ? (
        <p className="error">{t("auth.acceptTermsSignInHint")}</p>
      ) : null}

      <button className="auth-primary" type="submit" disabled={isPending}>
        {isPending ? t("auth.signInSubmitting") : t("auth.signInSubmit")}
      </button>

      {isError ? <p className="error">{error.message}</p> : null}
    </form>
  );
};
