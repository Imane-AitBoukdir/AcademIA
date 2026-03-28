import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Menu,
  ArrowRight,
  BookOpen,
  Calculator,
  Globe,
  FlaskConical,
  Languages,
  Landmark,
  Leaf,
  ScrollText,
  Star,
  Zap,
  MessageCircle,
  PlayCircle,
  PenTool,
  Lightbulb,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import {
  getLevelOptions,
  getSubjectsByLevel,
  formatSubjectName,
} from "../lib/curriculum";

const accents = ["mint", "peach", "lavender", "primary", "sky", "sunshine"];

const subjectMeta = {
  mathematiques: {img: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=200&fit=crop" },
  francais: { icon: BookOpen, color: "sky", img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=200&fit=crop" },
  arabe: { icon: ScrollText, color: "peach", img: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=200&fit=crop" },
  physique: { icon: Zap, color: "sunshine", img: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&h=200&fit=crop" },
  chimie: { icon: FlaskConical, color: "mint", img: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=200&fit=crop" },
  svt: { icon: Leaf, color: "mint", img: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=400&h=200&fit=crop" },
  sciences: { icon: FlaskConical, color: "mint", img: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=400&h=200&fit=crop" },
  histoire: { icon: Landmark, color: "peach", img: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=200&fit=crop" },
  geographie: { icon: Globe, color: "sky", img: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=400&h=200&fit=crop" },
  anglais: { icon: Languages, color: "lavender", img: "https://images.unsplash.com/photo-1543109740-4bdb38fda756?w=400&h=200&fit=crop" },
  educationislamique: { icon: Star, color: "sunshine", img: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=400&h=200&fit=crop" },
  educationartistique: { icon: Star, color: "rose", img: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=200&fit=crop" },
  
};

function getSubjectMeta(subject) {
  const key = subject.toLowerCase().replace(/[\s_-]/g, "");
  const entries = Object.entries(subjectMeta).sort((a, b) => b[0].length - a[0].length);
  for (const [pattern, meta] of entries) {
    if (key.includes(pattern)) return meta;
  }
  return { icon: BookOpen, color: accents[0], img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=200&fit=crop" };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getUser() {
  return JSON.parse(localStorage.getItem("academiaUser") || "null") || {
    prenom: "Student",
    niveauScolaire: "primaire",
  };
}

export default function DashboardPage() {
  const user = getUser();
  const navigate = useNavigate();

  const defaultLevel =
    user.niveauScolaire === "college"
      ? "1ere_annee_college"
      : "6eme_annee_primaire";

  const [selectedLevel, setSelectedLevel] = useState(defaultLevel);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const subjects = useMemo(() => getSubjectsByLevel(selectedLevel), [selectedLevel]);
  const levels = getLevelOptions();

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="dashboard-main">
        {/* ── Top bar ── */}
        <div className="dash-topbar">
          <button
            className="mobile-sidebar-toggle"
            type="button"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>
          <motion.button
            className="dash-ia-btn"
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.3 }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
          >
            AI Teacher
          </motion.button>
        </div>

        {/* ── Greeting ── */}
        <motion.section
          className="dash-greeting"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="dash-greeting-text">
            <h1 className="dash-greeting-title">
              {getGreeting()}, <span className="dash-greeting-name">{user.prenom}</span>
            </h1>
            <p className="dash-greeting-sub">Ready to continue learning?</p>
          </div>
        </motion.section>

        {/* ── Resume + Suggestions side by side ── */}
        <div className="dash-twin-sections">
          <section className="dash-section dash-twin">
            <div className="dash-section-header">
              <RotateCcw size={18} className="dash-section-icon" />
              <h2 className="dash-section-title">Reprendre ou j'ai laisse</h2>
            </div>
            <div className="dash-resume-stack">
            <motion.div
              className="dash-resume-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <div className="resume-card-icon accent-lavender">
                <PlayCircle size={20} />
              </div>
              <div className="resume-card-body">
                <p className="resume-card-label">Dernier cours consulte</p>
                <h3 className="resume-card-title">Nombres relatifs</h3>
                <p className="resume-card-meta">Mathematiques</p>
              </div>
              <button
                className="card-action"
                type="button"
                onClick={() =>
                  navigate(`/courses/${selectedLevel}/Mathematiques`, {
                    state: { subjectName: "Mathematiques", level: selectedLevel },
                  })
                }
              >
                Reprendre <ArrowRight size={15} />
              </button>
            </motion.div>

            <motion.div
              className="dash-resume-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.3 }}
            >
              <div className="resume-card-icon accent-peach">
                <PenTool size={20} />
              </div>
              <div className="resume-card-body">
                <p className="resume-card-label">Dernier exercice</p>
                <h3 className="resume-card-title">Exercice 3 — Puissances</h3>
                <p className="resume-card-meta">Mathematiques</p>
              </div>
              <button className="card-action" type="button">
                Continuer <ArrowRight size={15} />
              </button>
            </motion.div>
            </div>
          </section>

          <section className="dash-section dash-twin">
            <div className="dash-section-header">
              <Lightbulb size={18} className="dash-section-icon" />
              <h2 className="dash-section-title">Suggestions</h2>
            </div>
            <div className="dash-suggestions-stack">
            <motion.div
              className="dash-suggestion-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.3 }}
            >
              <div className="suggestion-icon accent-sunshine">
                <RotateCcw size={18} />
              </div>
              <div>
                <h3>Tu devrais revoir ce chapitre</h3>
                <p>Proportionnalite — certaines notions meritent detre revues.</p>
              </div>
              <button className="card-action" type="button">
                Revoir <ArrowRight size={15} />
              </button>
            </motion.div>

            <motion.div
              className="dash-suggestion-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.3 }}
            >
              <div className="suggestion-icon accent-mint">
                <PenTool size={18} />
              </div>
              <div>
                <h3>Exercices recommandes</h3>
                <p>5 exercices sur les Nombres relatifs pour renforcer tes acquis.</p>
              </div>
              <button className="card-action" type="button">
                Commencer <ArrowRight size={15} />
              </button>
            </motion.div>
            </div>
          </section>
        </div>

        {/* ── Subject grid ── */}
        <section className="dash-section">
          <div className="content-title-row">
            <p className="content-title">Your Subjects</p>
            <span className="content-title-count">{subjects.length} subjects</span>
          </div>
          <div className="subject-grid">
            {subjects.map((subject, index) => {
              const meta = getSubjectMeta(subject);
              const accent = meta.color || accents[index % accents.length];
              return (
                <motion.div
                  key={subject}
                  className={`subject-card accent-${accent}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.05, duration: 0.35 }}
                >
                  <div className="subject-card-img">
                    <img src={meta.img} alt={formatSubjectName(subject)} loading="lazy" />
                  </div>
                  <div className="subject-card-body">
                    <h3 className="subject-card-title">{formatSubjectName(subject)}</h3>
                    <p className="subject-card-desc">Explore chapters, lessons and exercises</p>
                    <button
                      className="card-action"
                      type="button"
                      onClick={() =>
                        navigate(`/courses/${selectedLevel}/${subject}`, {
                          state: { subjectName: subject, level: selectedLevel },
                        })
                      }
                    >
                      Open <ArrowRight size={15} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
