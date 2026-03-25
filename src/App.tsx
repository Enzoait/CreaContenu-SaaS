import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./app/routes";
import { QueryProvider } from "./app/providers";
import { AuthBootstrap } from "./app/model";
import { useAppTheme } from "./shared/model";
import "./App.css";

function App() {
  const theme = useAppTheme();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthBootstrap>
          <AppRouter />
        </AuthBootstrap>
      </BrowserRouter>
    </QueryProvider>
  );
}

export default App;
