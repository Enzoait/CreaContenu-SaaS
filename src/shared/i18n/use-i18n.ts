import { useCallback } from "react";
import {
  useLocaleStore,
  type AppLocale,
} from "../model/locale-store";
import { translate, type MessageKey } from "./messages";

export function useI18n() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string>) =>
      translate(locale, key, vars),
    [locale],
  );

  const localeTag = locale === "en" ? "en-GB" : "fr-FR";

  return { t, locale, setLocale, localeTag };
}

export type { AppLocale, MessageKey };
