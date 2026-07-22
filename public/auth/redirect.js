// MSAL silent auth uses this page in a hidden iframe — do not boot the SPA there.
// After interactive login, forward auth response to the app so handleRedirectPromise can run.
if (window.parent !== window) {
  // Hidden iframe: MSAL reads the hash/query from this document.
} else if (window.location.search || window.location.hash) {
  window.location.replace(
    window.location.origin + "/" + window.location.search + window.location.hash
  );
} else {
  window.location.replace(window.location.origin + "/");
}
