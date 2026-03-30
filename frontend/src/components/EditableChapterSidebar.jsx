/**
 * EditableChapterSidebar
 * ----------------------
 * Shared chapter sidebar used on CoursePage and ExercicePage.
 * - Students see read-only chapter buttons (same as before).
 * - Admins see rename / add / delete / drag-to-reorder controls.
 */
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Eye, EyeOff, FileText, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import * as api from "../lib/admin_api";
import { normalizeValue, reloadCurriculum } from "../lib/curriculum";

// ── Tiny helpers (admin only) ───────────────────────────────────────────────

function SortableChapter({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="ecs-sortable">
      <button type="button" className="ecs-drag" {...attributes} {...listeners}><GripVertical size={12} /></button>
      {children}
    </div>
  );
}

function InlineRename({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  if (!editing) {
    return (
      <button type="button" className="ecs-rename-btn" onClick={(e) => { e.stopPropagation(); setEditing(true); }} title="Renommer">
        <Pencil size={11} />
      </button>
    );
  }

  const save = () => { setEditing(false); if (text.trim() && text !== value) onSave(text.trim()); };
  return (
    <span className="ecs-rename-input" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setText(value); setEditing(false); } }}
      />
      <button type="button" onClick={save}><Check size={11} /></button>
      <button type="button" onClick={() => { setText(value); setEditing(false); }}><X size={11} /></button>
    </span>
  );
}

function DeleteConfirm({ onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="ecs-delete-confirm" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ecs-yes" onClick={() => { onConfirm(); setConfirming(false); }}>Oui</button>
        <button type="button" className="ecs-no" onClick={() => setConfirming(false)}>Non</button>
      </span>
    );
  }
  return (
    <button type="button" className="ecs-del-btn" onClick={(e) => { e.stopPropagation(); setConfirming(true); }} title="Supprimer">
      <Trash2 size={11} />
    </button>
  );
}

function AddChapterBtn({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return (
      <button type="button" className="ecs-add-btn" onClick={() => setOpen(true)}>
        <Plus size={12} /> Ajouter
      </button>
    );
  }

  const submit = () => { if (name.trim()) { onAdd(name.trim()); setName(""); setOpen(false); } };
  return (
    <div className="ecs-add-form" onClick={(e) => e.stopPropagation()}>
      <input autoFocus placeholder="Nom du chapitre" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }} />
      <button type="button" onClick={submit}><Check size={12} /></button>
      <button type="button" onClick={() => { setName(""); setOpen(false); }}><X size={12} /></button>
    </div>
  );
}

// ── Semester block (admin: sortable, student: read-only) ────────────────────

function SemesterBlock({ semester, label, chapters, selectedChapter, onSelect, isAdmin, specialty, rawSubject, onChanged, marginTop }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [items, setItems] = useState(chapters);
  useEffect(() => setItems(chapters), [chapters]);

  if (!chapters?.length && !isAdmin) return null;

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i._id === active.id);
    const newIdx = items.findIndex((i) => i._id === over.id);
    const reordered = arrayMove(items, oldIdx, newIdx);
    setItems(reordered);
    await api.reorderChapters(reordered.map((c, i) => ({ id: c._id, order: i })));
    await reloadCurriculum();
    onChanged();
  };

  const handleAdd = async (name) => {
    await api.createChapter({ specialty_id: specialty, subject_name: rawSubject, semester, name, order: items.length });
    await reloadCurriculum();
    onChanged();
  };

  const handleDelete = async (id) => {
    await api.deleteChapter(id);
    await reloadCurriculum();
    onChanged();
  };

  const handleRename = async (id, name) => {
    await api.updateChapter(id, { name });
    await reloadCurriculum();
    onChanged();
  };

  const handleToggleEnabled = async (id, currentEnabled) => {
    await api.updateChapter(id, { enabled: !currentEnabled });
    await reloadCurriculum();
    onChanged();
  };

  const isSelected = (ch) => selectedChapter.name === ch.name && selectedChapter.semester === semester;

  // ── Read-only (student) ──
  if (!isAdmin) {
    return (
      <>
        <p className="semester-label" style={{ marginTop }}>{label}</p>
        {chapters.map((ch) => (
          <button
            key={`${semester}-${normalizeValue(rawSubject)}-${ch.name}`}
            type="button"
            className={`chapter-item${isSelected(ch) ? " active" : ""}${ch.enabled === false ? " chapter-item--disabled" : ""}`}
            onClick={() => ch.enabled !== false && onSelect({ ...ch, semester })}
          >
            <FileText size={14} />
            <span>{ch.name}</span>
            {ch.enabled === false && <span className="coming-soon-badge">Bientôt disponible</span>}
          </button>
        ))}
      </>
    );
  }

  // ── Editable (admin) ──
  return (
    <>
      <p className="semester-label" style={{ marginTop }}>{label}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((c) => c._id)} strategy={verticalListSortingStrategy}>
          {items.map((ch) => (
            <SortableChapter key={ch._id} id={ch._id}>
              <button
                type="button"
                className={isSelected(ch) ? "chapter-item active ecs-editable" : "chapter-item ecs-editable"}
                onClick={() => onSelect({ ...ch, semester })}
              >
                <FileText size={14} />
                <span>{ch.name}</span>
                <span className="ecs-actions">
                  <button
                    type="button"
                    className={`ecs-toggle-btn${ch.enabled === false ? " muted" : ""}`}
                    title={ch.enabled === false ? "Activer" : "Désactiver"}
                    onClick={(e) => { e.stopPropagation(); handleToggleEnabled(ch._id, ch.enabled !== false); }}
                  >
                    {ch.enabled === false ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                  <InlineRename value={ch.name} onSave={(v) => handleRename(ch._id, v)} />
                  <DeleteConfirm onConfirm={() => handleDelete(ch._id)} />
                </span>
              </button>
            </SortableChapter>
          ))}
        </SortableContext>
      </DndContext>
      <AddChapterBtn onAdd={handleAdd} />
    </>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function EditableChapterSidebar({
  specialty, rawSubject, groupedChapters, selectedChapter,
  onSelectChapter, onChaptersChanged, children,
}) {
  const isAdmin = (() => {
    try { return JSON.parse(localStorage.getItem("academiaUser") || "{}").role === "admin"; } catch { return false; }
  })();

  return (
    <aside className="chapter-sidebar">
      <h2>Chapitres</h2>
      <div className="chapter-list">
        <SemesterBlock
          semester="s1" label="Semestre 1"
          chapters={groupedChapters.s1}
          selectedChapter={selectedChapter}
          onSelect={onSelectChapter}
          isAdmin={isAdmin}
          specialty={specialty}
          rawSubject={rawSubject}
          onChanged={onChaptersChanged}
          marginTop={0}
        />
        <SemesterBlock
          semester="s2" label="Semestre 2"
          chapters={groupedChapters.s2}
          selectedChapter={selectedChapter}
          onSelect={onSelectChapter}
          isAdmin={isAdmin}
          specialty={specialty}
          rawSubject={rawSubject}
          onChanged={onChaptersChanged}
          marginTop={groupedChapters.s1?.length > 0 ? "0.75rem" : 0}
        />
      </div>
      {children}
    </aside>
  );
}
