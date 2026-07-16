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
    (location.state as { from?: string } | null)?.from ?? "/expenses/add";

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
