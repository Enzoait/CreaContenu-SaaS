import { useI18n } from "../../../shared/i18n";
import styles from "./language-switcher.module.scss";

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={`${styles.group} ${className ?? ""}`}
      role="group"
      aria-label={t("shell.language")}
    >
      <button
        type="button"
        className={locale === "fr" ? styles.segmentActive : styles.segment}
        onClick={() => setLocale("fr")}
        aria-pressed={locale === "fr"}
        aria-label={t("shell.langFrAria")}
      >
        FR
      </button>
      <button
        type="button"
        className={locale === "en" ? styles.segmentActive : styles.segment}
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        aria-label={t("shell.langEnAria")}
      >
        EN
      </button>
    </div>
  );
}
