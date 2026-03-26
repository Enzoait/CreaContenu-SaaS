import { SignOutButton } from "../../../features/auth";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { useCurrentUserDataQuery } from "../../../entities/user";
import {
  HiBars3,
  HiMoon,
  HiOutlinePlayCircle,
  HiOutlineSquares2X2,
  HiOutlineUserCircle,
  HiSun,
  HiSparkles,
  HiXMark,
} from "react-icons/hi2";
import {
  useAuthStore,
  selectAuthUser,
  useAppTheme,
  useToggleAppTheme,
} from "../../../shared/model";
import { useI18n } from "../../../shared/i18n";
import styles from "./creator-app-shell.module.scss";

type CreatorAppShellProps = {
  children: ReactNode;
  topBarTrailing?: ReactNode;
  accountTopBar?: boolean;
};

export function CreatorAppShell({
  children,
  topBarTrailing,
  accountTopBar,
}: CreatorAppShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const shellRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const topBarRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const user = useAuthStore(selectAuthUser);
  const theme = useAppTheme();
  const toggleTheme = useToggleAppTheme();
  const { data: userData } = useCurrentUserDataQuery();
  const displayName = user?.email?.split("@")[0] ?? "Creator";
  const generatedAvatarUrl = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(
    displayName,
  )}&radius=50`;
  const avatarUrl = userData?.profilePicture?.trim() || generatedAvatarUrl;

  const goToDashboard = () => {
    setIsMenuOpen(false);
    navigate("/dashboard");
  };

  const goToAccount = () => {
    setIsMenuOpen(false);
    navigate("/account");
  };

  const goToVideos = () => {
    setIsMenuOpen(false);
    navigate("/videos");
  };

  useLayoutEffect(() => {
    if (!shellRef.current) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const cleanups: Array<() => void> = [];
    const context = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(sidebarRef.current, {
          x: -24,
          opacity: 0,
          duration: 0.52,
        })
        .from(
          topBarRef.current,
          {
            y: -18,
            opacity: 0,
            duration: 0.45,
          },
          "<0.1",
        )
        .from(
          "." + styles.menuItem,
          {
            y: 10,
            opacity: 0,
            duration: 0.34,
            stagger: 0.05,
          },
          "<0.08",
        )
        .from(
          contentRef.current,
          {
            y: 20,
            opacity: 0,
            duration: 0.45,
          },
          "<0.05",
        );

      gsap.to("." + styles.pageEyebrow, {
        y: -2,
        duration: 1.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      const navButtons =
        sidebarRef.current?.querySelectorAll<HTMLButtonElement>(
          `.${styles.menuItem}`,
        ) ?? [];
      navButtons.forEach((buttonElement) => {
        const onEnter = () => {
          gsap.killTweensOf(buttonElement);
          gsap.to(buttonElement, {
            x: 4,
            duration: 0.2,
            ease: "power2.out",
            overwrite: "auto",
          });
        };

        const onLeave = () => {
          gsap.killTweensOf(buttonElement);
          gsap.to(buttonElement, {
            x: 0,
            duration: 0.2,
            ease: "power2.out",
            overwrite: "auto",
          });
        };

        buttonElement.addEventListener("mouseenter", onEnter);
        buttonElement.addEventListener("mouseleave", onLeave);

        cleanups.push(() => {
          buttonElement.removeEventListener("mouseenter", onEnter);
          buttonElement.removeEventListener("mouseleave", onLeave);
        });
      });
    }, shellRef);

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      context.revert();
    };
  }, []);

  useEffect(() => {
    const isReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (isReducedMotion) {
      return;
    }

    gsap.fromTo(
      "." + styles.sidebar,
      { x: isMenuOpen ? -12 : 0, opacity: isMenuOpen ? 0.9 : 1 },
      {
        x: 0,
        opacity: 1,
        duration: 0.25,
        ease: "power2.out",
      },
    );
  }, [isMenuOpen]);

  const resolvedTrailing = accountTopBar ? null : topBarTrailing;

  return (
    <main ref={shellRef} className={styles.shell}>
      {isMenuOpen ? (
        <button
          type="button"
          className={styles.mobileNavOverlay}
          onClick={() => setIsMenuOpen(false)}
          aria-label={t("shell.closeMenu")}
        />
      ) : null}
      <aside
        ref={sidebarRef}
        className={`${styles.sidebar} ${isMenuOpen ? styles.sidebarOpen : ""}`}
      >
        <button
          type="button"
          className={styles.mobileNavClose}
          onClick={() => setIsMenuOpen(false)}
          aria-label={t("shell.closeMenuBurger")}
        >
          <HiXMark aria-hidden="true" />
        </button>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>C</span>
          <span className={styles.brandText}>
            <strong>CreaContenu</strong>
            <small>Creator workspace</small>
          </span>
        </div>
        <nav className={styles.menu} aria-label={t("shell.mainNav")}>
          <button
            type="button"
            className={`${styles.menuItem} ${location.pathname === "/dashboard" ? styles.menuItemActive : ""}`}
            onClick={goToDashboard}
          >
            <HiOutlineSquares2X2 aria-hidden="true" />
            <span>Tableau de bord</span>
          </button>
          <button
            type="button"
            className={`${styles.menuItem} ${location.pathname === "/account" ? styles.menuItemActive : ""}`}
            onClick={goToAccount}
          >
            <HiOutlineUserCircle aria-hidden="true" />
            <span>Gestion utilisateur</span>
          </button>
          <button
            type="button"
            className={`${styles.menuItem} ${location.pathname === "/videos" ? styles.menuItemActive : ""}`}
            onClick={goToVideos}
          >
            <HiOutlinePlayCircle aria-hidden="true" />
            <span>Mes videos</span>
          </button>
        </nav>
        <div className={styles.sidebarFooter}>
          <button
            type="button"
            className={styles.sidebarProfile}
            onClick={goToAccount}
            aria-label="Ouvrir le profil"
          >
            <span className={styles.sidebarAvatar}>
              <img src={avatarUrl} alt={`Profil de ${displayName}`} />
            </span>
            <span className={styles.sidebarProfileMeta}>
              <strong>{displayName}</strong>
              <small>{user?.email ?? "Compte connecté"}</small>
            </span>
          </button>
          <SignOutButton
            className={`${styles.menuItem} ${styles.signOutItem}`}
          />
        </div>
      </aside>

      <section className={styles.main}>
        <header ref={topBarRef} className={styles.topBar}>
          <div className={styles.topBarStart}>
            <button
              type="button"
              className={styles.burger}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Ouvrir le menu"
            >
              <HiBars3 aria-hidden="true" />
            </button>
            <div className={styles.pageTitleBlock}>
              <span className={styles.pageEyebrow}>
                <HiSparkles aria-hidden="true" />
                Creator OS
              </span>
              <h2>
                {location.pathname === "/account"
                  ? "Mon profil"
                  : location.pathname === "/videos"
                    ? "Mes videos"
                    : "Tableau de bord"}
              </h2>
            </div>
          </div>
          <div className={styles.topBarRight}>
            {resolvedTrailing ? (
              <div className={styles.topBarTrailing}>{resolvedTrailing}</div>
            ) : null}
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Activer le mode clair"
                  : "Activer le mode sombre"
              }
            >
              {theme === "dark" ? (
                <HiSun aria-hidden="true" />
              ) : (
                <HiMoon aria-hidden="true" />
              )}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <button
              type="button"
              className={styles.profileButton}
              onClick={goToAccount}
              aria-label="Gestion utilisateur"
            >
              <span className={styles.profileAvatar}>
                <img src={avatarUrl} alt={`Profil de ${displayName}`} />
              </span>
              <span className={styles.profileContent}>
                <strong>{displayName}</strong>
                <small>{user?.email ?? "Compte créateur"}</small>
              </span>
            </button>
          </div>
        </header>
        <div ref={contentRef}>{children}</div>
      </section>
    </main>
  );
}
