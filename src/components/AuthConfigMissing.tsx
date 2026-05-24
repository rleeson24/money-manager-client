import "./AuthConfigMissing.css";

function AuthConfigMissing() {
  return (
    <div className="auth-config-missing">
      <div className="auth-config-missing__card">
        <h1 className="auth-config-missing__title">Azure AD not configured</h1>
        <p>
          API mode is enabled (<code>VITE_USE_API=true</code>) but Azure AD
          environment variables are missing.
        </p>
        <p>Set these in <code>.env.local</code>:</p>
        <ul>
          <li><code>VITE_AZURE_CLIENT_ID</code></li>
          <li><code>VITE_AZURE_TENANT_ID</code></li>
          <li><code>VITE_AZURE_API_SCOPE</code></li>
        </ul>
        <p>
          See{" "}
          <code>money-manager-api/docs/azure-ad-setup.md</code> for setup steps.
        </p>
      </div>
    </div>
  );
}

export default AuthConfigMissing;
