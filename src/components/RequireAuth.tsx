import { Outlet } from "react-router-dom";
import { USE_API } from "../config/api";
import { isAuthEnabled } from "../auth/msalConfig";
import RequireAuthWithMsal from "./RequireAuthWithMsal";

/**
 * Protects routes when calling the real API with Azure AD configured.
 * Mock mode (VITE_USE_API=false) bypasses authentication.
 */
function RequireAuth() {
  if (!USE_API || !isAuthEnabled) {
    return <Outlet />;
  }

  return <RequireAuthWithMsal />;
}

export default RequireAuth;
