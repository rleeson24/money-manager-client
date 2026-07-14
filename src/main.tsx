/**
 * MAIN ENTRY POINT
 *
 * This is the first file that runs when your React app starts.
 * It's responsible for:
 * 1. Rendering your React app into the HTML page (index.html)
 * 2. Setting up the root of your React component tree
 *
 * Think of it as the "starting point" of your application.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import App from "./App.tsx";
import ApiHealthProvider from "./components/ApiHealthProvider";
import { initializeMsal, msalInstance } from "./auth/msalConfig";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./index.css";

async function bootstrap() {
  await initializeMsal();

  const app = (
    <React.StrictMode>
      <ThemeProvider>
        <ApiHealthProvider>
          <App />
        </ApiHealthProvider>
      </ThemeProvider>
    </React.StrictMode>
  );

  ReactDOM.createRoot(document.getElementById("root")!).render(
    msalInstance ? <MsalProvider instance={msalInstance}>{app}</MsalProvider> : app
  );
}

bootstrap();
