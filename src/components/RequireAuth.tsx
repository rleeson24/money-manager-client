import { Outlet } from "react-router-dom";
import { USE_API } from "../config/api";
import { isAuthEnabled } from "../auth/msalConfig";
import AuthConfigMissing from "./AuthConfigMissing";
import RequireAuthWithMsal from "./RequireAuthWithMsal";

/**
 * Protects routes when calling the real API with Azure AD configured.
 * Mock mode (VITE_USE_API=false) bypasses authentication.
 */
function RequireAuth() {
  if (!USE_API) {
    return <Outlet />;
  }

  if (!isAuthEnabled) {
    return <AuthConfigMissing />;
  }

  return <RequireAuthWithMsal />;
}

export default RequireAuth;
