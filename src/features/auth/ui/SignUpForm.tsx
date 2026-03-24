import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useSetAccountAvatarDataUrl } from "../../../pages/account-page/model";
import { signUpSchema, type SignUpFormValues } from "../model/sign-up.schema";
import { useSignUpMutation } from "../model/use-sign-up-mutation";

export const SignUpForm = () => {
  const navigate = useNavigate();
  const setAvatarDataUrl = useSetAccountAvatarDataUrl();
  const { mutateAsync, isPending, isError, error, data } = useSignUpMutation();
  const [avatarLabel, setAvatarLabel] = useState<string>(
    "Aucune photo sélectionnée",
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
      password: "",
      confirmPassword: "",
    },
  });

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("Impossible de lire le fichier image."));
      };
      reader.onerror = () =>
        reject(new Error("Impossible de lire le fichier image."));
      reader.readAsDataURL(file);
    });

  const handleAvatarFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setAvatarLabel("Format invalide. Utilisez une image JPG, PNG ou WebP.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setAvatarDataUrl(dataUrl);
    setAvatarLabel(file.name);
  };

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    await handleAvatarFile(file);
  };

  const onInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await handleAvatarFile(file);
  };

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
        Photo de profil
      </label>
      <div
        className={`dropzone ${isDragging ? "is-dragging" : ""}`}
        onDrop={(event) => {
          void onDrop(event);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label="Déposer une photo de profil ou cliquer pour sélectionner"
      >
        <p className="dropzone-title">Glissez-déposez votre photo ici</p>
        <p className="dropzone-subtitle">
          ou cliquez pour sélectionner une image
        </p>
        <p className="dropzone-file">{avatarLabel}</p>
      </div>
      <input
        ref={fileInputRef}
        id="sign-up-avatar"
        type="file"
        accept="image/*"
        onChange={(event) => {
          void onInputChange(event);
        }}
        style={{ display: "none" }}
      />

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
