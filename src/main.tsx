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
import ApiReadyProvider from "./components/ApiReadyProvider";
import { initializeMsal, msalInstance } from "./auth/msalConfig";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./index.css";

async function bootstrap() {
  // If the dev server still served the React shell for the auth redirect URI,
  // leave before MSAL consumes the hash. The trailing slash loads auth/redirect/index.html.
  if (window.location.pathname === "/auth/redirect") {
    window.location.replace(
      `${window.location.origin}/auth/redirect/${window.location.search}${window.location.hash}`
    );
    return;
  }

  await initializeMsal();

  const app = (
    <React.StrictMode>
      <ThemeProvider>
        <ApiReadyProvider>
          <App />
        </ApiReadyProvider>
      </ThemeProvider>
    </React.StrictMode>
  );

  ReactDOM.createRoot(document.getElementById("root")!).render(
    msalInstance ? <MsalProvider instance={msalInstance}>{app}</MsalProvider> : app
  );
}

bootstrap();
