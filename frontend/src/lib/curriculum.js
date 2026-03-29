/**
 * Curriculum helpers — thin re-export layer over curriculum_data.js
 * plus normalizeValue, formatSubjectName, and buildPdfPath.
 */

export {
    ALL_SPECIALTIES,
    getChaptersForSubject,
    getDefaultSpecialty,
    getSchoolLevels,
    getSpecialtiesForSchoolLevel,
    getSpecialtyById,
    getSubjectLanguage,
    getSubjectsBySpecialty,
    lyceeSpecialties
} from "../data/curriculum_data";

// ── Kept for backward compat in DashboardPage / SubjectPickerPage ───────────
export { getSubjectsBySpecialty as getSubjectsByLevel } from "../data/curriculum_data";

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

const API_URL = "http://localhost:8000";

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
 * Get the URL to stream a single PDF by its GridFS file ID.
 */
export function getPdfUrl(fileId) {
  return `${API_URL}/api/pdfs/file/${fileId}`;
}

