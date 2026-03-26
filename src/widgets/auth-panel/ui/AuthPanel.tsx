import { useEffect, useState } from "react";
import {
  ForgotPasswordForm,
  ResetPasswordForm,
  SignInForm,
  SignUpForm,
} from "../../../features/auth";
import styles from "./AuthPanel.module.scss";

type AuthTab = "sign-in" | "sign-up" | "forgot-password" | "reset-password";

type AuthPanelProps = {
  initialTab?: AuthTab;
};

export const AuthPanel = ({ initialTab = "sign-in" }: AuthPanelProps) => {
  const [tab, setTab] = useState<AuthTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const isTabVisible = tab === "sign-in" || tab === "sign-up";

  return (
    <section className={styles["auth-shell"]}>
      {/* ── Panneau gauche ── */}
      <article className={styles["auth-left"]}>
        <div className={styles["auth-logo"]}>
          <span className={styles["auth-logo-icon"]}>✦</span>
          <span className={styles["auth-logo-text"]}>CreaContenu</span>
        </div>

        <div className={styles["auth-header"]}>
          <h1 className="auth-title">
            {tab === "sign-in" && "Bon retour 👋"}
            {tab === "sign-up" && "Créez votre compte"}
            {tab === "forgot-password" && "Mot de passe oublié"}
            {tab === "reset-password" && "Réinitialiser"}
          </h1>
          <p className={styles["auth-subtitle"]}>
            {tab === "sign-in" && "Connectez-vous pour accéder à votre espace."}
            {tab === "sign-up" &&
              "Rejoignez des milliers de créateurs de contenu."}
            {tab === "forgot-password" &&
              "Entrez votre email pour recevoir un lien de réinitialisation."}
            {tab === "reset-password" &&
              "Choisissez un nouveau mot de passe sécurisé."}
          </p>
        </div>

        {isTabVisible && (
          <div
            className={styles["auth-tabs"]}
            role="tablist"
            aria-label="Mode d'authentification"
          >
            <button
              type="button"
              role="tab"
              className={`${styles["auth-tab"]} ${tab === "sign-in" ? styles["is-active"] : ""}`}
              onClick={() => setTab("sign-in")}
              aria-selected={tab === "sign-in"}
            >
              Connexion
            </button>
            <button
              type="button"
              role="tab"
              className={`${styles["auth-tab"]} ${tab === "sign-up" ? styles["is-active"] : ""}`}
              onClick={() => setTab("sign-up")}
              aria-selected={tab === "sign-up"}
            >
              Inscription
            </button>
            <span
              className={styles["auth-tab-slider"]}
              style={{
                transform:
                  tab === "sign-up" ? "translateX(100%)" : "translateX(0%)",
              }}
            />
          </div>
        )}

        <div className={styles["auth-form-wrapper"]}>
          {tab === "sign-in" && (
            <SignInForm onForgotPassword={() => setTab("forgot-password")} />
          )}
          {tab === "sign-up" && <SignUpForm />}
          {tab === "forgot-password" && (
            <ForgotPasswordForm onBackToSignIn={() => setTab("sign-in")} />
          )}
          {tab === "reset-password" && (
            <ResetPasswordForm onBackToSignIn={() => setTab("sign-in")} />
          )}
        </div>

        <p className={styles["auth-footer-note"]}>
          © 2026 CreaContenu — Tous droits réservés.
        </p>
      </article>

      {/* ── Panneau droit (décoratif) ── */}
      <aside className={styles["auth-right"]} aria-hidden="true">
        <div className={styles["auth-right-inner"]}>
          <div className={styles["auth-right-badge"]}>Nouveau ✦</div>
          <h2 className={styles["auth-right-title"]}>
            La façon la plus simple de gérer votre workflow de contenu
          </h2>
          <p className={styles["auth-right-subtitle"]}>
            Organisez, validez, publiez et suivez votre contenu depuis un seul
            tableau de bord intelligent.
          </p>

          {/* Mock UI Card */}
          <div className={styles["preview-card"]}>
            <div className={styles["preview-topbar"]}>
              <div className={styles["preview-dots"]}>
                <span className={`${styles["preview-dot"]} ${styles.red}`} />
                <span className={`${styles["preview-dot"]} ${styles.yellow}`} />
                <span className={`${styles["preview-dot"]} ${styles.green}`} />
              </div>
              <div className={styles["preview-bar-fake"]} />
            </div>
            <div className={styles["preview-grid"]}>
              <div className={`${styles["preview-block"]} ${styles.tall}`} />
              <div className={styles["preview-block"]} />
              <div className={styles["preview-block"]} />
              <div className={`${styles["preview-block"]} ${styles.wide}`} />
              <div className={styles["preview-block"]} />
              <div className={`${styles["preview-block"]} ${styles.tall}`} />
            </div>
          </div>

          {/* Stats row */}
          <div className={styles["auth-stats-row"]}>
            <div className={styles["auth-stat"]}>
              <span className={styles["auth-stat-value"]}>12k+</span>
              <span className={styles["auth-stat-label"]}>Créateurs</span>
            </div>
            <div className={styles["auth-stat-divider"]} />
            <div className={styles["auth-stat"]}>
              <span className={styles["auth-stat-value"]}>98%</span>
              <span className={styles["auth-stat-label"]}>Satisfaction</span>
            </div>
            <div className={styles["auth-stat-divider"]} />
            <div className={styles["auth-stat"]}>
              <span className={styles["auth-stat-value"]}>4.9★</span>
              <span className={styles["auth-stat-label"]}>Note moyenne</span>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
};
