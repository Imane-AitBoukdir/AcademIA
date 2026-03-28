import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, FileText, Menu } from "lucide-react";
import Sidebar from "../components/Sidebar";
import {
  getChaptersForSubject,
  formatSubjectName,
  normalizeValue,
} from "../lib/curriculum";

function chapterContent(subject, chapter) {
  return `In this chapter "${chapter}", the student explores the key concepts of ${formatSubjectName(
    subject,
  )}. The content is structured in three parts: progressive understanding, guided examples, and practice with short exercises. A final review section helps consolidate learning before assessment.`;
}

export default function CoursePage() {
  const params = useParams();
  const location = useLocation();

  const level = params.level || location.state?.level || "6eme_annee_primaire";
  const rawSubject = decodeURIComponent(
    params.subject || location.state?.subjectName || "Mathematiques",
  );

  const chapters = useMemo(
    () => getChaptersForSubject(level, rawSubject),
    [level, rawSubject],
  );
  const [selectedChapter, setSelectedChapter] = useState(chapters[0] || "");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="dashboard-main">
        <header className="course-top-bar">
          <button
            className="mobile-sidebar-toggle"
            type="button"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>
          <div className="course-breadcrumb">
            <Link to="/dashboard">Dashboard</Link>
            <ChevronRight size={14} />
            <span>{formatSubjectName(rawSubject)}</span>
          </div>
          <p className="course-level-badge">{level.replaceAll("_", " ")}</p>
        </header>

        <div className="course-body">
          <aside className="chapter-sidebar">
            <h2>Chapters</h2>
            <div className="chapter-list">
              {chapters.map((chapter) => (
                <button
                  key={`${normalizeValue(rawSubject)}-${chapter}`}
                  type="button"
                  className={
                    selectedChapter === chapter
                      ? "chapter-item active"
                      : "chapter-item"
                  }
                  onClick={() => setSelectedChapter(chapter)}
                >
                  <FileText size={14} />
                  <span>{chapter}</span>
                </button>
              ))}
            </div>
          </aside>

          <motion.section
            className="chapter-content"
            key={selectedChapter}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h2>{selectedChapter}</h2>
            <p>{chapterContent(rawSubject, selectedChapter)}</p>
            <p className="text-secondary" style={{ marginTop: "1rem" }}>
              Detailed lesson content, exercises, and assessments will be
              displayed here once connected to the backend.
            </p>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
