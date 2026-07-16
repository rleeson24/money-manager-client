import { InteractionStatus } from "@azure/msal-browser";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useEffect, useState, type ReactNode } from "react";
import { USE_API } from "../config/api";
import { isAuthEnabled, msalInstance } from "../auth/msalConfig";
import {
  getApiHealthStatus,
  startApiHealthPolling,
  subscribeApiHealth,
  type ApiHealthStatus,
} from "../services/apiHealth";
import { setApiReady } from "../services/apiReady";
import "./ApiHealthProvider.css";

function ApiReadyLoading({ message }: { message: string }) {
  return (
    <div className="api-health-loading">
      <div className="api-health-loading__card">
        <h1 className="api-health-loading__title">Money Manager</h1>
        <p className="api-health-loading__message">{message}</p>
        <div className="api-health-loading__spinner" aria-hidden />
      </div>
    </div>
  );
}

function useHealthPolling(): ApiHealthStatus {
  const [healthStatus, setHealthStatus] = useState(getApiHealthStatus);

  useEffect(() => {
    if (!USE_API) {
      return;
    }

    const unsubscribe = subscribeApiHealth(setHealthStatus);
    const stopPolling = startApiHealthPolling();
    return () => {
      unsubscribe();
      stopPolling();
    };
  }, []);

  return healthStatus;
}

function ApiReadyWithoutAuth({ children }: { children: ReactNode }) {
  const healthStatus = useHealthPolling();

  useEffect(() => {
    setApiReady(!USE_API || healthStatus === "healthy");
    return () => setApiReady(false);
  }, [healthStatus]);

  if (!USE_API || healthStatus === "healthy") {
    return children;
  }

  return (
    <ApiReadyLoading message="Connecting to the database. This can take a minute after a long idle period." />
  );
}

function ApiReadyWithAuth({ children }: { children: ReactNode }) {
  const healthStatus = useHealthPolling();
  const { inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [msalIdleTimedOut, setMsalIdleTimedOut] = useState(false);

  const dbReady = healthStatus === "healthy";
  const msalIdle = inProgress === InteractionStatus.None;
  const msalReady = !isAuthenticated || msalIdle || msalIdleTimedOut;
  const canUseApp = dbReady && msalReady;

  useEffect(() => {
    if (!isAuthenticated || msalIdle) {
      setMsalIdleTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => setMsalIdleTimedOut(true), 5000);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, msalIdle]);

  useEffect(() => {
    setApiReady(canUseApp);
    return () => setApiReady(false);
  }, [canUseApp]);

  if (!dbReady) {
    return (
      <ApiReadyLoading message="Connecting to the database. This can take a minute after a long idle period." />
    );
  }

  if (isAuthenticated && !msalReady) {
    return <ApiReadyLoading message="Preparing your session..." />;
  }

  return children;
}

function ApiReadyProvider({ children }: { children: ReactNode }) {
  if (!USE_API) {
    return children;
  }

  if (isAuthEnabled && msalInstance) {
    return <ApiReadyWithAuth>{children}</ApiReadyWithAuth>;
  }

  return <ApiReadyWithoutAuth>{children}</ApiReadyWithoutAuth>;
}

export default ApiReadyProvider;
