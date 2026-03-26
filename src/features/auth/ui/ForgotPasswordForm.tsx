import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "../model/forgot-password.schema";
import { useRequestPasswordResetMutation } from "../model/use-request-password-reset-mutation";

type ForgotPasswordFormProps = {
  onBackToSignIn?: () => void;
};

export const ForgotPasswordForm = ({
  onBackToSignIn,
}: ForgotPasswordFormProps) => {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { mutateAsync, isPending, isError, error } =
    useRequestPasswordResetMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    await mutateAsync(values);
    setHasSubmitted(true);
  };

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <label className="field-label" htmlFor="forgot-password-email">
        Adresse email
      </label>
      <input
        id="forgot-password-email"
        className="field-input"
        type="email"
        placeholder="vous@exemple.com"
        {...register("email")}
      />
      {errors.email ? <p className="error">{errors.email.message}</p> : null}

      <button className="auth-primary" type="submit" disabled={isPending}>
        {isPending ? "Envoi en cours..." : "Envoyer le lien"}
      </button>

      {isError ? <p className="error">{error.message}</p> : null}
      {hasSubmitted ? (
        <p className="success">
          Si un compte existe, un email de reinitialisation a ete envoye.
        </p>
      ) : null}

      <button type="button" className="text-action" onClick={onBackToSignIn}>
        Retour a la connexion
      </button>
    </form>
  );
};
