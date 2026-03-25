import { useI18n } from "../../../shared/i18n";
import styles from "./language-switcher.module.scss";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className={styles.wrap} title={t("shell.language")}>
      <label className={styles.srOnly} htmlFor="app-locale-select">
        {t("shell.language")}
      </label>
      <select
        id="app-locale-select"
        className={styles.select}
        value={locale}
        onChange={(e) => setLocale(e.target.value as "fr" | "en")}
        aria-label={t("shell.language")}
      >
        <option value="fr">FR</option>
        <option value="en">EN</option>
      </select>
    </div>
  );
}
