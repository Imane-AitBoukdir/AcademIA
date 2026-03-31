import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

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
            Fonctionnalités
          </button>
          <button className="navbar-link" type="button" onClick={() => scrollTo("how-it-works")}>
            Comment ça marche
          </button>
          <button className="navbar-link" type="button" onClick={() => scrollTo("ai-tutor")}>
            Tuteur IA
          </button>
          <div className="navbar-divider" />
          <Link to="/signin" className="navbar-link" onClick={() => setOpen(false)}>
            Se Connecter
          </Link>
          <Link to="/signup" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
            S'Inscrire
          </Link>
        </div>
      </div>
    </nav>
  );
}
