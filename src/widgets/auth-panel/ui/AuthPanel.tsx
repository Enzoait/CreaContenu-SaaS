import { useEffect, useState } from "react";
import { HiMoon, HiSun } from "react-icons/hi2";
import {
  ForgotPasswordForm,
  ResetPasswordForm,
  SignInForm,
  SignUpForm,
} from "../../../features/auth";
import { useI18n } from "../../../shared/i18n";
import { useAppTheme, useToggleAppTheme } from "../../../shared/model";
import { LanguageSwitcher } from "../../language-switcher";
import styles from "./AuthPanel.module.scss";

type AuthTab = "sign-in" | "sign-up" | "forgot-password" | "reset-password";

type AuthPanelProps = {
  initialTab?: AuthTab;
};

export const AuthPanel = ({ initialTab = "sign-in" }: AuthPanelProps) => {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const { t } = useI18n();
  const theme = useAppTheme();
  const toggleTheme = useToggleAppTheme();

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const isTabVisible = tab === "sign-in" || tab === "sign-up";

  return (
    <section className={styles["auth-shell"]}>
      <div
        className={styles["auth-toolbar"]}
        role="toolbar"
        aria-label={t("auth.toolbarAria")}
      >
        <button
          type="button"
          className={styles["auth-theme-toggle"]}
          onClick={toggleTheme}
          aria-label={
            theme === "dark"
              ? t("shell.themeSwitchLight")
              : t("shell.themeSwitchDark")
          }
        >
          {theme === "dark" ? (
            <HiSun aria-hidden="true" />
          ) : (
            <HiMoon aria-hidden="true" />
          )}
          <span>
            {theme === "dark"
              ? t("shell.themeShortLight")
              : t("shell.themeShortDark")}
          </span>
        </button>
        <LanguageSwitcher />
      </div>

      <article className={styles["auth-left"]}>
        <div className={styles["auth-logo"]}>
          <span className={styles["auth-logo-icon"]}>✦</span>
          <span className={styles["auth-logo-text"]}>CreaContenu</span>
        </div>

        <div className={styles["auth-header"]}>
          <h1 className="auth-title">
            {tab === "sign-in" && t("auth.titleSignIn")}
            {tab === "sign-up" && t("auth.titleSignUp")}
            {tab === "forgot-password" && t("auth.titleForgotPassword")}
            {tab === "reset-password" && t("auth.titleResetPassword")}
          </h1>
          <p className={styles["auth-subtitle"]}>
            {tab === "sign-in" && t("auth.subtitleSignIn")}
            {tab === "sign-up" && t("auth.subtitleSignUp")}
            {tab === "forgot-password" && t("auth.subtitleForgotPassword")}
            {tab === "reset-password" && t("auth.subtitleResetPassword")}
          </p>
        </div>

        {isTabVisible && (
          <div
            className={styles["auth-tabs"]}
            role="tablist"
            aria-label={t("auth.tabListAria")}
          >
            <button
              type="button"
              role="tab"
              className={`${styles["auth-tab"]} ${tab === "sign-in" ? styles["is-active"] : ""}`}
              onClick={() => setTab("sign-in")}
              aria-selected={tab === "sign-in"}
            >
              {t("auth.tabSignIn")}
            </button>
            <button
              type="button"
              role="tab"
              className={`${styles["auth-tab"]} ${tab === "sign-up" ? styles["is-active"] : ""}`}
              onClick={() => setTab("sign-up")}
              aria-selected={tab === "sign-up"}
            >
              {t("auth.tabSignUp")}
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

        <p className={styles["auth-footer-note"]}>{t("auth.footerCopyright")}</p>
      </article>

      <aside className={styles["auth-right"]} aria-hidden="true">
        <div className={styles["auth-right-inner"]}>
          <div className={styles["auth-right-badge"]}>{t("auth.promoBadge")}</div>
          <h2 className={styles["auth-right-title"]}>
            {t("auth.promoTitle")}
          </h2>
          <p className={styles["auth-right-subtitle"]}>
            {t("auth.promoSubtitle")}
          </p>

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

          <div className={styles["auth-stats-row"]}>
            <div className={styles["auth-stat"]}>
              <span className={styles["auth-stat-value"]}>12k+</span>
              <span className={styles["auth-stat-label"]}>
                {t("auth.statCreators")}
              </span>
            </div>
            <div className={styles["auth-stat-divider"]} />
            <div className={styles["auth-stat"]}>
              <span className={styles["auth-stat-value"]}>98%</span>
              <span className={styles["auth-stat-label"]}>
                {t("auth.statSatisfaction")}
              </span>
            </div>
            <div className={styles["auth-stat-divider"]} />
            <div className={styles["auth-stat"]}>
              <span className={styles["auth-stat-value"]}>4.9★</span>
              <span className={styles["auth-stat-label"]}>
                {t("auth.statRating")}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
};
