import { motion } from "framer-motion";
import { CheckCircle, ChevronRight, FileText, Menu, PanelLeftClose, PanelLeftOpen, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import AIChatPanel from "../components/AIChatPanel";
import EditableChapterSidebar from "../components/EditableChapterSidebar";
import Sidebar from "../components/Sidebar";
import {
    deletePdf,
    fetchChapterPdfs,
    formatSubjectName,
    getChaptersForSubject,
    getPdfUrl,
    getSchoolLevelsWithLabels,
    getSpecialtiesForSchoolLevel,
    getSpecialtyById,
    normalizeValue,
    uploadPdf,
} from "../lib/curriculum";

export default function ExercicePage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

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

  const [refreshKey, setRefreshKey] = useState(0);
  const groupedChapters = useMemo(
    () => getChaptersForSubject(specialty, rawSubject),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [specialty, rawSubject, refreshKey],
  );
  const [selectedChapter, setSelectedChapter] = useState(() => {
    const d = getChaptersForSubject(specialty, rawSubject);
    const fromState = location.state;
    if (fromState?.chapter && fromState?.semester) {
      const pool = d[fromState.semester] || [];
      const match = pool.find((ch) => ch.name === fromState.chapter);
      if (match) return { ...match, semester: fromState.semester };
    }
    const first = d.s1?.[0] || d.s2?.[0];
    const sem = d.s1?.length > 0 ? "s1" : "s2";
    return first ? { ...first, semester: sem } : { name: "", semester: "s1" };
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [exercisePdfs, setExercisePdfs] = useState([]);
  const [selectedExIndex, setSelectedExIndex] = useState(0);
  const [coursePdfs, setCoursePdfs] = useState([]);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [chaptersWidth, setChaptersWidth] = useState(280);
  const [chatWidth, setChatWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);
  const isChatResizingRef = useRef(false);
  const fileInputRef = useRef(null);
  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    const startX = e.clientX;
    const startW = chaptersWidth;
    const onMouseMove = (ev) => {
      if (!isResizingRef.current) return;
      setChaptersWidth(Math.min(450, Math.max(180, startW + (ev.clientX - startX))));
    };
    const onMouseUp = () => {
      isResizingRef.current = false;
      setIsResizing(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [chaptersWidth]);

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

  const refreshPdfs = useCallback(() => {
    let cancelled = false;
    fetchChapterPdfs("exercices", specialty, rawSubject, selectedChapter.semester, selectedChapter.name)
      .then((list) => { if (!cancelled) { setExercisePdfs(list); setSelectedExIndex(0); } });
    fetchChapterPdfs("courses", specialty, rawSubject, selectedChapter.semester, selectedChapter.name)
      .then((list) => { if (!cancelled) setCoursePdfs(list); });
    return () => { cancelled = true; };
  }, [specialty, rawSubject, selectedChapter.name, selectedChapter.semester]);

  useEffect(() => refreshPdfs(), [refreshPdfs]);

  const [dragging, setDragging] = useState(false);

  const doUpload = async (file) => {
    if (!file || file.type !== "application/pdf") return;
    await uploadPdf(file, "exercices", specialty, rawSubject, selectedChapter.semester, selectedChapter.name);
    refreshPdfs();
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await doUpload(file);
    fileInputRef.current.value = "";
  };

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    doUpload(file);
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("Supprimer ce PDF ?")) return;
    await deletePdf(fileId);
    refreshPdfs();
  };

  const exercisePdfUrl = exercisePdfs[selectedExIndex] ? getPdfUrl(exercisePdfs[selectedExIndex].id) : null;
  const coursePdfUrl = coursePdfs[0] ? getPdfUrl(coursePdfs[0].id) : null;

  const chapterKey = `ex_${normalizeValue(specialty)}_${normalizeValue(rawSubject)}_${selectedChapter.semester}_${normalizeValue(selectedChapter.name)}`;

  /* ── Save recent activity (per-user) ── */
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("academiaUser") || "{}");
      const uid = u.id || u._id || "";
      localStorage.setItem(`academia_last_exercise_${uid}`, JSON.stringify({
        specialty, subject: rawSubject,
        chapter: selectedChapter.name, semester: selectedChapter.semester,
      }));
    } catch {}
  }, [specialty, rawSubject, selectedChapter.name, selectedChapter.semester]);

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
            <span>Exercices</span>
            <ChevronRight size={14} />
            <span>{formatSubjectName(rawSubject)}</span>
            <ChevronRight size={14} />
            <span>{selectedChapter.name}</span>
          </div>
          {isAdmin ? (
            <div className="admin-specialty-switcher">
              <select
                className="admin-switcher-select"
                value={getSpecialtyById(specialty)?.schoolLevel || ""}
                onChange={(e) => {
                  const specs = getSpecialtiesForSchoolLevel(e.target.value);
                  if (specs.length) navigate(`/exercises/${specs[0].id}/${encodeURIComponent(rawSubject)}`);
                }}
              >
                {getSchoolLevelsWithLabels().map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
              <select
                className="admin-switcher-select"
                value={specialty}
                onChange={(e) => navigate(`/exercises/${e.target.value}/${encodeURIComponent(rawSubject)}`)}
              >
                {getSpecialtiesForSchoolLevel(getSpecialtyById(specialty)?.schoolLevel || "").map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="course-level-badge">{specialty.replaceAll("_", " ")}</p>
          )}
        </header>

        <div
          className={`course-body${isResizing ? " resizing" : ""}`}
          style={{ gridTemplateColumns: `${chaptersWidth}px 6px 1fr` }}
        >
          <EditableChapterSidebar
            specialty={specialty}
            rawSubject={rawSubject}
            groupedChapters={groupedChapters}
            selectedChapter={selectedChapter}
            onSelectChapter={(ch) => { setSelectedChapter(ch); setChatOpen(false); }}
            onChaptersChanged={() => setRefreshKey((k) => k + 1)}
          />

          {/* Resize handle */}
          <div className="chapter-resize-handle" onMouseDown={handleResizeMouseDown} />

          <div
            className={chatOpen ? `split-view${isResizing ? " resizing" : ""}` : "chapter-content-wrapper"}
            style={chatOpen ? { gridTemplateColumns: `1fr 6px ${chatWidth}px` } : undefined}
          >
            <motion.section
              className="chapter-content"
              key={selectedChapter.name + selectedChapter.semester}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div
                className={`pdf-viewer-area${dragging ? " pdf-viewer-dragging" : ""}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <div className="pdf-toolbar">
                  {exercisePdfs.length > 0 && (
                    <div className="pdf-tabs">
                      {exercisePdfs.map((pdf, i) => (
                        <button
                          key={pdf.id}
                          type="button"
                          className={`pdf-tab${selectedExIndex === i ? " active" : ""}${canDelete(pdf) ? " deletable" : ""}`}
                          onClick={() => setSelectedExIndex(i)}
                          title={pdf.filename}
                        >
                          <FileText size={13} />
                          Partie {i + 1}
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
                  )}
                  <button className="pdf-upload-btn" type="button" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={14} /> Importer un PDF
                  </button>
                  <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleUpload} />
                </div>
                {exercisePdfUrl ? (
                  <iframe
                    src={exercisePdfUrl}
                    title={`Exercise: ${selectedChapter.name}`}
                    className="pdf-iframe"
                  />
                ) : (
                  <div className="pdf-fallback">
                    <FileText size={32} />
                    <h3>Exercices — {selectedChapter.name}</h3>
                    <p>Aucun PDF d'exercices importé pour ce chapitre.</p>
                  </div>
                )}
              </div>
            </motion.section>

            {chatOpen && (
              <>
                <div className="chat-resize-handle" onMouseDown={handleChatResizeMouseDown} />
                <AIChatPanel
                  mode="exercise"
                  level={specialty}
                  subject={rawSubject}
                  chapter={selectedChapter.name}
                  referencePdfPath={coursePdfUrl}
                  exercisePdfPath={exercisePdfUrl}
                  onClose={() => setChatOpen(false)}
                  chapterKey={chapterKey}
                />
              </>
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
            <CheckCircle size={22} />
            <span className="ai-fab-label">Corriger avec l'IA</span>
          </button>
        )}
      </main>
    </div>
  );
}
