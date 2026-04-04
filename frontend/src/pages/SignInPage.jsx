import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { useLanguage } from "../i18n";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || t("auth.signInFailed"));
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
        className="auth-card"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="auth-header">
          <h1>{t("auth.welcomeBack")}</h1>
          <p>{t("auth.signInSubtitle")}</p>
          {error && <p style={{ color: "#e53e3e", marginTop: 8 }}>{error}</p>}
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="email">{t("profile.email")}</label>
            <input
              id="email"
              className="form-input"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@email.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">{t("auth.password")}</label>
            <input
              id="password"
              className="form-input"
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
            />
          </div>
        </div>

        <button className="btn btn-primary auth-submit" style={{ width: "100%" }} type="submit">
          {t("auth.signInBtn")}
        </button>

        <p className="auth-footer">
          {t("auth.noAccount")} <Link to="/signup">{t("auth.signUpLink")}</Link>
        </p>
      </motion.form>
    </div>
  );
}
