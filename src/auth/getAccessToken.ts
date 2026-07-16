import {
  BrowserAuthError,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import { apiScopes, isAuthEnabled, msalInstance } from "./msalConfig";

let inFlightTokenRequest: Promise<string | undefined> | null = null;

function isInteractionInProgress(error: unknown): boolean {
  return (
    error instanceof BrowserAuthError &&
    error.errorCode === "interaction_in_progress"
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireTokenOnce(): Promise<string | undefined> {
  if (!isAuthEnabled || !msalInstance) return undefined;

  await msalInstance.handleRedirectPromise();

  const account =
    msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account) return undefined;

  const maxAttempts = 8;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await msalInstance.acquireTokenSilent({
        scopes: apiScopes,
        account,
      });
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
        await msalInstance.handleRedirectPromise();
        await delay(150 * (attempt + 1));
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

  inFlightTokenRequest ??= acquireTokenOnce().finally(() => {
    inFlightTokenRequest = null;
  });

  return inFlightTokenRequest;
}
