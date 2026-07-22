import { initializeMsal } from "./auth/msalConfig";

async function handleAuthRedirect(): Promise<void> {
  if (window.parent !== window) {
    // Silent auth iframe: MSAL reads the response from this document.
    return;
  }

  await initializeMsal();
  window.location.replace(`${window.location.origin}/`);
}

void handleAuthRedirect();
