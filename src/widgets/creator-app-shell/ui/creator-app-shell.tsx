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
import { LanguageSwitcher } from "../../language-switcher/ui/language-switcher";
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

  const [isMobileView, setIsMobileView] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(max-width: 1100px)").matches;
  });

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
    // use isMobileView state so changes in viewport trigger the effect
    const isMobile = isMobileView;

    // On desktop: ensure no transform remains from GSAP so sidebar sits in layout
    if (!isMobile) {
      if (sidebarRef.current) {
        gsap.set(sidebarRef.current, { x: 0, opacity: 1, overwrite: true });
        // remove inline transform to avoid subpixel offsets
        gsap.set(sidebarRef.current, { clearProps: "transform,opacity" });
      }
      return;
    }

    if (!sidebarRef.current) return;

    // Use pixel translation on mobile to guarantee full hidden state
    const sidebarWidth = Math.ceil(
      sidebarRef.current.getBoundingClientRect().width || 0,
    );

    gsap.set(sidebarRef.current, {
      x: isMenuOpen ? 0 : -sidebarWidth,
      opacity: isMenuOpen ? 1 : 0.9,
    });

    gsap.to(sidebarRef.current, {
      x: isMenuOpen ? 0 : -sidebarWidth,
      opacity: isMenuOpen ? 1 : 0.9,
      duration: 0.25,
      ease: "power2.out",
      overwrite: true,
    });
  }, [isMenuOpen, isMobileView]);

  // keep isMobileView in sync with viewport changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(max-width: 1100px)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobileView(Boolean(e.matches));
    };

    // set initial
    setIsMobileView(Boolean(mq.matches));

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    const onResize = () => {
      // recalc sidebar position/width when resizing on mobile
      if (!sidebarRef.current) return;
      if (!mq.matches) return;
      const sidebarWidth = Math.ceil(
        sidebarRef.current.getBoundingClientRect().width || 0,
      );
      gsap.set(sidebarRef.current, { x: isMenuOpen ? 0 : -sidebarWidth });
    };

    window.addEventListener("resize", onResize);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
      window.removeEventListener("resize", onResize);
    };
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
            <small>{t("shell.brandSubtitle")}</small>
          </span>
        </div>
        <nav className={styles.menu} aria-label={t("shell.mainNav")}>
          <button
            type="button"
            className={`${styles.menuItem} ${location.pathname === "/dashboard" ? styles.menuItemActive : ""}`}
            onClick={goToDashboard}
          >
            <HiOutlineSquares2X2 aria-hidden="true" />
            <span>{t("shell.dashboard")}</span>
          </button>
          <button
            type="button"
            className={`${styles.menuItem} ${location.pathname === "/account" ? styles.menuItemActive : ""}`}
            onClick={goToAccount}
          >
            <HiOutlineUserCircle aria-hidden="true" />
            <span>{t("shell.account")}</span>
          </button>
          <button
            type="button"
            className={`${styles.menuItem} ${location.pathname === "/videos" ? styles.menuItemActive : ""}`}
            onClick={goToVideos}
          >
            <HiOutlinePlayCircle aria-hidden="true" />
            <span>{t("shell.videos")}</span>
          </button>
        </nav>
        <div className={styles.sidebarFooter}>
          <button
            type="button"
            className={styles.sidebarProfile}
            onClick={goToAccount}
            aria-label={t("shell.openProfile")}
          >
            <span className={styles.sidebarAvatar}>
              <img
                src={avatarUrl}
                alt={t("shell.profileAlt", { name: displayName })}
              />
            </span>
            <span className={styles.sidebarProfileMeta}>
              <strong>{displayName}</strong>
              <small>{user?.email ?? t("shell.connectedAccount")}</small>
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
              aria-label={t("shell.openMenu")}
            >
              <HiBars3 aria-hidden="true" />
            </button>
            <div className={styles.pageTitleBlock}>
              <span className={styles.pageEyebrow}>
                <HiSparkles aria-hidden="true" />
                {t("shell.brandEyebrow")}
              </span>
              <h2>
                {location.pathname === "/account"
                  ? t("account.pageTitle")
                  : location.pathname === "/videos"
                    ? t("shell.videos")
                    : t("shell.dashboard")}
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
            <button
              type="button"
              className={styles.profileButton}
              onClick={goToAccount}
              aria-label={t("shell.goAccount")}
            >
              <span className={styles.profileAvatar}>
                <img
                  src={avatarUrl}
                  alt={t("shell.profileAlt", { name: displayName })}
                />
              </span>
              <span className={styles.profileContent}>
                <strong>{displayName}</strong>
                <small>{user?.email ?? t("shell.creatorAccountHint")}</small>
              </span>
            </button>
          </div>
        </header>
        <div ref={contentRef}>{children}</div>
      </section>
    </main>
  );
}
