import { useEffect } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthEnabled, loginScopes } from "../auth/msalConfig";
import { USE_API } from "../config/api";
import "./LoginPage.css";

function LoginPage() {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ?? "/expenses/edit";

  useEffect(() => {
    if (!isAuthEnabled || !USE_API) return;
    if (isAuthenticated) return;

    instance
      .handleRedirectPromise()
      .then((result) => {
        if (result?.account) {
          instance.setActiveAccount(result.account);
        }
      })
      .catch((error) => {
        console.error("MSAL redirect handling failed:", error);
      });
  }, [instance, isAuthenticated]);

  if (!USE_API || !isAuthEnabled) {
    return <Navigate to="/" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSignIn = () => {
    instance.loginRedirect({ scopes: loginScopes });
  };

  return (
    <div className="login-page">
      <div className="login-page__card">
        <h1 className="login-page__title">Money Manager</h1>
        <p className="login-page__subtitle">
          Sign in with your Microsoft account to manage expenses.
        </p>
        <button type="button" className="login-page__button" onClick={handleSignIn}>
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
