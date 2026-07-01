/**
 * SITE HEADER
 *
 * Global site header with navigation menu for main app sections.
 */

import { useEffect, useId, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { USE_API } from "../config/api";
import { isAuthEnabled } from "../auth/msalConfig";
import AuthUserMenu from "./AuthUserMenu";
import "./SiteHeader.css";

const iconEdit = (
  <svg className="site-header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const iconChatGPT = (
  <svg className="site-header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <path d="M9 9h6M9 13h4M9 17h2" />
    <circle cx="9" cy="9" r="1" fill="currentColor" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
  </svg>
);

const iconCreditCard = (
  <svg className="site-header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const iconAdministration = (
  <svg className="site-header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const iconSearch = (
  <svg className="site-header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const iconMenu = (
  <svg className="site-header__menu-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="20" y2="17" />
  </svg>
);

const iconClose = (
  <svg className="site-header__menu-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

const navItems = [
  { to: "/expenses/add", label: "Add Expense", icon: iconEdit },
  { to: "/expenses", label: "Edit Expenses", icon: iconChatGPT, end: true },
  { to: "/expenses/search", label: "Search Expenses", icon: iconSearch },
  { to: "/expenses/creditcard", label: "Credit Card Expenses", icon: iconCreditCard },
  { to: "/administration", label: "Administration", icon: iconAdministration },
] as const;

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navId = useId();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    function onPointerDown(event: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <header className="site-header" ref={headerRef}>
      <div className="site-header__inner">
        <NavLink
          to="/"
          className="site-header__brand"
          onClick={() => setMenuOpen(false)}
        >
          Money Manager
        </NavLink>

        <nav
          id={navId}
          className={`site-header__nav${menuOpen ? " site-header__nav--open" : ""}`}
          aria-label="Main navigation"
        >
          <ul className="site-header__menu">
            {navItems.map(({ to, label, icon, ...linkProps }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  {...linkProps}
                  className={({ isActive }) =>
                    `site-header__link ${isActive ? "site-header__link--active" : ""}`
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  {icon}
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__end">
          {USE_API && isAuthEnabled ? <AuthUserMenu /> : null}
          <button
            type="button"
            className="site-header__menu-toggle"
            aria-expanded={menuOpen}
            aria-controls={navId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? iconClose : iconMenu}
          </button>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
