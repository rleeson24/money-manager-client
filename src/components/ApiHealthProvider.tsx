import { useEffect, useState, type ReactNode } from "react";
import { USE_API } from "../config/api";
import {
  getApiHealthStatus,
  startApiHealthPolling,
  subscribeApiHealth,
} from "../services/apiHealth";
import "./ApiHealthProvider.css";

function ApiHealthLoading() {
  return (
    <div className="api-health-loading">
      <div className="api-health-loading__card">
        <h1 className="api-health-loading__title">Money Manager</h1>
        <p className="api-health-loading__message">
          Connecting to the database. This can take a minute after a long idle period.
        </p>
        <div className="api-health-loading__spinner" aria-hidden />
      </div>
    </div>
  );
}

function ApiHealthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState(getApiHealthStatus);

  useEffect(() => {
    const unsubscribe = subscribeApiHealth(setStatus);
    const stopPolling = startApiHealthPolling();
    return () => {
      unsubscribe();
      stopPolling();
    };
  }, []);

  if (!USE_API || status === "healthy") {
    return children;
  }

  return <ApiHealthLoading />;
}

export default ApiHealthProvider;
