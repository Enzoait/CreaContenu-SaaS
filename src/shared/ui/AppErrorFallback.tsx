import { useI18n } from "../i18n/use-i18n";

export function AppErrorFallback() {
  const { t } = useI18n();
  return (
    <div className="layout-center">
      <div className="stack" role="alert" style={{ maxWidth: 420 }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>
          {t("videos.errorAlertTitle")}
        </h1>
        <p style={{ margin: 0, color: "var(--muted-foreground, #555)" }}>
          {t("app.errorBoundaryHint")}
        </p>
        <button type="button" onClick={() => window.location.reload()}>
          {t("app.reloadPage")}
        </button>
      </div>
    </div>
  );
}
