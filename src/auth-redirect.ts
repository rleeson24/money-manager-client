import { initializeMsal, msalInstance } from "./auth/msalConfig";

async function handleAuthRedirect(): Promise<void> {
  if (window.parent !== window) {
    // Silent auth iframe: MSAL reads the response from this document.
    return;
  }

  if (!msalInstance) {
    window.location.replace(`${window.location.origin}/login`);
    return;
  }

  const result = await initializeMsal();
  if (result?.account) {
    window.location.replace(`${window.location.origin}/`);
    return;
  }

  window.location.replace(`${window.location.origin}/login`);
}

void handleAuthRedirect();
