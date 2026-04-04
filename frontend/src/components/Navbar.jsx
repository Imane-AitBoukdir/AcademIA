import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../i18n";

export default function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const scrollTo = (id) => {
    setOpen(false);
    if (location.pathname !== "/") return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">AcademIA</Link>

        <button
          className="mobile-toggle"
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className={`navbar-links${open ? " open" : ""}`}>
          <button className="navbar-link" type="button" onClick={() => scrollTo("features")}>
            {t("nav.features")}
          </button>
          <button className="navbar-link" type="button" onClick={() => scrollTo("how-it-works")}>
            {t("nav.howItWorks")}
          </button>
          <button className="navbar-link" type="button" onClick={() => scrollTo("ai-tutor")}>
            {t("nav.aiTutor")}
          </button>
          <div className="navbar-divider" />
          <Link to="/signin" className="navbar-link" onClick={() => setOpen(false)}>
            {t("nav.signIn")}
          </Link>
          <Link to="/signup" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
            {t("nav.signUp")}
          </Link>
        </div>
      </div>
    </nav>
  );
}
