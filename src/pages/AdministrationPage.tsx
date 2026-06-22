import { NavLink, Outlet } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import "./AdministrationPage.css";

const tabs = [
  { to: "import", label: "Banking Import" },
  { to: "categories", label: "Categories" },
] as const;

function AdministrationPage() {
  return (
    <div className="administration-page">
      <PageHeader title="Administration" />
      <nav className="administration-page__tabs" aria-label="Administration sections">
        {tabs.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `administration-page__tab${isActive ? " administration-page__tab--active" : ""}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

export default AdministrationPage;
