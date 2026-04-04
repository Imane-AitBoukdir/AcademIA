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
    PenTool,
    PlayCircle,
    RotateCcw,
    ScrollText,
    Star,
    Zap
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useLanguage } from "../i18n";
import {
    formatSubjectName,
    getDefaultSpecialty,
    getSpecialtiesForSchoolLevel,
    getSpecialtyById,
    getSubjectsBySpecialty,
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

function getGreeting(t) {
  const hour = new Date().getHours();
  if (hour < 12) return t("dash.morning");
  if (hour < 18) return t("dash.afternoon");
  return t("dash.evening");
}

function getUser() {
  return JSON.parse(localStorage.getItem("academiaUser") || "null") || {
    prenom: "Élève",
    niveauScolaire: "primaire",
  };
}

export default function DashboardPage() {
  const user = getUser();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const defaultSpecialty = getDefaultSpecialty(user);

  const [selectedSpecialty, setSelectedSpecialty] = useState(defaultSpecialty);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const subjects = useMemo(() => getSubjectsBySpecialty(selectedSpecialty), [selectedSpecialty]);
  const specialtyInfo = getSpecialtyById(selectedSpecialty);
  const schoolLevel = user.niveauScolaire || "primaire";
  const specialties = useMemo(() => getSpecialtiesForSchoolLevel(schoolLevel), [schoolLevel]);

  /* ── Read recent activity from localStorage (per-user) ── */
  const uid = user.id || user._id || "";
  const lastCourse = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(`academia_last_course_${uid}`)); } catch { return null; }
  }, [uid]);
  const lastExercise = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(`academia_last_exercise_${uid}`)); } catch { return null; }
  }, [uid]);

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
            onClick={() => navigate("/prof-ai")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.3 }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
          >
            {t("sidebar.profAi")}
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
              {getGreeting(t)}, <span className="dash-greeting-name">{user.prenom}</span>
            </h1>
            <p className="dash-greeting-sub">{t("dash.continueStudying")}</p>
          </div>
        </motion.section>

        {/* ── Resume ── */}
        <div className="dash-twin-sections">
          <section className="dash-section">
            <div className="dash-section-header">
              <RotateCcw size={18} className="dash-section-icon" />
              <h2 className="dash-section-title">{t("dash.continueStudying")}</h2>
            </div>
            <div className="dash-resume-stack">
            {lastCourse ? (
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
                <p className="resume-card-label">{t("dash.lastCourse")}</p>
                <h3 className="resume-card-title">{lastCourse.chapter}</h3>
                <p className="resume-card-meta">{formatSubjectName(lastCourse.subject)}</p>
              </div>
              <button
                className="card-action"
                type="button"
                onClick={() =>
                  navigate(`/courses/${lastCourse.specialty}/${encodeURIComponent(lastCourse.subject)}`, {
                    state: { subjectName: lastCourse.subject, specialty: lastCourse.specialty, chapter: lastCourse.chapter, semester: lastCourse.semester },
                  })
                }
              >
                {t("dash.resume")} <ArrowRight size={15} />
              </button>
            </motion.div>
            ) : (
            <div className="dash-resume-card" style={{ opacity: 0.5 }}>
              <div className="resume-card-icon accent-lavender"><PlayCircle size={20} /></div>
              <div className="resume-card-body">
                <p className="resume-card-label">{t("dash.courses")}</p>
                <h3 className="resume-card-title">{t("dash.nothingYet")}</h3>
                <p className="resume-card-meta"></p>
              </div>
            </div>
            )}

            {lastExercise ? (
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
                <p className="resume-card-label">{t("dash.lastExercise")}</p>
                <h3 className="resume-card-title">{lastExercise.chapter}</h3>
                <p className="resume-card-meta">{formatSubjectName(lastExercise.subject)}</p>
              </div>
              <button className="card-action" type="button" onClick={() =>
                  navigate(`/exercises/${lastExercise.specialty}/${encodeURIComponent(lastExercise.subject)}`, {
                    state: { subjectName: lastExercise.subject, specialty: lastExercise.specialty, chapter: lastExercise.chapter, semester: lastExercise.semester },
                  })
                }>
                {t("dash.resume")} <ArrowRight size={15} />
              </button>
            </motion.div>
            ) : (
            <div className="dash-resume-card" style={{ opacity: 0.5 }}>
              <div className="resume-card-icon accent-peach"><PenTool size={20} /></div>
              <div className="resume-card-body">
                <p className="resume-card-label">{t("dash.exercises")}</p>
                <h3 className="resume-card-title">{t("dash.nothingYet")}</h3>
                <p className="resume-card-meta"></p>
              </div>
            </div>
            )}
            </div>
          </section>
        </div>

        {/* ── Subject grid ── */}
        <section className="dash-section">
          <div className="content-title-row">
            <p className="content-title">{t("dash.yourSubjects")}</p>
            <span className="content-title-count">{subjects.length} {t("dash.subjectsCount")}</span>
          </div>
          <div className="subject-grid">
            {subjects.map((subjectObj, index) => {
              const subjectName = typeof subjectObj === "string" ? subjectObj : subjectObj.name;
              const isDisabled = typeof subjectObj === "object" && subjectObj.enabled === false;
              const meta = getSubjectMeta(subjectName);
              const accent = meta.color || accents[index % accents.length];
              return (
                <motion.div
                  key={subjectName}
                  className={`subject-card accent-${accent}${isDisabled ? " subject-card--disabled" : ""}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.05, duration: 0.35 }}
                >
                  {isDisabled && <span className="coming-soon-badge-card">{t("dash.comingSoon")}</span>}
                  <div className="subject-card-img">
                    <img src={meta.img} alt={formatSubjectName(subjectName)} loading="lazy" />
                  </div>
                  <div className="subject-card-body">
                    <h3 className="subject-card-title">{formatSubjectName(subjectName)}</h3>
                    <p className="subject-card-desc">{t("dash.exploreChapters")}</p>
                    {!isDisabled && (
                      <button
                        className="card-action"
                        type="button"
                        onClick={() =>
                          navigate(`/courses/${selectedSpecialty}/${subjectName}`, {
                            state: { subjectName, specialty: selectedSpecialty },
                          })
                        }
                      >
                        {t("dash.resume")} <ArrowRight size={15} />
                      </button>
                    )}
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
