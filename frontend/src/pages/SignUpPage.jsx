import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { lyceeSpecialties } from "../lib/curriculum";

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

  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Reset specialty when switching away from lycee
      if (name === "niveauScolaire" && value !== "lycee") {
        next.specialty = "";
      }
      return next;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:8000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Signup failed.");
        return;
      }
      const user = await res.json();
      localStorage.setItem("academiaUser", JSON.stringify(user));
      navigate("/dashboard");
    } catch {
      setError("Cannot reach server. Please try again.");
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
          <h1>Create your account</h1>
          <p>Start learning with AcademIA today.</p>
          {error && <p style={{ color: "#e53e3e", marginTop: 8 }}>{error}</p>}
        </div>

        <div className="form-grid form-two-cols">
          <div className="form-group">
            <label className="form-label" htmlFor="prenom">First name</label>
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
            <label className="form-label" htmlFor="nom">Last name</label>
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
            <label className="form-label" htmlFor="niveauScolaire">School level</label>
            <select
              id="niveauScolaire"
              className="form-input"
              required
              name="niveauScolaire"
              value={form.niveauScolaire}
              onChange={onChange}
            >
              <option value="primaire">Primaire</option>
              <option value="college">Collège</option>
              <option value="lycee">Lycée</option>
            </select>
          </div>

          {form.niveauScolaire === "lycee" && (
            <div className="form-group">
              <label className="form-label" htmlFor="specialty">Stream / Filière</label>
              <select
                id="specialty"
                className="form-input"
                required
                name="specialty"
                value={form.specialty}
                onChange={onChange}
              >
                <option value="">— Select your stream —</option>
                {lyceeSpecialties.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {s.labelAr}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="age">Age</label>
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
            <label className="form-label" htmlFor="tel">Phone</label>
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
            <label className="form-label" htmlFor="email">Email</label>
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
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              required
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              placeholder="Choose a password"
            />
          </div>
        </div>

        <button className="btn btn-primary auth-submit" style={{ width: "100%" }} type="submit">
          Create Account
        </button>

        <p className="auth-footer">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </motion.form>
    </div>
  );
}
