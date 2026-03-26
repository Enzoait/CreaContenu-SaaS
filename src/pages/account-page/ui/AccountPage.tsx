import { zodResolver } from "@hookform/resolvers/zod";
import { jsPDF } from "jspdf";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  HiOutlineArrowDownTray,
  HiOutlineLockClosed,
  HiOutlineUser,
} from "react-icons/hi2";
import {
  useCurrentUserDataQuery,
  useCurrentUserQuery,
  useUpsertUserDataMutation,
} from "../../../entities/user";
import {
  accountProfileFormSchema,
  useAccountActiveTab,
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
  const displayProfilePicture = userData?.profilePicture?.trim() || "";
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
      profilePicture: userData?.profilePicture ?? "",
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
      profilePicture: userData?.profilePicture ?? "",
    });
  }, [
    currentUser?.email,
    resetProfileForm,
    userData?.country,
    userData?.email,
    userData?.firstname,
    userData?.lastname,
    userData?.phoneNumber,
    userData?.profilePicture,
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
        profilePicture: values.profilePicture?.trim() ?? "",
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
      <div className="account-v2-grid">
        <section className="account-v2-hero">
          <div className="account-v2-hero-main">
            <img
              className="account-v2-photo"
              src={
                displayProfilePicture ||
                `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(displayFullName)}&radius=50`
              }
              alt="Photo de profil"
            />
            <div>
              <h2 className="account-v2-name">{displayFullName}</h2>
              <p className="account-v2-subtitle">Créateur de contenu</p>
              <p className="account-v2-meta">
                {displayRegion}, {displayCountry} · {displayEmail}
              </p>
            </div>
          </div>
          <div className="account-v2-kpis">
            <article>
              <span>Identifiant</span>
              <strong>{currentUser?.id?.slice(0, 8) ?? "-"}</strong>
            </article>
            <article>
              <span>Téléphone</span>
              <strong>{displayPhone}</strong>
            </article>
            <article>
              <span>Dernière mise à jour</span>
              <strong>{savedAt ? `${savedAt}` : "Pas encore"}</strong>
            </article>
          </div>
        </section>

        <section className="account-v2-card">
          <div className="account-v2-card-header">
            <h3 className="account-section-title">Modifier mes informations</h3>
            <span className="account-v2-badge">Profil public</span>
          </div>
          <form
            className="account-v2-form"
            onSubmit={handleProfileSubmit(onSubmit)}
          >
            <div className="account-v2-form-grid">
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

              <label className="field-label" htmlFor="account-profile-picture">
                Lien de photo de profil
              </label>
              <input
                id="account-profile-picture"
                className="field-input"
                type="url"
                placeholder="https://exemple.com/ma-photo.jpg"
                {...register("profilePicture")}
              />
              {errors.profilePicture ? (
                <p className="error">{errors.profilePicture.message}</p>
              ) : null}
            </div>

            {saveErrorMessage ? (
              <p className="error">{saveErrorMessage}</p>
            ) : null}

            <div className="account-v2-form-actions">
              <button
                type="submit"
                className="auth-primary"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? "Enregistrement..." : "Sauvegarder"}
              </button>
              {savedAt ? (
                <span className="muted">Enregistré à {savedAt}</span>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    );
  };

  const renderSecurityPanel = () => (
    <section className="account-v2-card">
      <div className="account-v2-card-header">
        <h3 className="account-section-title">Sécurité</h3>
        <span className="account-v2-badge">Bientôt</span>
      </div>
      <div className="account-v2-security-list">
        <article>
          <h4>Mot de passe</h4>
          <p>
            La gestion et rotation sécurisée du mot de passe sera ajoutée ici.
          </p>
        </article>
        <article>
          <h4>Double authentification</h4>
          <p>Activez la 2FA pour renforcer la sécurité de votre compte.</p>
        </article>
        <article>
          <h4>Sessions actives</h4>
          <p>
            Consultez les appareils connectés et déconnectez les sessions
            inconnues.
          </p>
        </article>
      </div>
    </section>
  );

  const renderExportPanel = () => (
    <section className="account-v2-card">
      <div className="account-v2-card-header">
        <h3 className="account-section-title">
          Export des données personnelles
        </h3>
        <span className="account-v2-badge">RGPD</span>
      </div>
      <p className="muted account-v2-export-text">
        Téléchargez vos informations de profil au format texte ou PDF.
      </p>
      <div className="account-v2-export-actions">
        <button
          type="button"
          className="auth-primary account-v2-export-btn"
          onClick={handleTextExport}
        >
          <HiOutlineArrowDownTray aria-hidden="true" />
          Exporter en .txt
        </button>
        <button
          type="button"
          className="auth-primary account-v2-export-btn"
          onClick={handlePdfExport}
        >
          <HiOutlineArrowDownTray aria-hidden="true" />
          Exporter en .pdf
        </button>
      </div>
    </section>
  );

  return (
    <CreatorAppShell accountTopBar>
      <div className="account-v2-layout">
        <aside className="account-v2-sidebar">
          <h1 className="account-v2-title">Gestion utilisateur</h1>
          <p className="account-v2-description">
            Centralisez votre identité, sécurité et export de données.
          </p>
          {ACCOUNT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`account-v2-tab ${activeTab === tab.id ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.id === "profil" ? (
                <HiOutlineUser aria-hidden="true" />
              ) : null}
              {tab.id === "securite" ? (
                <HiOutlineLockClosed aria-hidden="true" />
              ) : null}
              {tab.id === "export" ? (
                <HiOutlineArrowDownTray aria-hidden="true" />
              ) : null}
              {tab.label}
            </button>
          ))}
        </aside>

        <section className="account-v2-main">
          {activeTab === "profil" ? renderProfilePanel() : null}
          {activeTab === "securite" ? renderSecurityPanel() : null}
          {activeTab === "export" ? renderExportPanel() : null}
        </section>
      </div>
    </CreatorAppShell>
  );
};
