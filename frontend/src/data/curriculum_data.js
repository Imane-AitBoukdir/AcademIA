/**
 * Comprehensive curriculum data for AcademIA.
 *
 * Hierarchy:
 *   schoolLevel  →  specialty (id)  →  subjects[]
 *
 * School levels: primaire, college, lycee
 * Each specialty maps to a list of subjects.
 *
 * PDF path convention (all levels):
 *   /pdfs/{type}/{language}/{specialty}/{subject}/{semester}/{lesson_name}.pdf
 *   type     = courses | exercices | exams
 *   language = fr | ar   (derived from subject)
 *   semester = s1 | s2
 */

import chapterData from "./chapitres_matières_6eme_année.json";
import levelData from "./matières_par_année.json";

// ── Subject → language mapping ──────────────────────────────────────────────
// Subjects taught in Arabic in Morocco's curriculum
const ARABIC_SUBJECTS = new Set([
  "arabe",
  "education_islamique",
  "histoire_geographie",
  "philosophie",
]);

export function getSubjectLanguage(subjectName) {
  const key = subjectName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
  return ARABIC_SUBJECTS.has(key) ? "ar" : "fr";
}

// ── Specialty definitions ───────────────────────────────────────────────────

// Primaire — 6 levels, subjects from JSON
const primarySpecialties = (levelData.primary_morocco || []).map((entry) => ({
  id: entry.level,
  label: entry.level.replaceAll("_", " "),
  subjects: entry.subjects,
}));

// College — 3 levels
const collegeSubjects = [
  "Mathematiques",
  "Francais",
  "Arabe",
  "Physique_Chimie",
  "SVT",
  "Histoire_Geographie",
  "Education_islamique",
  "Anglais",
];

const collegeSpecialties = [
  { id: "1ere_annee_college", label: "1ère année collège", subjects: collegeSubjects },
  { id: "2eme_annee_college", label: "2ème année collège", subjects: collegeSubjects },
  { id: "3eme_annee_college", label: "3ème année collège", subjects: collegeSubjects },
];

// Lycée — 7 streams
const lyceeSpecialties = [
  {
    id: "tc",
    label: "Tronc Commun",
    labelAr: "الجذع المشترك علوم",
    subjects: [
      "Arabe", "Francais", "Anglais", "Mathematiques", "SVT",
      "Physique_Chimie", "Histoire_Geographie", "Education_islamique",
      "Informatique", "Philosophie",
    ],
  },
  {
    id: "1bac_sm",
    label: "1Bac Sciences Mathématiques",
    labelAr: "الأولى باك علوم رياضية",
    subjects: [
      "Arabe", "Francais", "Anglais", "Mathematiques", "Physique_Chimie",
      "Sciences_Ingenieur", "Philosophie", "Histoire_Geographie",
      "Education_islamique",
    ],
  },
  {
    id: "1bac_exp",
    label: "1Bac Sciences Expérimentales",
    labelAr: "الأولى باك علوم تجريبية",
    subjects: [
      "Arabe", "Francais", "Anglais", "Mathematiques", "Physique_Chimie",
      "SVT", "Philosophie", "Histoire_Geographie", "Education_islamique",
    ],
  },
  {
    id: "2bac_sm_a",
    label: "2Bac Sciences Mathématiques A",
    labelAr: "الثانية باك علوم رياضية أ",
    subjects: [
      "Arabe", "Francais", "Anglais", "Mathematiques", "Physique_Chimie",
      "Philosophie", "Histoire_Geographie", "Education_islamique",
    ],
  },
  {
    id: "2bac_sm_b",
    label: "2Bac Sciences Mathématiques B",
    labelAr: "الثانية باك علوم رياضية ب",
    subjects: [
      "Arabe", "Francais", "Anglais", "Mathematiques", "Physique_Chimie",
      "Sciences_Ingenieur", "Philosophie", "Histoire_Geographie",
      "Education_islamique",
    ],
  },
  {
    id: "2bac_svt",
    label: "2Bac SVT",
    labelAr: "الثانية باك علوم الحياة والأرض",
    subjects: [
      "Arabe", "Francais", "Anglais", "Mathematiques", "Physique_Chimie",
      "SVT", "Philosophie", "Histoire_Geographie", "Education_islamique",
    ],
  },
  {
    id: "2bac_pc",
    label: "2Bac Physique-Chimie",
    labelAr: "الثانية باك علوم فيزيائية",
    subjects: [
      "Arabe", "Francais", "Anglais", "Mathematiques", "Physique_Chimie",
      "SVT", "Philosophie", "Histoire_Geographie", "Education_islamique",
    ],
  },
];

// ── All specialties in a flat lookup ────────────────────────────────────────

const ALL_SPECIALTIES = [
  ...primarySpecialties,
  ...collegeSpecialties,
  ...lyceeSpecialties,
];

const specialtyMap = Object.fromEntries(
  ALL_SPECIALTIES.map((s) => [s.id, s]),
);

// ── Chapter data ────────────────────────────────────────────────────────────

const subjectAliases = {
  activite_scientifique: "sciences_et_technologie",
};

// ── Chapter helpers ──────────────────────────────────────────────────────────
// Each chapter entry: { name: string }
// PDFs are fetched dynamically from the GridFS API.

function mkChapters(s1Names, s2Names) {
  return {
    s1: s1Names.map((name) => ({ name })),
    s2: s2Names.map((name) => ({ name })),
  };
}

// Split a flat name array evenly across s1 and s2 (used for JSON-sourced data)
function flatToGrouped(arr) {
  if (!arr?.length) return { s1: [], s2: [] };
  const half = Math.ceil(arr.length / 2);
  return {
    s1: arr.slice(0, half).map((name) => ({ name })),
    s2: arr.slice(half).map((name) => ({ name })),
  };
}

const collegeChapters = {
  mathematiques: mkChapters(
    ["Nombres relatifs", "Puissances et calculs"],
    ["Proportionnalité", "Géométrie plane"],
  ),
  francais: mkChapters(
    ["Compréhension de texte", "Grammaire"],
    ["Conjugaison", "Rédaction"],
  ),
  arabe: mkChapters(
    ["النصوص", "التراكيب"],
    ["الصرف", "التعبير"],
  ),
  physique_chimie: mkChapters(
    ["Matière", "Mouvement"],
    ["Energie", "Réactions chimiques"],
  ),
  svt: mkChapters(
    ["Cellule", "Reproduction"],
    ["Ecosystèmes", "Santé"],
  ),
  histoire_geographie: mkChapters(
    ["Repères historiques", "Carte et territoire"],
    ["Population", "Citoyenneté"],
  ),
  education_islamique: mkChapters(
    ["القرآن", "العقيدة"],
    ["السيرة", "القيم"],
  ),
  anglais: mkChapters(
    ["Basic communication", "Grammar essentials"],
    ["Vocabulary", "Reading"],
  ),
};

// Maths chapters shared by 2Bac SM A and B
const _2bacSM_maths = mkChapters(
  [
    "Dérivation et étude des fonctions",
    "Fonctions exponentielles",
    "Fonctions logarithmiques",
    "Limites et continuité",
    "Nombres complexes",
    "Suites numériques",
  ],
  [
    "Arithmétique dans Z",
    "Calcul de probabilités",
    "Calcul intégral",
    "Équations différentielles",
    "Espaces vectoriels",
    "Structures algébriques",
  ],
);

const lyceeChapters = {
  "2bac_sm_a": { mathematiques: _2bacSM_maths },
  "2bac_sm_b": { mathematiques: _2bacSM_maths },
};

const defaultChapters = mkChapters(
  ["Introduction", "Notions essentielles"],
  ["Exercices guidés", "Révision finale"],
);

// ── Public API ──────────────────────────────────────────────────────────────

export { ALL_SPECIALTIES, collegeSpecialties, lyceeSpecialties, primarySpecialties };

export function getSchoolLevels() {
  return ["primaire", "college", "lycee"];
}

/**
 * Returns the list of specialties for a given school level.
 * Each item: { id, label, labelAr?, subjects }
 */
export function getSpecialtiesForSchoolLevel(schoolLevel) {
  if (schoolLevel === "primaire") return primarySpecialties;
  if (schoolLevel === "college") return collegeSpecialties;
  if (schoolLevel === "lycee") return lyceeSpecialties;
  return [];
}

/**
 * Returns subjects for a specialty ID (e.g. "tc", "6eme_annee_primaire").
 */
export function getSubjectsBySpecialty(specialtyId) {
  return specialtyMap[specialtyId]?.subjects || [];
}

/**
 * Returns the specialty object by ID.
 */
export function getSpecialtyById(specialtyId) {
  return specialtyMap[specialtyId] || null;
}

/**
 * Returns chapters for a given specialty + subject.
 * Uses JSON data where available, otherwise falls back to hardcoded/default.
 */
export function getChaptersForSubject(specialtyId, subjectName) {
  const normalized = subjectName
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_");

  // 6ème primaire JSON data → split evenly across s1 / s2
  if (specialtyId === chapterData.level) {
    const key = subjectAliases[normalized] || normalized;
    const chapters = chapterData.subjects[key];
    if (chapters?.length) return flatToGrouped(chapters);
  }

  // College
  if (specialtyId.includes("college")) {
    return collegeChapters[normalized] || defaultChapters;
  }

  // Lycée — static chapter data
  if (lyceeChapters[specialtyId]?.[normalized]) {
    return lyceeChapters[specialtyId][normalized];
  }

  return defaultChapters;
}

/**
 * Derives the default specialty ID from the user's stored profile.
 */
export function getDefaultSpecialty(user) {
  if (!user) return "6eme_annee_primaire";
  const ns = user.niveauScolaire || "primaire";
  if (ns === "lycee") return user.specialty || "tc";
  if (ns === "college") return "1ere_annee_college";
  return "6eme_annee_primaire";
}
