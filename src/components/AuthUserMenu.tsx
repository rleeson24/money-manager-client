import { useAccount, useMsal } from "@azure/msal-react";
import "./SiteHeader.css";

function AuthUserMenu() {
  const { instance } = useMsal();
  const account = useAccount();

  const displayName = account?.name ?? account?.username ?? "Signed in";

  const handleSignOut = () => {
    instance.logoutRedirect();
  };

  return (
    <div className="site-header__user">
      <span className="site-header__user-name">{displayName}</span>
      <button
        type="button"
        className="site-header__sign-out"
        onClick={handleSignOut}
      >
        Sign out
      </button>
    </div>
  );
}

export default AuthUserMenu;
