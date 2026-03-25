import { SignOutButton } from "../../../features/auth";
import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HiOutlineMenu, HiX } from "react-icons/hi";
import { useAuthStore, selectAuthUser } from "../../../shared/model";
import { useAccountAvatarDataUrl } from "../../../pages/account-page/model";
import { useI18n } from "../../../shared/i18n";
import { LanguageSwitcher } from "../../language-switcher";
import styles from "./creator-app-shell.module.scss";

type CreatorAppShellProps = {
  children: ReactNode;
  /** Contenu à droite dans la barre du haut (recherche, filtres rapides, etc.) */
  topBarTrailing?: ReactNode;
  /** Barre du haut simplifiée : avatar vers la gestion compte (ex. page /account) */
  accountTopBar?: boolean;
};

export function CreatorAppShell({
  children,
  topBarTrailing,
  accountTopBar,
}: CreatorAppShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const user = useAuthStore(selectAuthUser);
  const avatarDataUrl = useAccountAvatarDataUrl();
  const initial = user?.email?.[0]?.toUpperCase() ?? '?';

  const goToDashboard = () => {
    setIsMenuOpen(false);
    navigate("/dashboard");
  };

  const goToAccount = () => {
    setIsMenuOpen(false);
    navigate("/account");
  };

  const resolvedTrailing = accountTopBar ? (
    <button
      type="button"
      className={styles.profileButton}
      onClick={goToAccount}
      aria-label={t("shell.goAccount")}
    >
      {avatarDataUrl ? (
        <img
          className={styles.profileAvatarImg}
          src={avatarDataUrl}
          alt=""
        />
      ) : (
        <span className={styles.profileAvatar}>{initial}</span>
      )}
    </button>
  ) : (
    topBarTrailing
  );

  return (
    <main className={styles.shell}>
      {isMenuOpen ? (
        <button
          type="button"
          className={styles.mobileNavOverlay}
          onClick={() => setIsMenuOpen(false)}
          aria-label={t("shell.closeMenu")}
        />
      ) : null}
      <aside
        className={`${styles.sidebar} ${isMenuOpen ? styles.sidebarOpen : ""}`}
      >
        <button
          type="button"
          className={styles.mobileNavClose}
          onClick={() => setIsMenuOpen(false)}
          aria-label={t("shell.closeMenuBurger")}
        >
          <HiX aria-hidden="true" />
        </button>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>C</span>
          creacontenu
        </div>
        <nav className={styles.menu} aria-label={t("shell.mainNav")}>
          <button
            type="button"
            className={`${styles.menuItem} ${location.pathname === "/dashboard" ? styles.menuItemActive : ""}`}
            onClick={goToDashboard}
          >
            {t("shell.dashboard")}
          </button>
          <button
            type="button"
            className={`${styles.menuItem} ${location.pathname === "/account" ? styles.menuItemActive : ""}`}
            onClick={goToAccount}
          >
            {t("shell.account")}
          </button>
          <SignOutButton className={styles.menuItem} />
        </nav>
      </aside>

      <section className={styles.main}>
        <header className={styles.topBar}>
          <button
            type="button"
            className={styles.burger}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={t("shell.openMenu")}
          >
            <HiOutlineMenu aria-hidden="true" />
          </button>
          <h2>creacontenu</h2>
          <div className={styles.topBarRight}>
            <LanguageSwitcher />
            {resolvedTrailing}
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
