import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { useLanguage } from "../i18n";
import { getSpecialtiesForSchoolLevel, lyceeSpecialties } from "../lib/curriculum";

const initialForm = {
  nom: "",
  prenom: "",
  niveauScolaire: "primaire",
  specialty: "",
  tel: "",
  email: "",
  age: "",
  password: "",
};

export default function SignUpPage() {
  const [form, setForm] = useState(initialForm);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Reset specialty when switching level
      if (name === "niveauScolaire") {
        next.specialty = "";
      }
      return next;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        const detail = data.detail;
        if (Array.isArray(detail)) {
          setError(detail.map((e) => e.msg).join(", "));
        } else {
          setError(detail || t("auth.signUpFailed"));
        }
        return;
      }
      const user = await res.json();
      localStorage.setItem("academiaUser", JSON.stringify(user));
      navigate("/dashboard");
    } catch {
      setError(t("auth.serverError"));
    }
  };

  return (
    <div className="auth-page">
      <motion.form
        className="auth-card wide"
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="auth-header">
          <h1>{t("auth.createAccount")}</h1>
          <p>{t("auth.signUpSubtitle")}</p>
          {error && <p style={{ color: "#e53e3e", marginTop: 8 }}>{error}</p>}
        </div>

        <div className="form-grid form-two-cols">
          <div className="form-group">
            <label className="form-label" htmlFor="prenom">{t("profile.firstName")}</label>
            <input
              id="prenom"
              className="form-input"
              required
              name="prenom"
              value={form.prenom}
              onChange={onChange}
              placeholder="Salma"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="nom">{t("profile.lastName")}</label>
            <input
              id="nom"
              className="form-input"
              required
              name="nom"
              value={form.nom}
              onChange={onChange}
              placeholder="El Alaoui"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="niveauScolaire">{t("profile.schoolLevel")}</label>
            <select
              id="niveauScolaire"
              className="form-input"
              required
              name="niveauScolaire"
              value={form.niveauScolaire}
              onChange={onChange}
            >
              <option value="primaire">{t("auth.primaire")}</option>
              <option value="college">{t("auth.college")}</option>
              <option value="lycee">{t("auth.lycee")}</option>
            </select>
          </div>

          {form.niveauScolaire === "primaire" && (
            <div className="form-group">
              <label className="form-label" htmlFor="specialty">{t("profile.year")}</label>
              <select
                id="specialty"
                className="form-input"
                required
                name="specialty"
                value={form.specialty}
                onChange={onChange}
              >
                <option value="">{t("profile.selectYear")}</option>
                {getSpecialtiesForSchoolLevel("primaire").map((s) => (
                  <option key={s.id} value={s.id} disabled={s.enabled === false}>
                    {s.label}{s.enabled === false ? ` (${t("profile.comingSoon")})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.niveauScolaire === "college" && (
            <div className="form-group">
              <label className="form-label" htmlFor="specialty">{t("profile.year")}</label>
              <select
                id="specialty"
                className="form-input"
                required
                name="specialty"
                value={form.specialty}
                onChange={onChange}
              >
                <option value="">{t("profile.selectYear")}</option>
                {getSpecialtiesForSchoolLevel("college").map((s) => (
                  <option key={s.id} value={s.id} disabled={s.enabled === false}>
                    {s.label}{s.enabled === false ? ` (${t("profile.comingSoon")})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.niveauScolaire === "lycee" && (
            <div className="form-group">
              <label className="form-label" htmlFor="specialty">{t("profile.specialty")}</label>
              <select
                id="specialty"
                className="form-input"
                required
                name="specialty"
                value={form.specialty}
                onChange={onChange}
              >
                <option value="">{t("profile.selectSpecialty")}</option>
                {lyceeSpecialties.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.enabled === false}>
                    {s.label} — {s.labelAr}{s.enabled === false ? ` (${t("profile.comingSoon")})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="age">{t("profile.age")}</label>
            <input
              id="age"
              className="form-input"
              required
              type="number"
              min="5"
              max="18"
              name="age"
              value={form.age}
              onChange={onChange}
              placeholder="11"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tel">{t("profile.phone")}</label>
            <input
              id="tel"
              className="form-input"
              required
              type="tel"
              name="tel"
              value={form.tel}
              onChange={onChange}
              placeholder="06XXXXXXXX"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">{t("profile.email")}</label>
            <input
              id="email"
              className="form-input"
              required
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="you@email.com"
            />
          </div>

          <div className="form-group form-full">
            <label className="form-label" htmlFor="password">{t("auth.password")}</label>
            <input
              id="password"
              className="form-input"
              required
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              placeholder={t("auth.choosePassword")}
            />
          </div>
        </div>

        <button className="btn btn-primary auth-submit" style={{ width: "100%" }} type="submit">
          {t("auth.signUpBtn")}
        </button>

        <p className="auth-footer">
          {t("auth.hasAccount")} <Link to="/signin">{t("auth.signInLink")}</Link>
        </p>
      </motion.form>
    </div>
  );
}
