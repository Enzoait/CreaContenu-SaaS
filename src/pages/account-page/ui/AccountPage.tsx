import { zodResolver } from "@hookform/resolvers/zod";
import { jsPDF } from "jspdf";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  useCurrentUserDataQuery,
  useCurrentUserQuery,
  useUpsertUserDataMutation,
} from "../../../entities/user";
import {
  changePasswordSchema,
  useChangePasswordMutation,
  type ChangePasswordFormValues,
} from "../../../features/auth";
import {
  accountProfileFormSchema,
  useAccountActiveTab,
  useAccountAvatarDataUrl,
  useSetAccountActiveTab,
  type AccountProfileFormValues,
  type AccountTab,
} from "../model";
import { CreatorAppShell } from "../../../widgets/creator-app-shell";

const ACCOUNT_TABS: Array<{ id: AccountTab; label: string }> = [
  { id: "profil", label: "Mon profil" },
  { id: "securite", label: "Sécurité" },
  { id: "export", label: "Export des données" },
];

const downloadBlob = (
  fileName: string,
  content: BlobPart,
  mimeType: string,
) => {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

export const AccountPage = () => {
  const activeTab = useAccountActiveTab();
  const avatarDataUrl = useAccountAvatarDataUrl();
  const setActiveTab = useSetAccountActiveTab();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const {
    data: userData,
    isPending: isUserDataPending,
    isError: isUserDataError,
    error: userDataError,
  } = useCurrentUserDataQuery();
  const { data: currentUser } = useCurrentUserQuery();
  const { mutateAsync: upsertUserData, isPending: isSavingProfile } =
    useUpsertUserDataMutation();

  const displayFirstname = userData?.firstname || "Prénom";
  const displayLastname = userData?.lastname || "Nom";
  const displayFullName = `${displayFirstname} ${displayLastname}`;
  const displayEmail =
    userData?.email || currentUser?.email || "Email indisponible";
  const displayPhone = userData?.phoneNumber || "Téléphone indisponible";
  const displayCountry = userData?.country || "Pays indisponible";
  const displayRegion = userData?.region || "Région indisponible";
  const displayInitials =
    `${displayFirstname.charAt(0)}${displayLastname.charAt(0)}`.toUpperCase();

  const {
    register,
    handleSubmit: handleProfileSubmit,
    reset: resetProfileForm,
    formState: { errors },
  } = useForm<AccountProfileFormValues>({
    resolver: zodResolver(accountProfileFormSchema),
    defaultValues: {
      firstname: userData?.firstname ?? "",
      lastname: userData?.lastname ?? "",
      email: userData?.email ?? currentUser?.email ?? "",
      phoneNumber: userData?.phoneNumber ?? "",
      country: userData?.country ?? "",
      region: userData?.region ?? "",
    },
  });

  useEffect(() => {
    resetProfileForm({
      firstname: userData?.firstname ?? "",
      lastname: userData?.lastname ?? "",
      email: userData?.email ?? currentUser?.email ?? "",
      phoneNumber: userData?.phoneNumber ?? "",
      country: userData?.country ?? "",
      region: userData?.region ?? "",
    });
  }, [
    currentUser?.email,
    resetProfileForm,
    userData?.country,
    userData?.email,
    userData?.firstname,
    userData?.lastname,
    userData?.phoneNumber,
    userData?.region,
  ]);

  const {
    register: registerSecurity,
    handleSubmit: handleSecuritySubmit,
    reset: resetSecurityForm,
    formState: { errors: securityErrors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const {
    mutateAsync: changePassword,
    isPending: isChangingPassword,
    isError: isPasswordChangeError,
    error: passwordChangeError,
  } = useChangePasswordMutation();
  const [passwordUpdatedAt, setPasswordUpdatedAt] = useState<string | null>(
    null,
  );

  const onSubmit = async (values: AccountProfileFormValues) => {
    if (!currentUser?.id) {
      setSaveErrorMessage(
        "Utilisateur non identifié. Reconnectez-vous puis réessayez.",
      );
      return;
    }

    setSaveErrorMessage(null);

    try {
      await upsertUserData({
        userId: currentUser.id,
        firstname: values.firstname.trim(),
        lastname: values.lastname.trim(),
        email: values.email.trim(),
        phoneNumber: values.phoneNumber.trim(),
        country: values.country.trim(),
        region: values.region.trim(),
      });
      setSavedAt(
        new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur pendant la sauvegarde du profil.",
      );
    }
  };

  const onPasswordSubmit = async (values: ChangePasswordFormValues) => {
    await changePassword(values);
    resetSecurityForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordUpdatedAt(
      new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  };

  const handleTextExport = () => {
    const payload = [
      "Export des données personnelles",
      `Date: ${new Date().toLocaleString("fr-FR")}`,
      "",
      `Prénom: ${displayFirstname}`,
      `Nom: ${displayLastname}`,
      `Email: ${displayEmail}`,
      `Téléphone: ${displayPhone}`,
      `Pays: ${displayCountry}`,
      `Région: ${displayRegion}`,
      `Identifiant utilisateur: ${currentUser?.id ?? "Inconnu"}`,
    ].join("\n");

    downloadBlob(
      "donnees-personnelles.txt",
      payload,
      "text/plain;charset=utf-8",
    );
  };

  const handlePdfExport = () => {
    const document = new jsPDF();
    document.setFontSize(16);
    document.text("Export des données personnelles", 20, 20);

    document.setFontSize(11);
    const lines = [
      `Date: ${new Date().toLocaleString("fr-FR")}`,
      "",
      `Prénom: ${displayFirstname}`,
      `Nom: ${displayLastname}`,
      `Email: ${displayEmail}`,
      `Téléphone: ${displayPhone}`,
      `Pays: ${displayCountry}`,
      `Région: ${displayRegion}`,
      `Identifiant utilisateur: ${currentUser?.id ?? "Inconnu"}`,
    ];

    document.text(lines, 20, 32);
    document.save("donnees-personnelles.pdf");
  };

  const renderProfilePanel = () => {
    if (isUserDataPending) {
      return <p>Chargement de vos informations...</p>;
    }

    if (isUserDataError) {
      return (
        <p className="error">
          Erreur lors du chargement: {userDataError.message}
        </p>
      );
    }

    return (
      <div className="account-content-grid">
        <section className="account-card">
          <div className="account-user-row">
            {avatarDataUrl ? (
              <img
                className="account-avatar"
                src={avatarDataUrl}
                alt="Photo de profil"
              />
            ) : (
              <span className="account-avatar account-avatar-fallback">
                {displayInitials}
              </span>
            )}
            <div>
              <h2 className="account-name">{displayFullName}</h2>
              <p className="account-role">Créateur de contenu</p>
              <p className="account-location">
                {displayRegion}, {displayCountry}
              </p>
            </div>
          </div>
        </section>

        <section className="account-card">
          <h3 className="account-section-title">Modifier mes informations</h3>
          <form className="auth-form" onSubmit={handleProfileSubmit(onSubmit)}>
            <label className="field-label" htmlFor="account-firstname">
              Prénom
            </label>
            <input
              id="account-firstname"
              className="field-input"
              type="text"
              autoComplete="given-name"
              {...register("firstname")}
            />
            {errors.firstname ? (
              <p className="error">{errors.firstname.message}</p>
            ) : null}

            <label className="field-label" htmlFor="account-lastname">
              Nom
            </label>
            <input
              id="account-lastname"
              className="field-input"
              type="text"
              autoComplete="family-name"
              {...register("lastname")}
            />
            {errors.lastname ? (
              <p className="error">{errors.lastname.message}</p>
            ) : null}

            <label className="field-label" htmlFor="account-email">
              Adresse email
            </label>
            <input
              id="account-email"
              className="field-input"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email ? (
              <p className="error">{errors.email.message}</p>
            ) : null}

            <label className="field-label" htmlFor="account-phone">
              Téléphone
            </label>
            <input
              id="account-phone"
              className="field-input"
              type="tel"
              autoComplete="tel"
              {...register("phoneNumber")}
            />
            {errors.phoneNumber ? (
              <p className="error">{errors.phoneNumber.message}</p>
            ) : null}

            <label className="field-label" htmlFor="account-country">
              Pays
            </label>
            <input
              id="account-country"
              className="field-input"
              type="text"
              autoComplete="country-name"
              {...register("country")}
            />
            {errors.country ? (
              <p className="error">{errors.country.message}</p>
            ) : null}

            <label className="field-label" htmlFor="account-region">
              Ville / Région
            </label>
            <input
              id="account-region"
              className="field-input"
              type="text"
              autoComplete="address-level2"
              {...register("region")}
            />
            {errors.region ? (
              <p className="error">{errors.region.message}</p>
            ) : null}

            {saveErrorMessage ? (
              <p className="error">{saveErrorMessage}</p>
            ) : null}

            <div className="row-between" style={{ marginTop: "0.75rem" }}>
              <button
                type="submit"
                className="auth-primary"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? "Enregistrement..." : "Sauvegarder"}
              </button>
              {savedAt ? (
                <span className="muted" style={{ fontSize: "0.9rem" }}>
                  Enregistré à {savedAt}
                </span>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    );
  };

  const renderSecurityPanel = () => (
    <section className="account-card">
      <h3 className="account-section-title">Sécurité</h3>
      <p className="muted" style={{ marginBottom: "1rem" }}>
        Mettez a jour votre mot de passe en confirmant d'abord le mot de passe
        actuel.
      </p>
      <form
        className="auth-form"
        onSubmit={handleSecuritySubmit(onPasswordSubmit)}
      >
        <label className="field-label" htmlFor="account-current-password">
          Mot de passe actuel
        </label>
        <input
          id="account-current-password"
          className="field-input"
          type="password"
          autoComplete="current-password"
          placeholder="Votre mot de passe actuel"
          {...registerSecurity("currentPassword")}
        />
        {securityErrors.currentPassword ? (
          <p className="error">{securityErrors.currentPassword.message}</p>
        ) : null}

        <label className="field-label" htmlFor="account-new-password">
          Nouveau mot de passe
        </label>
        <input
          id="account-new-password"
          className="field-input"
          type="password"
          autoComplete="new-password"
          placeholder="Minimum 8 caracteres"
          {...registerSecurity("newPassword")}
        />
        {securityErrors.newPassword ? (
          <p className="error">{securityErrors.newPassword.message}</p>
        ) : null}

        <label className="field-label" htmlFor="account-confirm-password">
          Confirmer le nouveau mot de passe
        </label>
        <input
          id="account-confirm-password"
          className="field-input"
          type="password"
          autoComplete="new-password"
          placeholder="Repetez le nouveau mot de passe"
          {...registerSecurity("confirmPassword")}
        />
        {securityErrors.confirmPassword ? (
          <p className="error">{securityErrors.confirmPassword.message}</p>
        ) : null}

        {isPasswordChangeError ? (
          <p className="error">{passwordChangeError.message}</p>
        ) : null}

        <div className="row-between" style={{ marginTop: "0.75rem" }}>
          <button
            type="submit"
            className="auth-primary"
            disabled={isChangingPassword}
          >
            {isChangingPassword
              ? "Mise a jour en cours..."
              : "Mettre a jour le mot de passe"}
          </button>
          {passwordUpdatedAt ? (
            <span className="success" style={{ fontSize: "0.9rem" }}>
              Mot de passe mis a jour a {passwordUpdatedAt}
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );

  const renderExportPanel = () => (
    <section className="account-card">
      <h3 className="account-section-title">Export des données personnelles</h3>
      <p className="muted" style={{ marginBottom: "1rem" }}>
        Téléchargez vos informations de profil au format texte ou PDF.
      </p>
      <div className="row">
        <button
          type="button"
          className="auth-primary"
          onClick={handleTextExport}
        >
          Exporter en .txt
        </button>
        <button
          type="button"
          className="auth-primary"
          onClick={handlePdfExport}
        >
          Exporter en .pdf
        </button>
      </div>
    </section>
  );

  return (
    <CreatorAppShell accountTopBar>
      <div className="account-layout">
        <aside className="account-sidebar">
          {ACCOUNT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`account-tab-item ${activeTab === tab.id ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <section className="account-main">
          <h1 className="account-title">Mon profil</h1>
          {activeTab === "profil" ? renderProfilePanel() : null}
          {activeTab === "securite" ? renderSecurityPanel() : null}
          {activeTab === "export" ? renderExportPanel() : null}
        </section>
      </div>
    </CreatorAppShell>
  );
};
