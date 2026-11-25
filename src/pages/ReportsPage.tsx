import { NavLink, Outlet } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import "./ReportsPage.css";

const tabs = [{ to: "budget", label: "Budget" }] as const;

function ReportsPage() {
  return (
    <div className="reports-page">
      <PageHeader title="Reports" />
      <nav className="reports-page__tabs" aria-label="Reports">
        {tabs.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `reports-page__tab${isActive ? " reports-page__tab--active" : ""}`
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

export default ReportsPage;
