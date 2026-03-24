import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  profileSettingsSchema,
  type ProfileSettingsFormValues,
} from "../model/profile-settings.schema";
import {
  useProfilePreferencesActions,
  useProfileSavedBio,
  useProfileSavedDisplayName,
  useProfileSavedNotifyEmail,
  useProfileSavedPhone,
} from "../model/profile-preferences-store";

export const ProfileSettingsForm = () => {
  const savedDisplayName = useProfileSavedDisplayName();
  const savedBio = useProfileSavedBio();
  const savedPhone = useProfileSavedPhone();
  const savedNotifyEmail = useProfileSavedNotifyEmail();
  const setFromForm = useProfilePreferencesActions();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileSettingsFormValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      displayName: savedDisplayName,
      bio: savedBio,
      phone: savedPhone,
      notifyEmail: savedNotifyEmail,
    },
  });

  useEffect(() => {
    reset({
      displayName: savedDisplayName,
      bio: savedBio,
      phone: savedPhone,
      notifyEmail: savedNotifyEmail,
    });
  }, [savedDisplayName, savedBio, savedPhone, savedNotifyEmail, reset]);

  const onSubmit = (values: ProfileSettingsFormValues) => {
    setFromForm({
      ...values,
      displayName: values.displayName.trim(),
      bio: values.bio.trim(),
      phone: values.phone.trim(),
    });
    setSavedAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
  };

  return (
    <section className="surface">
      <h2>Informations du profil</h2>
      <p className="muted" style={{ marginTop: "0.35rem" }}>
        Ces données sont enregistrées sur cet appareil (Zustand + persist). L’email
        de connexion reste celui de ton compte ci-dessus.
      </p>
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} style={{ marginTop: "1rem" }}>
        <label className="field-label" htmlFor="profile-display-name">
          Nom affiché sur le dashboard
        </label>
        <input
          id="profile-display-name"
          className="field-input"
          type="text"
          autoComplete="nickname"
          {...register("displayName")}
        />
        {errors.displayName ? (
          <p className="error">{errors.displayName.message}</p>
        ) : null}

        <label className="field-label" htmlFor="profile-bio">
          Bio / À propos
        </label>
        <textarea
          id="profile-bio"
          className="field-input"
          rows={4}
          placeholder="Quelques lignes sur toi, ton contenu…"
          {...register("bio")}
        />
        {errors.bio ? <p className="error">{errors.bio.message}</p> : null}

        <label className="field-label" htmlFor="profile-phone">
          Téléphone (optionnel)
        </label>
        <input
          id="profile-phone"
          className="field-input"
          type="tel"
          autoComplete="tel"
          placeholder="+33 …"
          {...register("phone")}
        />
        {errors.phone ? <p className="error">{errors.phone.message}</p> : null}

        <label className="checkbox-row" htmlFor="profile-notify">
          <input id="profile-notify" type="checkbox" {...register("notifyEmail")} />
          <span>Me prévenir par email des rappels (mock)</span>
        </label>
        {errors.notifyEmail ? (
          <p className="error">{errors.notifyEmail.message}</p>
        ) : null}

        <div className="row-between" style={{ marginTop: "0.5rem" }}>
          <button type="submit" className="auth-primary">
            Enregistrer les modifications
          </button>
          {savedAt ? (
            <span className="muted" style={{ fontSize: "0.9rem" }}>
              Enregistré à {savedAt}
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
};
