import { motion } from "framer-motion";
import { ChevronRight, FileText, Menu, ScrollText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import AIChatPanel from "../components/AIChatPanel";
import Sidebar from "../components/Sidebar";
import {
    fetchChapterPdfs,
    formatSubjectName,
    getChaptersForSubject,
    getPdfUrl,
    normalizeValue,
} from "../lib/curriculum";

export default function MockExamsPage() {
  const params = useParams();
  const location = useLocation();

  const specialty = params.specialty || location.state?.specialty || "6eme_annee_primaire";
  const rawSubject = decodeURIComponent(
    params.subject || location.state?.subjectName || "Mathematiques",
  );

  const groupedChapters = useMemo(
    () => getChaptersForSubject(specialty, rawSubject),
    [specialty, rawSubject],
  );
  const [selectedChapter, setSelectedChapter] = useState(() => {
    const d = getChaptersForSubject(specialty, rawSubject);
    const first = d.s1?.[0] || d.s2?.[0];
    const sem = d.s1?.length > 0 ? "s1" : "s2";
    return first ? { ...first, semester: sem } : { name: "", semester: "s1" };
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [examPdfs, setExamPdfs] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchChapterPdfs("exams", specialty, rawSubject, selectedChapter.semester, selectedChapter.name)
      .then((list) => { if (!cancelled) setExamPdfs(list); });
    return () => { cancelled = true; };
  }, [specialty, rawSubject, selectedChapter.name, selectedChapter.semester]);

  const examPdfUrl = examPdfs[0] ? getPdfUrl(examPdfs[0].id) : null;

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
            <span>Mock Exams</span>
            <ChevronRight size={14} />
            <span>{formatSubjectName(rawSubject)}</span>
            <ChevronRight size={14} />
            <span>{selectedChapter.name}</span>
          </div>
          <p className="course-level-badge">{specialty.replaceAll("_", " ")}</p>
        </header>

        <div className="course-body">
          <aside className="chapter-sidebar">
            <h2>Chapters</h2>
            <div className="chapter-list">
              {groupedChapters.s1?.length > 0 && (
                <>
                  <p className="semester-label">Semestre 1</p>
                  {groupedChapters.s1.map((ch) => (
                    <button
                      key={`exam-s1-${normalizeValue(rawSubject)}-${ch.name}`}
                      type="button"
                      className={selectedChapter.name === ch.name && selectedChapter.semester === "s1" ? "chapter-item active" : "chapter-item"}
                      onClick={() => { setSelectedChapter({ ...ch, semester: "s1" }); setChatOpen(false); }}
                    >
                      <FileText size={14} />
                      <span>{ch.name}</span>
                    </button>
                  ))}
                </>
              )}
              {groupedChapters.s2?.length > 0 && (
                <>
                  <p className="semester-label" style={{ marginTop: groupedChapters.s1?.length > 0 ? "0.75rem" : 0 }}>Semestre 2</p>
                  {groupedChapters.s2.map((ch) => (
                    <button
                      key={`exam-s2-${normalizeValue(rawSubject)}-${ch.name}`}
                      type="button"
                      className={selectedChapter.name === ch.name && selectedChapter.semester === "s2" ? "chapter-item active" : "chapter-item"}
                      onClick={() => { setSelectedChapter({ ...ch, semester: "s2" }); setChatOpen(false); }}
                    >
                      <FileText size={14} />
                      <span>{ch.name}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </aside>

          <div className={chatOpen ? "split-view" : "chapter-content-wrapper"}>
            <motion.section
              className="chapter-content"
              key={selectedChapter.name + selectedChapter.semester}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="pdf-viewer-area">
                {examPdfUrl ? (
                  <iframe
                    src={examPdfUrl}
                    title={`Exam Reference: ${selectedChapter.name}`}
                    className="pdf-iframe"
                  />
                ) : (
                  <div className="pdf-fallback">
                    <ScrollText size={32} />
                    <h3>Reference Exam — {selectedChapter.name}</h3>
                    <p>No exam PDFs uploaded yet for this chapter.</p>
                    <p style={{ marginTop: "0.5rem", color: "var(--text-light)" }}>
                      You can still generate an AI exam without a reference.
                    </p>
                  </div>
                )}
              </div>
            </motion.section>

            {chatOpen && (
              <AIChatPanel
                mode="mock_exam"
                level={specialty}
                subject={rawSubject}
                chapter={selectedChapter.name}
                referencePdfPath={examPdfUrl}
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
            <ScrollText size={22} />
            <span className="ai-fab-label">Generate Exam</span>
          </button>
        )}
      </main>
    </div>
  );
}
