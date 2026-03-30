import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
    BookOpen, Check, ChevronDown, Eye, EyeOff, GripVertical,
    Menu, Pencil, Plus, Shield, Trash2, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import * as api from "../lib/admin_api";
import { reloadCurriculum } from "../lib/curriculum";

// ── Sortable row wrapper ────────────────────────────────────────────────────

function SortableRow({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="admin-sortable-row">
      <button type="button" className="admin-drag-handle" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </button>
      {children}
    </div>
  );
}

// ── Inline editable text ────────────────────────────────────────────────────

function InlineEdit({ value, onSave, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  if (!editing) {
    return (
      <span className="admin-inline-text" onClick={() => setEditing(true)} title="Cliquer pour modifier">
        {value || <em style={{ opacity: 0.5 }}>{placeholder}</em>}
        <Pencil size={12} className="admin-inline-pencil" />
      </span>
    );
  }

  const save = () => { setEditing(false); if (text.trim() && text !== value) onSave(text.trim()); };
  return (
    <span className="admin-inline-edit">
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setText(value); setEditing(false); } }}
      />
      <button type="button" onClick={save}><Check size={12} /></button>
      <button type="button" onClick={() => { setText(value); setEditing(false); }}><X size={12} /></button>
    </span>
  );
}

// ── Delete confirmation button ──────────────────────────────────────────────

function DeleteBtn({ onConfirm, label }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="admin-delete-confirm">
        <span>Supprimer ?</span>
        <button type="button" onClick={() => { onConfirm(); setConfirming(false); }} className="admin-btn-danger-sm">Oui</button>
        <button type="button" onClick={() => setConfirming(false)} className="admin-btn-ghost-sm">Non</button>
      </span>
    );
  }
  return (
    <button type="button" className="admin-btn-icon danger" onClick={() => setConfirming(true)} title={`Supprimer ${label || ""}`}>
      <Trash2 size={14} />
    </button>
  );
}

// ── Add form (inline) ───────────────────────────────────────────────────────

function AddForm({ placeholder, onAdd, fields }) {
  const [open, setOpen] = useState(false);
  const empty = fields ? Object.fromEntries(fields.map((f) => [f.key, ""])) : {};
  const [values, setValues] = useState(empty);

  if (!open) {
    return (
      <button type="button" className="admin-add-btn" onClick={() => setOpen(true)}>
        <Plus size={14} /> Ajouter
      </button>
    );
  }

  const submit = () => {
    if (fields) {
      if (!values[fields[0].key]?.trim()) return;
      onAdd(values);
    } else {
      if (!values.name?.trim()) return;
      onAdd(values.name.trim());
    }
    setValues(empty);
    setOpen(false);
  };

  return (
    <div className="admin-add-form">
      {fields ? (
        fields.map((f) => (
          <input
            key={f.key}
            autoFocus={f === fields[0]}
            placeholder={f.label}
            value={values[f.key]}
            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        ))
      ) : (
        <input
          autoFocus
          placeholder={placeholder}
          value={values.name || ""}
          onChange={(e) => setValues({ name: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      )}
      <button type="button" onClick={submit} className="admin-btn-primary-sm"><Check size={14} /></button>
      <button type="button" onClick={() => { setValues(empty); setOpen(false); }} className="admin-btn-ghost-sm"><X size={14} /></button>
    </div>
  );
}

// ── Chapter list (sortable) ─────────────────────────────────────────────────

function ChapterList({ chapters, semester, specId, subjectNorm, onRefresh }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [items, setItems] = useState(chapters);
  useEffect(() => setItems(chapters), [chapters]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    await api.reorderChapters(reordered.map((c, i) => ({ id: c.id, order: i })));
    onRefresh();
  };

  const handleAdd = async (name) => {
    await api.createChapter({ specialty_id: specId, subject_name: subjectNorm, semester, name, order: items.length });
    onRefresh();
  };

  const handleDelete = async (id) => {
    await api.deleteChapter(id);
    onRefresh();
  };

  const handleRename = async (id, name) => {
    await api.updateChapter(id, { name });
    onRefresh();
  };

  return (
    <div className="admin-chapter-list">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {items.map((ch) => (
            <SortableRow key={ch.id} id={ch.id}>
              <span className="admin-chapter-name">
                <InlineEdit value={ch.name} onSave={(v) => handleRename(ch.id, v)} />
              </span>
              <DeleteBtn onConfirm={() => handleDelete(ch.id)} label={ch.name} />
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>
      <AddForm placeholder="Nom du chapitre" onAdd={handleAdd} />
    </div>
  );
}

// ── Subject row (inline edit + delete) ──────────────────────────────────────

function SubjectRow({ subject, specId, onRefresh, onSelect, isSelected }) {
  const handleRename = async (name) => {
    await api.updateSubject(subject.id, { name });
    onRefresh();
  };
  const handleDelete = async () => {
    await api.deleteSubject(subject.id);
    onRefresh();
  };
  const count = (subject.chapters_s1?.length || 0) + (subject.chapters_s2?.length || 0);

  return (
    <div
      className={`admin-subject-row${isSelected ? " selected" : ""}`}
      onClick={() => onSelect(subject)}
    >
      <BookOpen size={14} className="admin-node-icon" />
      <InlineEdit value={subject.name} onSave={handleRename} />
      <span className="admin-node-badge">{count} ch.</span>
      <button
        type="button"
        className={`admin-btn-icon${subject.enabled === false ? " muted" : ""}`}
        title={subject.enabled === false ? "Activer" : "Désactiver"}
        onClick={(e) => {
          e.stopPropagation();
          api.updateSubject(subject.id, { enabled: !(subject.enabled !== false) }).then(onRefresh);
        }}
      >
        {subject.enabled === false ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      <DeleteBtn onConfirm={handleDelete} label={subject.name} />
    </div>
  );
}

// ── Chapter panel (S1 + S2 with sortable chapters) ──────────────────────────

function ChapterPanel({ subject, specId, onRefresh }) {
  const norm = subject.name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "_");

  return (
    <div className="admin-chapter-panel">
      <h3 className="admin-panel-title">
        <BookOpen size={16} /> Chapitres — {subject.name}
      </h3>
      <div className="admin-semester-section">
        <h4 className="admin-semester-title">Semestre 1</h4>
        <ChapterList chapters={subject.chapters_s1 || []} semester="s1" specId={specId} subjectNorm={norm} onRefresh={onRefresh} />
      </div>
      <div className="admin-semester-section">
        <h4 className="admin-semester-title">Semestre 2</h4>
        <ChapterList chapters={subject.chapters_s2 || []} semester="s2" specId={specId} subjectNorm={norm} onRefresh={onRefresh} />
      </div>
    </div>
  );
}

// ── Main AdminPage ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tree, setTree] = useState(null);
  const [error, setError] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedSpecId, setSelectedSpecId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("academiaUser") || "{}");
  const isAdmin = user.role === "admin";

  const loadTree = useCallback(async () => {
    try {
      const data = await api.fetchTree();
      setTree(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadTree();
  }, [isAdmin, loadTree]);

  const refresh = useCallback(async () => {
    await loadTree();
    await reloadCurriculum();
  }, [loadTree]);

  // Derived data
  const levels = useMemo(() => tree?.levels || [], [tree]);
  const currentLevel = useMemo(() => levels.find((l) => l.id === selectedLevel), [levels, selectedLevel]);
  const specialties = useMemo(() => currentLevel?.specialties || [], [currentLevel]);
  const currentSpec = useMemo(() => specialties.find((s) => s.id === selectedSpecId), [specialties, selectedSpecId]);
  const subjects = useMemo(() => currentSpec?.subjects || [], [currentSpec]);

  // Auto-select first level on load
  useEffect(() => {
    if (levels.length && !selectedLevel) setSelectedLevel(levels[0].id);
  }, [levels, selectedLevel]);

  // Auto-select first specialty when level changes
  useEffect(() => {
    if (specialties.length) setSelectedSpecId(specialties[0].id);
    else setSelectedSpecId("");
  }, [selectedLevel, specialties.length]);

  // Reset subject when specialty changes
  useEffect(() => { setSelectedSubject(null); }, [selectedSpecId]);

  // Keep selectedSubject in sync after refresh
  useEffect(() => {
    if (selectedSubject && subjects.length) {
      const updated = subjects.find((s) => s.id === selectedSubject.id);
      if (updated) setSelectedSubject(updated);
      else setSelectedSubject(null);
    }
  }, [subjects]);

  // Handlers for specialty CRUD
  const handleAddSpecialty = async (vals) => {
    await api.createSpecialty({
      id: vals.id.trim().toLowerCase().replace(/\s+/g, "_"),
      school_level: selectedLevel,
      label: vals.label,
      label_ar: vals.label_ar || "",
      order: specialties.length,
    });
    refresh();
  };

  const handleRenameSpecialty = async (spec, label) => {
    await api.updateSpecialty(spec.id, { label });
    refresh();
  };

  const handleDeleteSpecialty = async (spec) => {
    await api.deleteSpecialty(spec.id);
    setSelectedSpecId("");
    refresh();
  };

  const handleAddSubject = async (name) => {
    await api.createSubject({ specialty_id: selectedSpecId, name, order: subjects.length });
    refresh();
  };

  if (!isAdmin) {
    return (
      <div className="dashboard-layout">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="dashboard-main">
          <div className="admin-access-denied">
            <Shield size={48} />
            <h2>Accès refusé</h2>
            <p>Cette page est réservée aux administrateurs.</p>
            <button type="button" className="admin-btn-primary" onClick={() => navigate("/dashboard")}>
              Retour au tableau de bord
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="dashboard-main">
        <header className="course-top-bar" style={{ marginBottom: "1.5rem" }}>
          <button className="mobile-sidebar-toggle" type="button" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Shield size={20} />
            <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>Administration du programme</h1>
          </div>
        </header>

        {error && (
          <div className="admin-error">
            <p>{error}</p>
            <button type="button" onClick={loadTree}>Réessayer</button>
          </div>
        )}

        {!tree && !error && <p style={{ textAlign: "center", opacity: 0.6 }}>Chargement…</p>}

        {tree && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="admin-container"
          >
            {/* ── Selector bar ── */}
            <div className="admin-selector-bar">
              <div className="admin-select-group">
                <label>Niveau scolaire</label>
                <div className="admin-select-wrap">
                  <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
                    {levels.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="admin-select-arrow" />
                </div>
              </div>

              <div className="admin-select-group">
                <label>Filière / Niveau</label>
                <div className="admin-select-wrap">
                  <select value={selectedSpecId} onChange={(e) => setSelectedSpecId(e.target.value)}>
                    {specialties.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="admin-select-arrow" />
                </div>
              </div>
            </div>

            {/* ── Specialty management strip ── */}
            {currentLevel && (
              <div className="admin-spec-strip">
                <span className="admin-spec-strip-label">Filières de « {currentLevel.label} »</span>
                <div className="admin-spec-chips">
                  {specialties.map((spec) => (
                    <span key={spec.id} className={`admin-spec-chip${spec.id === selectedSpecId ? " active" : ""}${spec.enabled === false ? " disabled" : ""}`}>
                      <InlineEdit value={spec.label} onSave={(v) => handleRenameSpecialty(spec, v)} />
                      <button
                        type="button"
                        className={`admin-btn-icon${spec.enabled === false ? " muted" : ""}`}
                        title={spec.enabled === false ? "Activer" : "Désactiver"}
                        onClick={() => api.updateSpecialty(spec.id, { enabled: !(spec.enabled !== false) }).then(refresh)}
                      >
                        {spec.enabled === false ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <DeleteBtn onConfirm={() => handleDeleteSpecialty(spec)} label={spec.label} />
                    </span>
                  ))}
                </div>
                <AddForm
                  fields={[
                    { key: "id", label: "Identifiant (ex: 1bac_sm)" },
                    { key: "label", label: "Libellé français" },
                    { key: "label_ar", label: "Libellé arabe (optionnel)" },
                  ]}
                  onAdd={handleAddSpecialty}
                />
              </div>
            )}

            {/* ── Two-panel: Subjects + Chapters ── */}
            {currentSpec && (
              <div className="admin-panels">
                <div className="admin-panel admin-subjects-panel">
                  <h3 className="admin-panel-title">Matières — {currentSpec.label}</h3>
                  <div className="admin-subject-list">
                    {subjects.map((subj) => (
                      <SubjectRow
                        key={subj.id}
                        subject={subj}
                        specId={currentSpec.id}
                        onRefresh={refresh}
                        onSelect={setSelectedSubject}
                        isSelected={selectedSubject?.id === subj.id}
                      />
                    ))}
                  </div>
                  <AddForm placeholder="Nom de la matière" onAdd={handleAddSubject} />
                </div>

                <div className="admin-panel admin-chapters-panel-wrap">
                  {selectedSubject ? (
                    <ChapterPanel subject={selectedSubject} specId={currentSpec.id} onRefresh={refresh} />
                  ) : (
                    <div className="admin-empty-hint">
                      <BookOpen size={32} strokeWidth={1.5} />
                      <p>Sélectionnez une matière pour gérer ses chapitres</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
