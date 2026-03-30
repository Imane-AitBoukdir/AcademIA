/**
 * Curriculum helpers — thin re-export layer over curriculum_data.js
 * plus normalizeValue, formatSubjectName, and buildPdfPath.
 */

export {
    ALL_SPECIALTIES,
    getChaptersForSubject,
    getDefaultSpecialty,
    getSchoolLevels,
    getSchoolLevelsWithLabels,
    getSpecialtiesForSchoolLevel,
    getSpecialtyById,
    getSubjectLanguage,
    getSubjectsBySpecialty,
    lyceeSpecialties
} from "../data/curriculum_data";

// ── Kept for backward compat in DashboardPage / SubjectPickerPage ───────────
export { getSubjectsBySpecialty as getSubjectsByLevel } from "../data/curriculum_data";

// ── Load curriculum from API (call once at app startup) ─────────────────────
export { loadCurriculum, reloadCurriculum } from "../data/curriculum_data";

export function normalizeValue(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function formatSubjectName(subject) {
  return subject.replaceAll("_", " ");
}

/**
 * Build the canonical PDF path.
 *
 * Convention:
 *   /pdfs/{type}/{language}/{specialty}/{subject}/{semester}/{lesson}.pdf
 *
 * @param {"courses"|"exercices"|"exams"} type
 * @param {string} specialty   - e.g. "2bac_sm_a", "6eme_annee_primaire"
 * @param {string} subject     - e.g. "Mathematiques"
 * @param {string} semester    - e.g. "s1"
 * @param {string} lesson      - chapter / lesson name
 */
/**
 * @param {string} filename - PDF filename inside the chapter folder (default: "cours.pdf")
 *   To add more PDFs to a chapter, update its `pdfs` array in curriculum_data.js.
 *   Path: /pdfs/{type}/{lang}/{specialty}/{subject}/{semester}/{chapter}/{filename}
 */
export function buildPdfPath(type, specialty, subject, semester, lesson, filename = "cours.pdf") {
  const language = subject
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
  const ARABIC = new Set(["arabe", "education_islamique", "histoire_geographie", "philosophie"]);
  const lang = ARABIC.has(language) ? "ar" : "fr";
  const s = normalizeValue(subject);
  const l = normalizeValue(lesson);
  return `/pdfs/${type}/${lang}/${specialty}/${s}/${semester}/${l}/${filename}`;
}

// ── API-driven PDF helpers (GridFS) ─────────────────────────────────────────

import { API_URL } from "../config";

/**
 * Fetch the list of PDFs for a chapter from the backend (GridFS).
 * Returns [{ id, filename, uploadDate }]
 */
export async function fetchChapterPdfs(pdfType, specialty, subject, semester, chapter) {
  const s = normalizeValue(subject);
  const c = normalizeValue(chapter);
  const res = await fetch(
    `${API_URL}/api/pdfs/${pdfType}/${specialty}/${s}/${semester}/${c}`
  );
  if (!res.ok) return [];
  return res.json();
}

/**
 * Fetch all PDFs for a subject across all semesters/chapters (used for mock exams).
 * Returns [{ id, filename, uploadDate, chapter, semester }]
 */
export async function fetchSubjectPdfs(pdfType, specialty, subject) {
  const s = normalizeValue(subject);
  const res = await fetch(`${API_URL}/api/pdfs/${pdfType}/${specialty}/${s}`);
  if (!res.ok) return [];
  return res.json();
}

/**
 * Get the URL to stream a single PDF by its GridFS file ID.
 */
export function getPdfUrl(fileId) {
  return `${API_URL}/api/pdfs/file/${fileId}`;
}

/**
 * Upload a user PDF to GridFS.
 * Returns { id, filename } on success.
 */
export async function uploadPdf(file, pdfType, specialty, subject, semester, chapter) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("pdf_type", pdfType);
  fd.append("specialty", specialty);
  fd.append("subject", normalizeValue(subject));
  fd.append("semester", semester);
  fd.append("chapter", normalizeValue(chapter));
  try {
    const user = JSON.parse(localStorage.getItem("academiaUser") || "{}");
    if (user.email) fd.append("uploaded_by", user.email);
  } catch { /* ignore */ }
  const res = await fetch(`${API_URL}/api/pdfs/upload`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

/**
 * Delete a PDF from GridFS by its file ID.
 */
export async function deletePdf(fileId) {
  const res = await fetch(`${API_URL}/api/pdfs/file/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
}

/**
 * Generate a mock exam via Gemini → LaTeX → PDF.
 * Accepts optional pre-cached Gemini URIs to skip upload.
 * Returns { id, filename } on success.
 */
export async function generateExam(specialty, subject, chapters, language, coursePdfId, examPdfId, courseUri, examUri) {
  const fd = new FormData();
  fd.append("subject", normalizeValue(subject));
  fd.append("level", specialty);
  fd.append("specialty", specialty);
  fd.append("chapters", chapters.join(", "));
  fd.append("language", language || "fr");
  if (coursePdfId) fd.append("course_pdf_id", coursePdfId);
  if (examPdfId) fd.append("exam_pdf_id", examPdfId);
  if (courseUri) fd.append("course_uri", courseUri);
  if (examUri) fd.append("exam_uri", examUri);
  const res = await fetch(`${API_URL}/api/generate-exam`, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Exam generation failed");
  }
  return res.json();
}

/**
 * Pre-upload all course + exam PDFs for a subject to Gemini (cache warming).
 * Returns { cached: { gridfs_file_id: gemini_uri }, count }.
 */
export async function preUploadPdfs(specialty, subject) {
  const fd = new FormData();
  fd.append("specialty", specialty);
  fd.append("subject", normalizeValue(subject));
  const res = await fetch(`${API_URL}/api/pre-upload-pdfs`, { method: "POST", body: fd });
  if (!res.ok) return { cached: {}, count: 0 };
  return res.json();
}