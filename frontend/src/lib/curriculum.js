import levelData from "../data/matières_par_année.json";
import chapterData from "../data/chapitres_matières_6eme_année.json";

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

const collegeChapters = {
  mathematiques: [
    "Nombres relatifs",
    "Puissances et calculs",
    "Proportionnalité",
    "Géométrie plane",
  ],
  francais: ["Compréhension de texte", "Grammaire", "Conjugaison", "Rédaction"],
  arabe: ["النصوص", "التراكيب", "الصرف", "التعبير"],
  physique_chimie: ["Matière", "Mouvement", "Energie", "Réactions chimiques"],
  svt: ["Cellule", "Reproduction", "Ecosystèmes", "Santé"],
  histoire_geographie: ["Repères historiques", "Carte et territoire", "Population", "Citoyenneté"],
  education_islamique: ["القرآن", "العقيدة", "السيرة", "القيم"],
  anglais: ["Basic communication", "Grammar essentials", "Vocabulary", "Reading"],
};

const subjectAliases = {
  activite_scientifique: "sciences_et_technologie",
};

export function normalizeValue(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export const primaryLevels = levelData.primary_morocco || [];

export function getLevelOptions() {
  const primary = primaryLevels.map((item) => item.level);
  return [...primary, "1ere_annee_college", "2eme_annee_college", "3eme_annee_college"];
}

export function getSubjectsByLevel(level) {
  const found = primaryLevels.find((entry) => entry.level === level);
  if (found) {
    return found.subjects;
  }
  return collegeSubjects;
}

export function getChaptersForSubject(level, subjectName) {
  const normalized = normalizeValue(subjectName);

  if (level === chapterData.level) {
    const key = subjectAliases[normalized] || normalized;
    const chapters = chapterData.subjects[key];
    if (chapters?.length) {
      return chapters;
    }
  }

  return collegeChapters[normalized] || [
    "Introduction",
    "Notions essentielles",
    "Exercices guidés",
    "Révision finale",
  ];
}

export function formatSubjectName(subject) {
  return subject.replaceAll("_", " ");
}
