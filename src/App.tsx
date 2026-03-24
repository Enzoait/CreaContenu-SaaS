import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./app/routes";
import { QueryProvider } from "./app/providers";
import { AuthBootstrap } from "./app/model";
import "./App.css";

function App() {
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
