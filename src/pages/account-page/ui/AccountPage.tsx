import { jsPDF } from "jspdf";
import {
  useCurrentUserDataQuery,
  useCurrentUserQuery,
} from "../../../entities/user";
import {
  useAccountActiveTab,
  useAccountAvatarDataUrl,
  useSetAccountActiveTab,
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
  const {
    data: userData,
    isPending: isUserDataPending,
    isError: isUserDataError,
    error: userDataError,
  } = useCurrentUserDataQuery();
  const { data: currentUser } = useCurrentUserQuery();

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
          <h3 className="account-section-title">Informations personnelles</h3>
          <div className="account-info-grid">
            <div>
              <p className="account-label">Prénom</p>
              <p>{displayFirstname}</p>
            </div>
            <div>
              <p className="account-label">Nom</p>
              <p>{displayLastname}</p>
            </div>
            <div>
              <p className="account-label">Adresse email</p>
              <p>{displayEmail}</p>
            </div>
            <div>
              <p className="account-label">Téléphone</p>
              <p>{displayPhone}</p>
            </div>
          </div>
        </section>

        <section className="account-card">
          <h3 className="account-section-title">Adresse</h3>
          <div className="account-info-grid">
            <div>
              <p className="account-label">Pays</p>
              <p>{displayCountry}</p>
            </div>
            <div>
              <p className="account-label">Ville / Région</p>
              <p>{displayRegion}</p>
            </div>
          </div>
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
