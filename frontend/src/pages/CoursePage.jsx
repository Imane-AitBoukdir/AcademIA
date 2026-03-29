import { motion } from "framer-motion";
import { ArrowRight, ChevronRight, FileText, Menu, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import AIChatPanel from "../components/AIChatPanel";
import Sidebar from "../components/Sidebar";
import {
    fetchChapterPdfs,
    formatSubjectName,
    getChaptersForSubject,
    getPdfUrl,
    normalizeValue,
} from "../lib/curriculum";

export default function CoursePage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

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
  const [pdfList, setPdfList] = useState([]);
  const [selectedPdfIndex, setSelectedPdfIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [chaptersWidth, setChaptersWidth] = useState(280);
  const isResizingRef = useRef(false);

  /* ── Resize handler for chapter sidebar ── */
  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startW = chaptersWidth;

    const onMouseMove = (ev) => {
      if (!isResizingRef.current) return;
      const newW = Math.min(450, Math.max(180, startW + (ev.clientX - startX)));
      setChaptersWidth(newW);
    };
    const onMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [chaptersWidth]);

  useEffect(() => {
    let cancelled = false;
    fetchChapterPdfs("courses", specialty, rawSubject, selectedChapter.semester, selectedChapter.name)
      .then((list) => { if (!cancelled) { setPdfList(list); setSelectedPdfIndex(0); } });
    return () => { cancelled = true; };
  }, [specialty, rawSubject, selectedChapter.name, selectedChapter.semester]);

  const currentPdfUrl = pdfList[selectedPdfIndex]
    ? getPdfUrl(pdfList[selectedPdfIndex].id)
    : null;

  const chapterKey = `${normalizeValue(specialty)}_${normalizeValue(rawSubject)}_${selectedChapter.semester}_${normalizeValue(selectedChapter.name)}`;

  return (
    <div className={`dashboard-layout${navCollapsed ? " nav-collapsed" : ""}`}>
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
          <button
            className="nav-collapse-btn"
            type="button"
            onClick={() => setNavCollapsed((v) => !v)}
            title={navCollapsed ? "Show sidebar" : "Hide sidebar"}
          >
            {navCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div className="course-breadcrumb">
            <Link to="/dashboard">Dashboard</Link>
            <ChevronRight size={14} />
            <span>{formatSubjectName(rawSubject)}</span>
            <ChevronRight size={14} />
            <span>{selectedChapter.name}</span>
          </div>
          <p className="course-level-badge">{specialty.replaceAll("_", " ")}</p>
        </header>

        <div
          className="course-body"
          style={{ gridTemplateColumns: `${chaptersWidth}px 6px 1fr` }}
        >
          <aside className="chapter-sidebar">
            <h2>Chapters</h2>
            <div className="chapter-list">
              {groupedChapters.s1?.length > 0 && (
                <>
                  <p className="semester-label">Semestre 1</p>
                  {groupedChapters.s1.map((ch) => (
                    <button
                      key={`s1-${normalizeValue(rawSubject)}-${ch.name}`}
                      type="button"
                      className={selectedChapter.name === ch.name && selectedChapter.semester === "s1" ? "chapter-item active" : "chapter-item"}
                      onClick={() => { setSelectedChapter({ ...ch, semester: "s1" }); setSelectedPdfIndex(0); setChatOpen(false); }}
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
                      key={`s2-${normalizeValue(rawSubject)}-${ch.name}`}
                      type="button"
                      className={selectedChapter.name === ch.name && selectedChapter.semester === "s2" ? "chapter-item active" : "chapter-item"}
                      onClick={() => { setSelectedChapter({ ...ch, semester: "s2" }); setSelectedPdfIndex(0); setChatOpen(false); }}
                    >
                      <FileText size={14} />
                      <span>{ch.name}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
            <button
              className="goto-exercises-btn"
              type="button"
              onClick={() =>
                navigate(`/exercises/${specialty}/${encodeURIComponent(rawSubject)}`, {
                  state: { chapter: selectedChapter.name, semester: selectedChapter.semester },
                })
              }
            >
              Passez aux exercices <ArrowRight size={16} />
            </button>
          </aside>

          {/* Resize handle */}
          <div className="chapter-resize-handle" onMouseDown={handleResizeMouseDown} />

          <div className={chatOpen ? "split-view" : "chapter-content-wrapper"}>
            <motion.section
              className="chapter-content"
              key={selectedChapter.name + selectedChapter.semester}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="pdf-viewer-area">
                {pdfList.length > 1 && (
                  <div className="pdf-tabs">
                    {pdfList.map((pdf, i) => (
                      <button
                        key={pdf.id}
                        type="button"
                        className={selectedPdfIndex === i ? "pdf-tab active" : "pdf-tab"}
                        onClick={() => setSelectedPdfIndex(i)}
                        title={pdf.filename}
                      >
                        <FileText size={13} />
                        Partie {i + 1}
                      </button>
                    ))}
                  </div>
                )}
                {currentPdfUrl ? (
                  <iframe
                    src={currentPdfUrl}
                    title={`Course: ${selectedChapter.name}`}
                    className="pdf-iframe"
                  />
                ) : (
                  <div className="pdf-fallback">
                    <FileText size={32} />
                    <h3>{selectedChapter.name}</h3>
                    <p>No PDFs uploaded yet for this chapter.</p>
                  </div>
                )}
              </div>
            </motion.section>

            {chatOpen && (
              <AIChatPanel
                mode="course"
                level={specialty}
                subject={rawSubject}
                chapter={selectedChapter.name}
                referencePdfPath={currentPdfUrl}
                onClose={() => setChatOpen(false)}
                chapterKey={chapterKey}
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
