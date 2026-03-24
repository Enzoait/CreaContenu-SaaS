import { useState } from "react";
import { SignInForm, SignUpForm } from "../../../features/auth";

type AuthTab = "sign-in" | "sign-up";

export const AuthPanel = () => {
  const [tab, setTab] = useState<AuthTab>("sign-in");

  return (
    <section className="auth-shell">
      <article className="auth-left">
        <div>
          <h1 className="auth-title">Commencez maintenant</h1>
          <p className="auth-subtitle">
            Saisissez vos identifiants pour acceder a votre compte
          </p>
        </div>

        <div
          className="auth-tabs"
          role="tablist"
          aria-label="Mode d'authentification"
        >
          <button
            type="button"
            className={`auth-tab ${tab === "sign-in" ? "is-active" : ""}`}
            onClick={() => setTab("sign-in")}
            aria-selected={tab === "sign-in"}
          >
            Connexion
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === "sign-up" ? "is-active" : ""}`}
            onClick={() => setTab("sign-up")}
            aria-selected={tab === "sign-up"}
          >
            Inscription
          </button>
        </div>

        {tab === "sign-in" ? <SignInForm /> : <SignUpForm />}

        <p className="auth-footer-note">
          2026 CreaContenu. Tous droits reserves.
        </p>
      </article>

      <aside className="auth-right" aria-hidden="true">
        <h2 className="auth-right-title">
          La facon la plus simple de gerer votre workflow de contenu
        </h2>
        <p className="auth-right-subtitle">
          Organisez, validez, publiez et suivez votre contenu depuis un seul
          tableau de bord.
        </p>

        <div className="preview-card">
          <div className="preview-topbar">
            <span className="preview-dot" />
            <span className="preview-dot" />
            <span className="preview-dot" />
          </div>
          <div className="preview-grid">
            <div className="preview-block tall" />
            <div className="preview-block" />
            <div className="preview-block" />
            <div className="preview-block wide" />
          </div>
        </div>

        <div className="brand-row">
          <p>CreaContenu, la solution de référence pour les créateurs en ligne.</p>
        </div>
      </aside>
    </section>
  );
};
