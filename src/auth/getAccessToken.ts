import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { apiScopes, isAuthEnabled, msalInstance } from "./msalConfig";

/**
 * Acquires an access token for API calls. Returns undefined when auth is disabled
 * or a redirect is in progress.
 */
export async function getAccessToken(): Promise<string | undefined> {
  if (!isAuthEnabled || !msalInstance) return undefined;

  const account =
    msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account) return undefined;

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
    throw error;
  }
}
