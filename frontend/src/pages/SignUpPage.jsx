import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const initialForm = {
  nom: "",
  prenom: "",
  niveauScolaire: "primaire",
  telParent: "",
  emailParent: "",
  age: "",
  password: "",
};

export default function SignUpPage() {
  const [form, setForm] = useState(initialForm);
  const navigate = useNavigate();

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem("academiaUser", JSON.stringify(form));
    navigate("/dashboard");
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
            </select>
          </div>

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
            <label className="form-label" htmlFor="telParent">Parent phone</label>
            <input
              id="telParent"
              className="form-input"
              required
              name="telParent"
              value={form.telParent}
              onChange={onChange}
              placeholder="06XXXXXXXX"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="emailParent">Parent email</label>
            <input
              id="emailParent"
              className="form-input"
              required
              type="email"
              name="emailParent"
              value={form.emailParent}
              onChange={onChange}
              placeholder="parent@email.com"
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
