/**
 * Curriculum data — dynamically loaded from the API.
 *
 * Hierarchy:
 *   schoolLevel  →  specialty (id)  →  subjects[]  →  chapters (s1/s2)
 *
 * All public functions remain synchronous — they read from a module-level
 * cache that is populated once at app startup via loadCurriculum().
 */

const API_URL = "http://localhost:8000";

// ── Module-level cache ──────────────────────────────────────────────────────

let _tree = null;               // Raw tree from API: { levels: [...] }
let _allSpecialties = [];       // Flat list: [{ id, label, labelAr, subjects, schoolLevel }]
let _specialtyMap = {};          // id → specialty object
let _levelSpecialties = {};      // schoolLevel → [specialty]
let _chapterCache = {};          // "specId|subjectNorm" → { s1: [{name}], s2: [{name}] }

function _normalize(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function _buildCache(tree) {
  _tree = tree;
  _allSpecialties = [];
  _specialtyMap = {};
  _levelSpecialties = {};
  _chapterCache = {};

  for (const level of tree.levels || []) {
    _levelSpecialties[level.id] = [];
    for (const spec of level.specialties || []) {
      const flat = {
        id: spec.id,
        label: spec.label,
        labelAr: spec.label_ar || "",
        enabled: spec.enabled !== false,
        subjects: (spec.subjects || []).map((s) => ({
          name: s.name,
          enabled: s.enabled !== false,
        })),
        schoolLevel: level.id,
      };
      _allSpecialties.push(flat);
      _specialtyMap[spec.id] = flat;
      _levelSpecialties[level.id].push(flat);

      // Build chapter cache for each subject
      for (const subj of spec.subjects || []) {
        const key = `${spec.id}|${_normalize(subj.name)}`;
        _chapterCache[key] = {
          s1: (subj.chapters_s1 || []).map((ch) => ({
            _id: ch.id,
            name: ch.name,
            enabled: ch.enabled !== false,
          })),
          s2: (subj.chapters_s2 || []).map((ch) => ({
            _id: ch.id,
            name: ch.name,
            enabled: ch.enabled !== false,
          })),
        };
      }
    }
  }
}

// ── Load from API ───────────────────────────────────────────────────────────

let _loadPromise = null;

export async function loadCurriculum() {
  if (_tree) return _tree;
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    const res = await fetch(`${API_URL}/api/curriculum`);
    if (!res.ok) throw new Error("Failed to load curriculum");
    const tree = await res.json();
    _buildCache(tree);
    return tree;
  })();
  return _loadPromise;
}

export async function reloadCurriculum() {
  _tree = null;
  _loadPromise = null;
  return loadCurriculum();
}

// ── Subject → language mapping ──────────────────────────────────────────────

const ARABIC_SUBJECTS = new Set([
  "arabe",
  "education_islamique",
  "histoire_geographie",
  "philosophie",
]);

export function getSubjectLanguage(subjectName) {
  const key = _normalize(subjectName);
  return ARABIC_SUBJECTS.has(key) ? "ar" : "fr";
}

// ── Public API (synchronous, cache-backed) ──────────────────────────────────

export const ALL_SPECIALTIES = new Proxy([], {
  get(target, prop) {
    if (prop === Symbol.iterator) return () => _allSpecialties[Symbol.iterator]();
    if (prop === "length") return _allSpecialties.length;
    if (prop === "map") return (...args) => _allSpecialties.map(...args);
    if (prop === "filter") return (...args) => _allSpecialties.filter(...args);
    if (prop === "find") return (...args) => _allSpecialties.find(...args);
    if (prop === "forEach") return (...args) => _allSpecialties.forEach(...args);
    if (prop === "some") return (...args) => _allSpecialties.some(...args);
    if (prop === "every") return (...args) => _allSpecialties.every(...args);
    if (prop === "reduce") return (...args) => _allSpecialties.reduce(...args);
    if (prop === "flatMap") return (...args) => _allSpecialties.flatMap(...args);
    if (prop === "slice") return (...args) => _allSpecialties.slice(...args);
    if (prop === "concat") return (...args) => _allSpecialties.concat(...args);
    if (prop === "indexOf") return (...args) => _allSpecialties.indexOf(...args);
    if (prop === "includes") return (...args) => _allSpecialties.includes(...args);
    const idx = typeof prop === "string" ? Number(prop) : NaN;
    if (!isNaN(idx)) return _allSpecialties[idx];
    return Reflect.get(_allSpecialties, prop);
  },
});

export const lyceeSpecialties = new Proxy([], {
  get(target, prop) {
    const data = _levelSpecialties["lycee"] || [];
    if (prop === Symbol.iterator) return () => data[Symbol.iterator]();
    if (prop === "length") return data.length;
    if (prop === "map") return (...args) => data.map(...args);
    if (prop === "filter") return (...args) => data.filter(...args);
    if (prop === "find") return (...args) => data.find(...args);
    if (prop === "forEach") return (...args) => data.forEach(...args);
    if (prop === "some") return (...args) => data.some(...args);
    if (prop === "slice") return (...args) => data.slice(...args);
    const idx = typeof prop === "string" ? Number(prop) : NaN;
    if (!isNaN(idx)) return data[idx];
    return Reflect.get(data, prop);
  },
});

export function getSchoolLevels() {
  return (_tree?.levels || []).map((l) => l.id);
}

export function getSchoolLevelsWithLabels() {
  return (_tree?.levels || []).map((l) => ({ id: l.id, label: l.label }));
}

export function getSpecialtiesForSchoolLevel(schoolLevel) {
  return _levelSpecialties[schoolLevel] || [];
}

export function getSubjectsBySpecialty(specialtyId) {
  return _specialtyMap[specialtyId]?.subjects || [];
}

export function getSpecialtyById(specialtyId) {
  return _specialtyMap[specialtyId] || null;
}

export function getChaptersForSubject(specialtyId, subjectName) {
  const key = `${specialtyId}|${_normalize(subjectName)}`;
  return _chapterCache[key] || { s1: [], s2: [] };
}

export function getDefaultSpecialty(user) {
  if (!user) return "6eme_annee_primaire";
  const ns = user.niveauScolaire || "primaire";
  if (ns === "lycee") return user.specialty || "tc";
  if (ns === "college") return "1ere_annee_college";
  return "6eme_annee_primaire";
}
