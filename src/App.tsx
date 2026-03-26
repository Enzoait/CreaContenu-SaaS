import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./app/routes";
import { QueryProvider } from "./app/providers";
import { AppErrorBoundary } from "./shared/ui/AppErrorBoundary";
import { AuthBootstrap } from "./app/model";
import { useAppTheme } from "./shared/model";
import { useLocaleStore } from "./shared/model/locale-store";
import "./App.css";

function App() {
  const theme = useAppTheme();
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute(
      "lang",
      locale === "en" ? "en" : "fr",
    );
  }, [locale]);

  return (
    <QueryProvider>
      <AppErrorBoundary>
        <BrowserRouter>
          <AuthBootstrap>
            <AppRouter />
          </AuthBootstrap>
        </BrowserRouter>
      </AppErrorBoundary>
    </QueryProvider>
  );
}

export default App;
