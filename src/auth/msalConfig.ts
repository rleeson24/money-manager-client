import {
  Configuration,
  LogLevel,
  PublicClientApplication,
} from "@azure/msal-browser";

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID ?? "";
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID ?? "";
const apiScope = import.meta.env.VITE_AZURE_API_SCOPE ?? "";

export const isAuthEnabled =
  import.meta.env.VITE_USE_API === "true" &&
  clientId.length > 0 &&
  tenantId.length > 0 &&
  apiScope.length > 0;

export const apiScopes = apiScope ? [apiScope] : [];

export const loginScopes = ["User.Read", ...apiScopes];

const redirectUri = `${window.location.origin}/auth/redirect`;

const msalConfiguration: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
    },
  },
};

export const msalInstance = isAuthEnabled
  ? new PublicClientApplication(msalConfiguration)
  : null;

export async function initializeMsal(): Promise<void> {
  if (!msalInstance) return;

  await msalInstance.initialize();
  const result = await msalInstance.handleRedirectPromise();
  if (result?.account) {
    msalInstance.setActiveAccount(result.account);
    return;
  }

  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 1) {
    msalInstance.setActiveAccount(accounts[0]);
  }
}
