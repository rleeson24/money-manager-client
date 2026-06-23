import { useTheme, type Theme } from "../theme/ThemeProvider";
import "./SiteFooter.css";

function SiteFooter() {
  const { theme, setTheme } = useTheme();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <label className="site-footer__theme" htmlFor="theme-select">
          <span className="site-footer__label">Theme</span>
          <select
            id="theme-select"
            className="site-footer__select"
            value={theme}
            onChange={(event) => setTheme(event.target.value as Theme)}
            aria-label="Color theme"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>
    </footer>
  );
}

export default SiteFooter;
