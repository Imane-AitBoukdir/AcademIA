import { motion } from "framer-motion";
import { ChevronRight, FileText, Menu, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import AIChatPanel from "../components/AIChatPanel";
import Sidebar from "../components/Sidebar";
import {
    formatSubjectName,
    getChaptersForSubject,
    normalizeValue,
} from "../lib/curriculum";

function getPdfPath(level, subject, chapter) {
  const s = normalizeValue(subject);
  const c = normalizeValue(chapter);
  return `/pdfs/${level}/${s}/${c}/course.pdf`;
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
  const [chatOpen, setChatOpen] = useState(false);

  const pdfPath = getPdfPath(level, rawSubject, selectedChapter);

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
            <ChevronRight size={14} />
            <span>{selectedChapter}</span>
          </div>
          <p className="course-level-badge">{level.replaceAll("_", " ")}</p>
        </header>

        <div className="course-body">
          <aside className="chapter-sidebar">
            <h2>Chapters</h2>
            <div className="chapter-list">
              {chapters.map((ch) => (
                <button
                  key={`${normalizeValue(rawSubject)}-${ch}`}
                  type="button"
                  className={
                    selectedChapter === ch
                      ? "chapter-item active"
                      : "chapter-item"
                  }
                  onClick={() => {
                    setSelectedChapter(ch);
                    setChatOpen(false);
                  }}
                >
                  <FileText size={14} />
                  <span>{ch}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className={chatOpen ? "split-view" : "chapter-content-wrapper"}>
            <motion.section
              className="chapter-content"
              key={selectedChapter}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="pdf-viewer-area">
                <iframe
                  src={pdfPath}
                  title={`Course: ${selectedChapter}`}
                  className="pdf-iframe"
                />
                <div className="pdf-fallback">
                  <FileText size={32} />
                  <h3>{selectedChapter}</h3>
                  <p>
                    PDF not found. Place the course PDF at:
                    <br />
                    <code>{pdfPath}</code>
                  </p>
                </div>
              </div>
            </motion.section>

            {chatOpen && (
              <AIChatPanel
                mode="course"
                level={level}
                subject={rawSubject}
                chapter={selectedChapter}
                referencePdfPath={pdfPath}
                onClose={() => setChatOpen(false)}
              />
            )}
          </div>
        </div>

        {/* Floating AI button */}
        {!chatOpen && (
          <button
            className="ai-fab"
            onClick={() => setChatOpen(true)}
            type="button"
          >
            <Sparkles size={22} />
            <span className="ai-fab-label">Explain with AI</span>
          </button>
        )}
      </main>
    </div>
  );
}
