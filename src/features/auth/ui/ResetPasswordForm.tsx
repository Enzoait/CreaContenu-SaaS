import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "../model/reset-password.schema";
import { useResetPasswordMutation } from "../model/use-reset-password-mutation";

type ResetPasswordFormProps = {
  onBackToSignIn?: () => void;
};

export const ResetPasswordForm = ({
  onBackToSignIn,
}: ResetPasswordFormProps) => {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { mutateAsync, isPending, isError, error } = useResetPasswordMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    await mutateAsync(values);
    setHasSubmitted(true);
  };

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <label className="field-label" htmlFor="reset-password-new">
        Nouveau mot de passe
      </label>
      <input
        id="reset-password-new"
        className="field-input"
        type="password"
        placeholder="min 8 caracteres"
        {...register("newPassword")}
      />
      {errors.newPassword ? (
        <p className="error">{errors.newPassword.message}</p>
      ) : null}

      <label className="field-label" htmlFor="reset-password-confirm">
        Confirmer le mot de passe
      </label>
      <input
        id="reset-password-confirm"
        className="field-input"
        type="password"
        placeholder="repetez le mot de passe"
        {...register("confirmPassword")}
      />
      {errors.confirmPassword ? (
        <p className="error">{errors.confirmPassword.message}</p>
      ) : null}

      <button className="auth-primary" type="submit" disabled={isPending}>
        {isPending ? "Mise a jour..." : "Reinitialiser le mot de passe"}
      </button>

      {isError ? <p className="error">{error.message}</p> : null}
      {hasSubmitted ? (
        <p className="success">
          Mot de passe mis a jour. Vous pouvez vous reconnecter.
        </p>
      ) : null}

      <button type="button" className="text-action" onClick={onBackToSignIn}>
        Retour a la connexion
      </button>
    </form>
  );
};
