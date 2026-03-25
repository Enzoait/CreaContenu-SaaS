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
    handleSubmit,
    reset,
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
    reset({
      firstname: userData?.firstname ?? "",
      lastname: userData?.lastname ?? "",
      email: userData?.email ?? currentUser?.email ?? "",
      phoneNumber: userData?.phoneNumber ?? "",
      country: userData?.country ?? "",
      region: userData?.region ?? "",
    });
  }, [
    currentUser?.email,
    reset,
    userData?.country,
    userData?.email,
    userData?.firstname,
    userData?.lastname,
    userData?.phoneNumber,
    userData?.region,
  ]);

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
          <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
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
      <p className="muted">
        Cette section sera étendue pour la gestion du mot de passe et de la
        double authentification.
      </p>
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
