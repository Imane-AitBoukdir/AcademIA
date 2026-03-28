import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const existing = JSON.parse(localStorage.getItem("academiaUser") || "null");
    const fallbackUser = {
      nom: "Etudiant",
      prenom: "Nour",
      niveauScolaire: "primaire",
      telParent: "",
      emailParent: email,
      age: "11",
      password,
    };
    localStorage.setItem("academiaUser", JSON.stringify(existing || fallbackUser));
    navigate("/dashboard");
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
          <h1>Welcome back</h1>
          <p>Sign in to continue learning.</p>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
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
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </div>
        </div>

        <button className="btn btn-primary auth-submit" style={{ width: "100%" }} type="submit">
          Sign In
        </button>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </motion.form>
    </div>
  );
}
