/**
 * APP LAYOUT
 *
 * Wraps all page content with the site header.
 */

import { Outlet } from "react-router-dom";
import SiteHeader from "./SiteHeader";
import "../App.css";

function AppLayout() {
  return (
    <div className="app-layout">
      <SiteHeader />
      <main className="app-layout__main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
