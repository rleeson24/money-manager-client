import { resolve } from "node:path";
import type { Connect, Plugin } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Azure's redirect URI is /auth/redirect (no trailing slash). Vite's HTML
// fallback only maps a directory index when the path ends with /, and otherwise
// serves the React app. That app has no route for this URL, so the page stays blank.
function authRedirectPage(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, _res, next) => {
    if (req.url) {
      const queryIndex = req.url.indexOf("?");
      const pathname = queryIndex === -1 ? req.url : req.url.slice(0, queryIndex);
      if (pathname === "/auth/redirect") {
        const search = queryIndex === -1 ? "" : req.url.slice(queryIndex);
        req.url = `/auth/redirect/${search}`;
      }
    }
    next();
  };

  return {
    name: "auth-redirect-page",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), authRedirectPage()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        redirect: resolve(__dirname, "auth/redirect/index.html"),
      },
    },
  },
});
