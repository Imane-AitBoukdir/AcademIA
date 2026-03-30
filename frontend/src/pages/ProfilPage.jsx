import { motion } from "framer-motion";
import { Mail, Menu, Phone, Save, User } from "lucide-react";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { getSpecialtiesForSchoolLevel, getSpecialtyById, lyceeSpecialties } from "../lib/curriculum";

function getUser() {
  return JSON.parse(localStorage.getItem("academiaUser") || "null") || {
    prenom: "", nom: "", email: "", tel: "", age: "",
    niveauScolaire: "primaire", specialty: "",
  };
}

const levelLabels = {
  primaire: "Primaire",
  college: "Collège",
  lycee: "Lycée",
};

export default function ProfilPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(getUser);
  const [saved, setSaved] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setUser((u) => {
      const next = { ...u, [name]: value };
      if (name === "niveauScolaire") {
        next.specialty = "";
      }
      return next;
    });
    setSaved(false);
  };

  const onSave = (e) => {
    e.preventDefault();
    localStorage.setItem("academiaUser", JSON.stringify(user));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const initials =
    (user.prenom?.[0] || "").toUpperCase() + (user.nom?.[0] || "").toUpperCase() || "?";

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="dashboard-main">
        <header className="course-top-bar" style={{ marginBottom: "1.5rem" }}>
          <button
            className="mobile-sidebar-toggle"
            type="button"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>
          <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>Mon Profil</h1>
        </header>

        <motion.div
          style={{ maxWidth: 640, margin: "0 auto" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Avatar */}
          <div className="profil-avatar-section">
            <div className="profil-avatar">{initials}</div>
            <div>
              <h2 className="profil-name">{user.prenom} {user.nom}</h2>
              <p className="profil-level">{levelLabels[user.niveauScolaire] || user.niveauScolaire}
                {user.specialty ? ` — ${getSpecialtyById(user.specialty)?.label || user.specialty.replaceAll("_", " ")}` : ""}
              </p>
            </div>
          </div>

          {/* Form */}
          <form className="profil-form" onSubmit={onSave}>
            <div className="profil-field-row">
              <label className="profil-label">
                <User size={15} /> Prénom
                <input name="prenom" value={user.prenom} onChange={onChange} className="profil-input" />
              </label>
              <label className="profil-label">
                <User size={15} /> Nom
                <input name="nom" value={user.nom} onChange={onChange} className="profil-input" />
              </label>
            </div>

            <label className="profil-label">
              <Mail size={15} /> E-mail
              <input name="email" type="email" value={user.email} onChange={onChange} className="profil-input" />
            </label>

            <div className="profil-field-row">
              <label className="profil-label">
                <Phone size={15} /> Téléphone
                <input name="tel" value={user.tel} onChange={onChange} className="profil-input" />
              </label>
              <label className="profil-label">
                Âge
                <input name="age" type="number" value={user.age} onChange={onChange} className="profil-input" min="5" max="99" />
              </label>
            </div>

            <label className="profil-label">
              Niveau scolaire
              <select name="niveauScolaire" value={user.niveauScolaire} onChange={onChange} className="profil-input">
                <option value="primaire">Primaire</option>
                <option value="college">Collège</option>
                <option value="lycee">Lycée</option>
              </select>
            </label>

            {user.niveauScolaire === "primaire" && (
              <label className="profil-label">
                Année
                <select name="specialty" value={user.specialty} onChange={onChange} className="profil-input">
                  <option value="">— Sélectionnez votre année —</option>
                  {getSpecialtiesForSchoolLevel("primaire").map((s) => (
                    <option key={s.id} value={s.id} disabled={s.enabled === false}>
                      {s.label}{s.enabled === false ? " (Bientôt disponible)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {user.niveauScolaire === "college" && (
              <label className="profil-label">
                Année
                <select name="specialty" value={user.specialty} onChange={onChange} className="profil-input">
                  <option value="">— Sélectionnez votre année —</option>
                  {getSpecialtiesForSchoolLevel("college").map((s) => (
                    <option key={s.id} value={s.id} disabled={s.enabled === false}>
                      {s.label}{s.enabled === false ? " (Bientôt disponible)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {user.niveauScolaire === "lycee" && (
              <label className="profil-label">
                Filière
                <select name="specialty" value={user.specialty} onChange={onChange} className="profil-input">
                  <option value="">— Sélectionnez votre filière —</option>
                  {lyceeSpecialties.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.enabled === false}>
                      {s.label} — {s.labelAr}{s.enabled === false ? " (Bientôt disponible)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button type="submit" className="profil-save-btn">
              <Save size={16} />
              {saved ? "Enregistré !" : "Enregistrer"}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
