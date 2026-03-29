import { motion } from "framer-motion";
import {
    ArrowRight,
    BookOpen,
    FlaskConical,
    Globe,
    Landmark,
    Languages,
    Leaf,
    Menu,
    ScrollText,
    Star,
    Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
    formatSubjectName,
    getDefaultSpecialty,
    getSubjectsBySpecialty,
} from "../lib/curriculum";

const accents = ["mint", "peach", "lavender", "primary", "sky", "sunshine"];

const subjectMeta = {
  mathematiques: { img: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=200&fit=crop" },
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
  const entries = Object.entries(subjectMeta).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [pattern, meta] of entries) {
    if (key.includes(pattern)) return meta;
  }
  return {
    icon: BookOpen,
    color: accents[0],
    img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=200&fit=crop",
  };
}

const modeConfig = {
  courses: { title: "Courses", desc: "Read lessons and chapters", routePrefix: "/courses" },
  exercises: { title: "Exercises", desc: "Practice with exercises", routePrefix: "/exercises" },
  "mock-exams": { title: "Mock Exams", desc: "Prepare with exam simulations", routePrefix: "/mock-exams" },
};

function getUser() {
  return JSON.parse(localStorage.getItem("academiaUser") || "null") || {
    prenom: "Student",
    niveauScolaire: "primaire",
  };
}

export default function SubjectPickerPage() {
  const { mode } = useParams();
  const config = modeConfig[mode] || modeConfig.courses;
  const user = getUser();
  const navigate = useNavigate();

  const defaultSpecialty = getDefaultSpecialty(user);

  const [selectedSpecialty, setSelectedSpecialty] = useState(defaultSpecialty);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const subjects = useMemo(
    () => getSubjectsBySpecialty(selectedSpecialty),
    [selectedSpecialty],
  );

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="dashboard-main">
        <div className="dash-topbar">
          <button
            className="mobile-sidebar-toggle"
            type="button"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>
        </div>

        <motion.section
          className="dash-greeting"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="dash-greeting-text">
            <h1 className="dash-greeting-title">{config.title}</h1>
            <p className="dash-greeting-sub">
              Choose a subject to get started
            </p>
          </div>
        </motion.section>

        <section className="dash-section">
          <div className="content-title-row">
            <p className="content-title">Your Subjects</p>
            <span className="content-title-count">
              {subjects.length} subjects
            </span>
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
                  transition={{
                    delay: 0.1 + index * 0.05,
                    duration: 0.35,
                  }}
                >
                  <div className="subject-card-img">
                    <img
                      src={meta.img}
                      alt={formatSubjectName(subject)}
                      loading="lazy"
                    />
                  </div>
                  <div className="subject-card-body">
                    <h3 className="subject-card-title">
                      {formatSubjectName(subject)}
                    </h3>
                    <p className="subject-card-desc">{config.desc}</p>
                    <button
                      className="card-action"
                      type="button"
                      onClick={() =>
                        navigate(
                          `${config.routePrefix}/${selectedSpecialty}/${subject}`,
                          {
                            state: {
                              subjectName: subject,
                              specialty: selectedSpecialty,
                            },
                          },
                        )
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
