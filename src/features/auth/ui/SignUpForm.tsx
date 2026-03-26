import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { signUpSchema, type SignUpFormValues } from "../model/sign-up.schema";
import { useSignUpMutation } from "../model/use-sign-up-mutation";

export const SignUpForm = () => {
  const navigate = useNavigate();
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
        Prénom
      </label>
      <input
        id="sign-up-firstname"
        className="field-input"
        type="text"
        placeholder="Michael"
        {...register("firstname")}
      />
      {errors.firstname ? (
        <p className="error">{errors.firstname.message}</p>
      ) : null}

      <label className="field-label" htmlFor="sign-up-lastname">
        Nom
      </label>
      <input
        id="sign-up-lastname"
        className="field-input"
        type="text"
        placeholder="Rodriguez"
        {...register("lastname")}
      />
      {errors.lastname ? (
        <p className="error">{errors.lastname.message}</p>
      ) : null}

      <label className="field-label" htmlFor="sign-up-phone">
        Téléphone
      </label>
      <input
        id="sign-up-phone"
        className="field-input"
        type="tel"
        placeholder="+33 6 00 00 00 00"
        {...register("phoneNumber")}
      />
      {errors.phoneNumber ? (
        <p className="error">{errors.phoneNumber.message}</p>
      ) : null}

      <label className="field-label" htmlFor="sign-up-country">
        Pays
      </label>
      <input
        id="sign-up-country"
        className="field-input"
        type="text"
        placeholder="France"
        {...register("country")}
      />
      {errors.country ? (
        <p className="error">{errors.country.message}</p>
      ) : null}

      <label className="field-label" htmlFor="sign-up-region">
        Région / Ville
      </label>
      <input
        id="sign-up-region"
        className="field-input"
        type="text"
        placeholder="Île-de-France"
        {...register("region")}
      />
      {errors.region ? <p className="error">{errors.region.message}</p> : null}

      <label className="field-label" htmlFor="sign-up-email">
        Adresse email
      </label>
      <input
        id="sign-up-email"
        className="field-input"
        type="email"
        placeholder="vous@exemple.com"
        {...register("email")}
      />
      {errors.email ? <p className="error">{errors.email.message}</p> : null}

      <label className="field-label" htmlFor="sign-up-password">
        Mot de passe
      </label>
      <input
        id="sign-up-password"
        className="field-input"
        type="password"
        placeholder="min 8 caracteres"
        {...register("password")}
      />
      {errors.password ? (
        <p className="error">{errors.password.message}</p>
      ) : null}

      <label className="field-label" htmlFor="sign-up-confirm-password">
        Confirmer le mot de passe
      </label>
      <input
        id="sign-up-confirm-password"
        className="field-input"
        type="password"
        placeholder="repetez le mot de passe"
        {...register("confirmPassword")}
      />
      {errors.confirmPassword ? (
        <p className="error">{errors.confirmPassword.message}</p>
      ) : null}

      <label className="field-label" htmlFor="sign-up-avatar">
        Lien de photo de profil
      </label>
      <input
        id="sign-up-avatar"
        className="field-input"
        type="url"
        placeholder="https://exemple.com/ma-photo.jpg"
        {...register("profilePicture")}
      />
      {errors.profilePicture ? (
        <p className="error">{errors.profilePicture.message}</p>
      ) : null}

      <label className="checkbox-row">
        <input type="checkbox" />
        <span>J'accepte les conditions et la politique de confidentialite</span>
      </label>

      <button className="auth-primary" type="submit" disabled={isPending}>
        {isPending ? "Inscription en cours..." : "S'inscrire"}
      </button>

      {isError ? <p className="error">{error.message}</p> : null}
      {data?.requiresEmailConfirmation ? (
        <p className="success">
          Verifiez votre email pour activer votre compte.
        </p>
      ) : null}
    </form>
  );
};
