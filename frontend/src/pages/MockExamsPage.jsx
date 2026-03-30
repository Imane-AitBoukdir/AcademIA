import { motion } from "framer-motion";
import { Bot, Check, ChevronRight, FileText, Loader2, Menu, PanelLeftClose, PanelLeftOpen, ScrollText, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import AIChatPanel from "../components/AIChatPanel";
import Sidebar from "../components/Sidebar";
import {
    deletePdf,
    fetchChapterPdfs,
    fetchSubjectPdfs,
    formatSubjectName,
    generateExam,
    getChaptersForSubject,
    getPdfUrl,
    normalizeValue,
    preUploadPdfs,
    uploadPdf,
} from "../lib/curriculum";

export default function MockExamsPage() {
  const params = useParams();
  const location = useLocation();

  const isAdmin = (() => {
    try { return JSON.parse(localStorage.getItem("academiaUser") || "{}").role === "admin"; } catch { return false; }
  })();
  const userEmail = (() => {
    try { return JSON.parse(localStorage.getItem("academiaUser") || "{}").email || ""; } catch { return ""; }
  })();
  const canDelete = (pdf) => isAdmin || (pdf.uploadedBy && pdf.uploadedBy === userEmail);

  const specialty = params.specialty || location.state?.specialty || "6eme_annee_primaire";
  const rawSubject = decodeURIComponent(
    params.subject || location.state?.subjectName || "Mathematiques",
  );

  const groupedChapters = useMemo(
    () => getChaptersForSubject(specialty, rawSubject),
    [specialty, rawSubject],
  );
  const allChapters = useMemo(() => {
    const list = [];
    (groupedChapters.s1 || []).forEach((ch) => list.push({ ...ch, semester: "s1" }));
    (groupedChapters.s2 || []).forEach((ch) => list.push({ ...ch, semester: "s2" }));
    return list;
  }, [groupedChapters]);

  const [examPdfs, setExamPdfs] = useState([]);
  const [selectedExamIndex, setSelectedExamIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [panelWidth, setPanelWidth] = useState(280);
  const [chatWidth, setChatWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);
  const isChatResizingRef = useRef(false);
  const fileInputRef = useRef(null);

  /* ── Generate-mode state ── */
  const [generateMode, setGenerateMode] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [generating, setGenerating] = useState(false);

  /* ── Pre-uploaded Gemini URIs (cache warming) ── */
  const [cachedUris, setCachedUris] = useState({});

  /* ── Resize handler for sidebar panel ── */
  const handlePanelResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    const startX = e.clientX;
    const startW = panelWidth;
    const onMouseMove = (ev) => {
      if (!isResizingRef.current) return;
      setPanelWidth(Math.min(450, Math.max(180, startW + (ev.clientX - startX))));
    };
    const onMouseUp = () => {
      isResizingRef.current = false;
      setIsResizing(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [panelWidth]);

  /* ── Resize handler for chat panel ── */
  const handleChatResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    isChatResizingRef.current = true;
    setIsResizing(true);
    const startX = e.clientX;
    const startW = chatWidth;
    const onMouseMove = (ev) => {
      if (!isChatResizingRef.current) return;
      setChatWidth(Math.min(600, Math.max(280, startW - (ev.clientX - startX))));
    };
    const onMouseUp = () => {
      isChatResizingRef.current = false;
      setIsResizing(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [chatWidth]);

  /* ── Fetch all exam PDFs for the subject ── */
  const refreshExamPdfs = useCallback(() => {
    let cancelled = false;
    fetchSubjectPdfs("exams", specialty, rawSubject)
      .then((list) => { if (!cancelled) { setExamPdfs(list); setSelectedExamIndex(0); } });
    return () => { cancelled = true; };
  }, [specialty, rawSubject]);

  useEffect(() => refreshExamPdfs(), [refreshExamPdfs]);

  /* ── Pre-upload PDFs to Gemini on page load (fire-and-forget) ── */
  useEffect(() => {
    preUploadPdfs(specialty, rawSubject)
      .then((data) => { if (data?.cached) setCachedUris(data.cached); })
      .catch(() => {});
  }, [specialty, rawSubject]);

  /* ── Upload handler (subject-level exam) ── */
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadPdf(file, "exams", specialty, rawSubject, "s1", "examen_general");
    refreshExamPdfs();
    fileInputRef.current.value = "";
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("Supprimer cet examen ?")) return;
    await deletePdf(fileId);
    refreshExamPdfs();
  };

  /* ── Chapter selection helpers ── */
  const toggleChapter = (ch) => {
    setSelectedChapters((prev) => {
      const exists = prev.some((s) => s.name === ch.name && s.semester === ch.semester);
      return exists
        ? prev.filter((s) => !(s.name === ch.name && s.semester === ch.semester))
        : [...prev, ch];
    });
  };

  const toggleAll = () => {
    setSelectedChapters((prev) =>
      prev.length === allChapters.length ? [] : [...allChapters],
    );
  };

  /* ── Start generation flow ── */
  const startGeneration = async () => {
    if (selectedChapters.length === 0) return;
    setGenerating(true);

    try {
      const chapterNames = selectedChapters.map((c) => c.name);

      // Fetch course PDF of first selected chapter as content reference
      let coursePdfId = null;
      let courseUri = null;
      try {
        const first = selectedChapters[0];
        const coursePdfs = await fetchChapterPdfs("courses", specialty, rawSubject, first.semester, first.name);
        if (coursePdfs.length > 0) {
          coursePdfId = coursePdfs[0].id;
          courseUri = cachedUris[coursePdfId] || null;
        }
      } catch { /* no course PDF available */ }

      // Use currently viewed exam as style reference
      const examPdfId = examPdfs[selectedExamIndex]?.id || null;
      const examUri = examPdfId ? (cachedUris[examPdfId] || null) : null;

      const lang = localStorage.getItem("academia_lang") || "fr";
      await generateExam(specialty, rawSubject, chapterNames, lang, coursePdfId, examPdfId, courseUri, examUri);
      refreshExamPdfs();
      setGenerateMode(false);
      setSelectedChapters([]);
    } catch (err) {
      console.error("Exam generation failed:", err);
      alert(err.message || "La génération a échoué.");
    } finally {
      setGenerating(false);
    }
  };

  const cancelGeneration = () => {
    setGenerateMode(false);
    setSelectedChapters([]);
  };

  const currentExamUrl = examPdfs[selectedExamIndex]
    ? getPdfUrl(examPdfs[selectedExamIndex].id)
    : null;

  const chapterKey = `mock_exam_${normalizeValue(specialty)}_${normalizeValue(rawSubject)}`;

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
            <Link to="/dashboard">Tableau de Bord</Link>
            <ChevronRight size={14} />
            <Link to="/pick/mock-exams">Examens Blancs</Link>
            <ChevronRight size={14} />
            <span>{formatSubjectName(rawSubject)}</span>
          </div>
          <p className="course-level-badge">{specialty.replaceAll("_", " ")}</p>
        </header>

        <div
          className={`course-body${isResizing ? " resizing" : ""}`}
          style={{ gridTemplateColumns: `${panelWidth}px 6px 1fr` }}
        >
          {/* ── Sidebar: Exam Browser or Chapter Selector ── */}
          <aside className="chapter-sidebar">
            {!generateMode ? (
              <>
                <h2>Examens</h2>
                <div className="chapter-list">
                  {examPdfs.length === 0 && (
                    <p className="exam-empty-hint">Aucun examen importé pour cette matière.</p>
                  )}
                  {examPdfs.map((pdf, i) => (
                    <button
                      key={pdf.id}
                      type="button"
                      className={`chapter-item${selectedExamIndex === i ? " active" : ""}${canDelete(pdf) ? " deletable" : ""}`}
                      onClick={() => setSelectedExamIndex(i)}
                    >
                      <FileText size={14} />
                      <span className="exam-pdf-name">{pdf.filename}</span>
                      {canDelete(pdf) && (
                        <span
                          className="pdf-tab-x"
                          onClick={(e) => { e.stopPropagation(); handleDelete(pdf.id); }}
                          title="Supprimer"
                        >
                          <X size={11} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="exam-sidebar-actions">
                  <button className="pdf-upload-btn" type="button" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={14} /> Importer un examen
                  </button>
                  <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleUpload} />
                  <button className="btn-primary" type="button" onClick={() => setGenerateMode(true)} style={{ marginTop: "0.5rem", width: "100%" }}>
                    <ScrollText size={14} /> Générer un Examen
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="exam-sidebar-header">
                  <h2>Sélectionner les chapitres</h2>
                  <button className="exam-sidebar-close" type="button" onClick={cancelGeneration} title="Cancel">
                    <X size={16} />
                  </button>
                </div>
                <button className="exam-select-all-btn" type="button" onClick={toggleAll}>
                  {selectedChapters.length === allChapters.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
                <div className="chapter-list">
                  {groupedChapters.s1?.length > 0 && (
                    <>
                      <p className="semester-label">Semestre 1</p>
                      {groupedChapters.s1.map((ch) => {
                        const checked = selectedChapters.some((s) => s.name === ch.name && s.semester === "s1");
                        return (
                          <button
                            key={`gen-s1-${ch.name}`}
                            type="button"
                            className="chapter-item"
                            onClick={() => toggleChapter({ ...ch, semester: "s1" })}
                          >
                            <span className={checked ? "exam-check checked" : "exam-check"}>
                              {checked && <Check size={11} />}
                            </span>
                            <span>{ch.name}</span>
                          </button>
                        );
                      })}
                    </>
                  )}
                  {groupedChapters.s2?.length > 0 && (
                    <>
                      <p className="semester-label" style={{ marginTop: groupedChapters.s1?.length > 0 ? "0.75rem" : 0 }}>
                        Semestre 2
                      </p>
                      {groupedChapters.s2.map((ch) => {
                        const checked = selectedChapters.some((s) => s.name === ch.name && s.semester === "s2");
                        return (
                          <button
                            key={`gen-s2-${ch.name}`}
                            type="button"
                            className="chapter-item"
                            onClick={() => toggleChapter({ ...ch, semester: "s2" })}
                          >
                            <span className={checked ? "exam-check checked" : "exam-check"}>
                              {checked && <Check size={11} />}
                            </span>
                            <span>{ch.name}</span>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
                <div className="exam-generate-footer">
                  <button
                    className="btn-primary"
                    type="button"
                    disabled={selectedChapters.length === 0 || generating}
                    onClick={startGeneration}
                  >
                    {generating
                      ? <><Loader2 size={14} className="spin" /> Génération en cours…</>
                      : <>Générer ({selectedChapters.length} chapitre{selectedChapters.length !== 1 ? "s" : ""})</>}
                  </button>
                </div>
              </>
            )}
          </aside>

          {/* Resize handle */}
          <div className="chapter-resize-handle" onMouseDown={handlePanelResizeMouseDown} />

          <div
            className={chatOpen ? `split-view${isResizing ? " resizing" : ""}` : "chapter-content-wrapper"}
            style={chatOpen ? { gridTemplateColumns: `1fr 6px ${chatWidth}px` } : undefined}
          >
            <motion.section
              className="chapter-content"
              key={`exam-viewer-${selectedExamIndex}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="pdf-viewer-area">
                {currentExamUrl ? (
                  <iframe
                    src={currentExamUrl}
                    title={`Exam: ${examPdfs[selectedExamIndex]?.filename}`}
                    className="pdf-iframe"
                    style={{ pointerEvents: isResizing ? "none" : "auto" }}
                  />
                ) : (
                  <div className="pdf-fallback">
                    <ScrollText size={32} />
                    <h3>Examens Blancs — {formatSubjectName(rawSubject)}</h3>
                    <p>Aucun examen importé pour cette matière.</p>
                    <p style={{ marginTop: "0.5rem", color: "var(--text-muted)" }}>
                      Importez un examen ou générez-en un avec l'IA.
                    </p>
                  </div>
                )}
              </div>
            </motion.section>

            {chatOpen && (
              <>
                <div className="chat-resize-handle" onMouseDown={handleChatResizeMouseDown} />
                <AIChatPanel
                  mode="mock_exam"
                  level={specialty}
                  subject={rawSubject}
                  chapter=""
                  referencePdfPath={null}
                  exercisePdfPath={currentExamUrl}
                  onClose={() => setChatOpen(false)}
                  chapterKey={chapterKey}
                />
              </>
            )}
          </div>
        </div>

        {/* Floating AI chat button — visible when chat is closed */}
        {!chatOpen && (
          <button
            className="ai-fab"
            onClick={() => setChatOpen(true)}
            type="button"
          >
            <Bot size={22} />
            <span className="ai-fab-label">Prof IA</span>
          </button>
        )}
      </main>
    </div>
  );
}
