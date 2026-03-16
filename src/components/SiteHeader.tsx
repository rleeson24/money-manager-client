/**
 * SITE HEADER
 *
 * Global site header with navigation menu for main app sections.
 */

import { NavLink } from "react-router-dom";
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

const iconBanking = (
  <svg className="site-header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 21h18" />
    <path d="M3 10h18" />
    <path d="M5 6l7-3 7 3" />
    <path d="M4 10v11" />
    <path d="M20 10v11" />
    <path d="M8 14v3" />
    <path d="M12 14v3" />
    <path d="M16 14v3" />
  </svg>
);

const navItems = [
  { to: "/expenses/edit", label: "Edit Expenses", icon: iconEdit },
  { to: "/expenses/chatgptedit", label: "ChatGPT Edit Expenses", icon: iconChatGPT },
  { to: "/expenses/creditcard", label: "Credit Card Expenses", icon: iconCreditCard },
  { to: "/import", label: "Banking Import", icon: iconBanking },
] as const;

function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <NavLink to="/" className="site-header__brand">
          Money Manager
        </NavLink>
        <nav className="site-header__nav" aria-label="Main navigation">
          <ul className="site-header__menu">
            {navItems.map(({ to, label, icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `site-header__link ${isActive ? "site-header__link--active" : ""}`
                  }
                >
                  {icon}
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default SiteHeader;
