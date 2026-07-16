import {
  BrowserAuthError,
  InteractionRequiredAuthError,
  type AuthenticationResult,
} from "@azure/msal-browser";
import { apiScopes, isAuthEnabled, msalInstance } from "./msalConfig";

let inFlightTokenRequest: Promise<string | undefined> | null = null;
let cachedAccessToken: string | null = null;
let cachedExpiresAt = 0;

function isInteractionInProgress(error: unknown): boolean {
  return (
    error instanceof BrowserAuthError &&
    error.errorCode === "interaction_in_progress"
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function storeCachedToken(result: AuthenticationResult) {
  cachedAccessToken = result.accessToken;
  cachedExpiresAt = result.expiresOn?.getTime() ?? Date.now() + 5 * 60_000;
}

function readCachedToken(): string | undefined {
  if (cachedAccessToken && cachedExpiresAt > Date.now() + 60_000) {
    return cachedAccessToken;
  }

  cachedAccessToken = null;
  cachedExpiresAt = 0;
  return undefined;
}

export function clearAccessTokenCache() {
  cachedAccessToken = null;
  cachedExpiresAt = 0;
}

async function acquireTokenOnce(): Promise<string | undefined> {
  if (!isAuthEnabled || !msalInstance) return undefined;

  const cached = readCachedToken();
  if (cached) {
    return cached;
  }

  const account =
    msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account) return undefined;

  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await msalInstance.acquireTokenSilent({
        scopes: apiScopes,
        account,
      });
      storeCachedToken(result);
      return result.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        await msalInstance.acquireTokenRedirect({
          scopes: apiScopes,
          account,
        });
        return undefined;
      }

      if (isInteractionInProgress(error) && attempt < maxAttempts - 1) {
        await delay(200 * (attempt + 1));
        continue;
      }

      throw error;
    }
  }

  return undefined;
}

/**
 * Acquires an access token for API calls. Concurrent callers share one in-flight
 * request so parallel API calls (e.g. Promise.all) do not trigger MSAL
 * interaction_in_progress errors.
 */
export async function getAccessToken(): Promise<string | undefined> {
  if (!isAuthEnabled || !msalInstance) return undefined;

  const cached = readCachedToken();
  if (cached) {
    return cached;
  }

  inFlightTokenRequest ??= acquireTokenOnce().finally(() => {
    inFlightTokenRequest = null;
  });

  return inFlightTokenRequest;
}
