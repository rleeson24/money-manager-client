import { getAccessToken } from "./getAccessToken";
import { isAuthEnabled } from "./msalConfig";
import { USE_API } from "../config/api";

/**
 * Returns Authorization headers for API calls. Redirects to login when auth is
 * required but no token can be acquired.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!USE_API || !isAuthEnabled) {
    return {};
  }

  const token = await getAccessToken();
  if (!token) {
    window.location.assign("/login");
    throw new Error("Not authenticated");
  }

  return { Authorization: `Bearer ${token}` };
}
