"""
curriculum/seed.py
------------------
Auto-seed the curriculum collections from the existing static data.
Runs once on first startup when school_levels is empty. Idempotent.
"""

import math


async def seed_curriculum(db):
    """Seed curriculum data into MongoDB if collections are empty."""
    count = await db.school_levels.count_documents({})
    if count > 0:
        print("[seed] Curriculum already seeded — skipping")
        return

    print("[seed] Seeding curriculum data…")

    # ── 1. School levels ─────────────────────────────────────────────────
    school_levels = [
        {"_id": "primaire", "label": "Primaire", "order": 0},
        {"_id": "college",  "label": "Collège",  "order": 1},
        {"_id": "lycee",    "label": "Lycée",    "order": 2},
    ]
    await db.school_levels.insert_many(school_levels)

    # ── 2. Specialties ───────────────────────────────────────────────────
    primary_specialties = [
        {"_id": "1ere_annee_primaire", "school_level": "primaire", "label": "1ère année primaire", "label_ar": "", "order": 0},
        {"_id": "2eme_annee_primaire", "school_level": "primaire", "label": "2ème année primaire", "label_ar": "", "order": 1},
        {"_id": "3eme_annee_primaire", "school_level": "primaire", "label": "3ème année primaire", "label_ar": "", "order": 2},
        {"_id": "4eme_annee_primaire", "school_level": "primaire", "label": "4ème année primaire", "label_ar": "", "order": 3},
        {"_id": "5eme_annee_primaire", "school_level": "primaire", "label": "5ème année primaire", "label_ar": "", "order": 4},
        {"_id": "6eme_annee_primaire", "school_level": "primaire", "label": "6ème année primaire", "label_ar": "", "order": 5},
    ]

    college_specialties = [
        {"_id": "1ere_annee_college", "school_level": "college", "label": "1ère année collège", "label_ar": "", "order": 0},
        {"_id": "2eme_annee_college", "school_level": "college", "label": "2ème année collège", "label_ar": "", "order": 1},
        {"_id": "3eme_annee_college", "school_level": "college", "label": "3ème année collège", "label_ar": "", "order": 2},
    ]

    lycee_specialties = [
        {"_id": "tc",        "school_level": "lycee", "label": "Tronc Commun",                    "label_ar": "الجذع المشترك علوم",               "order": 0},
        {"_id": "1bac_sm",   "school_level": "lycee", "label": "1Bac Sciences Mathématiques",      "label_ar": "الأولى باك علوم رياضية",           "order": 1},
        {"_id": "1bac_exp",  "school_level": "lycee", "label": "1Bac Sciences Expérimentales",     "label_ar": "الأولى باك علوم تجريبية",          "order": 2},
        {"_id": "2bac_sm_a", "school_level": "lycee", "label": "2Bac Sciences Mathématiques A",    "label_ar": "الثانية باك علوم رياضية أ",        "order": 3},
        {"_id": "2bac_sm_b", "school_level": "lycee", "label": "2Bac Sciences Mathématiques B",    "label_ar": "الثانية باك علوم رياضية ب",        "order": 4},
        {"_id": "2bac_svt",  "school_level": "lycee", "label": "2Bac SVT",                         "label_ar": "الثانية باك علوم الحياة والأرض",   "order": 5},
        {"_id": "2bac_pc",   "school_level": "lycee", "label": "2Bac Physique-Chimie",             "label_ar": "الثانية باك علوم فيزيائية",        "order": 6},
    ]

    all_specialties = primary_specialties + college_specialties + lycee_specialties
    await db.specialties.insert_many(all_specialties)

    # ── 3. Subjects per specialty ────────────────────────────────────────

    # Primary subjects (from matières_par_année.json)
    primary_subjects_1_3 = ["Mathematiques", "Activite_scientifique", "Arabe", "Francais", "Education_islamique", "Education_artistique"]
    primary_subjects_4_6 = ["Mathematiques", "Activite_scientifique", "Arabe", "Francais", "Histoire_Geographie", "Education_islamique", "Education_artistique"]

    primary_subject_map = {
        "1ere_annee_primaire": primary_subjects_1_3,
        "2eme_annee_primaire": primary_subjects_1_3,
        "3eme_annee_primaire": primary_subjects_1_3,
        "4eme_annee_primaire": primary_subjects_4_6,
        "5eme_annee_primaire": primary_subjects_4_6,
        "6eme_annee_primaire": primary_subjects_4_6,
    }

    college_subjects = ["Mathematiques", "Francais", "Arabe", "Physique_Chimie", "SVT", "Histoire_Geographie", "Education_islamique", "Anglais"]

    lycee_subject_map = {
        "tc":        ["Arabe", "Francais", "Anglais", "Mathematiques", "SVT", "Physique_Chimie", "Histoire_Geographie", "Education_islamique", "Informatique", "Philosophie"],
        "1bac_sm":   ["Arabe", "Francais", "Anglais", "Mathematiques", "Physique_Chimie", "Sciences_Ingenieur", "Philosophie", "Histoire_Geographie", "Education_islamique"],
        "1bac_exp":  ["Arabe", "Francais", "Anglais", "Mathematiques", "Physique_Chimie", "SVT", "Philosophie", "Histoire_Geographie", "Education_islamique"],
        "2bac_sm_a": ["Arabe", "Francais", "Anglais", "Mathematiques", "Physique_Chimie", "Philosophie", "Histoire_Geographie", "Education_islamique"],
        "2bac_sm_b": ["Arabe", "Francais", "Anglais", "Mathematiques", "Physique_Chimie", "Sciences_Ingenieur", "Philosophie", "Histoire_Geographie", "Education_islamique"],
        "2bac_svt":  ["Arabe", "Francais", "Anglais", "Mathematiques", "Physique_Chimie", "SVT", "Philosophie", "Histoire_Geographie", "Education_islamique"],
        "2bac_pc":   ["Arabe", "Francais", "Anglais", "Mathematiques", "Physique_Chimie", "SVT", "Philosophie", "Histoire_Geographie", "Education_islamique"],
    }

    subject_docs = []
    for spec_id, names in primary_subject_map.items():
        for i, name in enumerate(names):
            subject_docs.append({"specialty_id": spec_id, "name": name, "order": i})
    for spec_id in ["1ere_annee_college", "2eme_annee_college", "3eme_annee_college"]:
        for i, name in enumerate(college_subjects):
            subject_docs.append({"specialty_id": spec_id, "name": name, "order": i})
    for spec_id, names in lycee_subject_map.items():
        for i, name in enumerate(names):
            subject_docs.append({"specialty_id": spec_id, "name": name, "order": i})

    if subject_docs:
        await db.subjects.insert_many(subject_docs)

    # ── 4. Chapters ──────────────────────────────────────────────────────

    def _norm(value):
        import unicodedata
        nfkd = unicodedata.normalize("NFD", value)
        ascii_str = "".join(c for c in nfkd if unicodedata.category(c) != "Mn")
        return ascii_str.strip().lower().replace(" ", "_")

    def flat_to_s1_s2(items):
        """Split a flat list evenly into s1 and s2 halves."""
        half = math.ceil(len(items) / 2)
        return items[:half], items[half:]

    chapter_docs = []

    # ── 6ème primaire chapters (from chapitres_matières_6eme_année.json) ──
    _6eme_chapters = {
        "mathematiques": [
            "Nombres entiers et décimaux",
            "Opérations sur les nombres décimaux",
            "Nombres en écriture fractionnaire",
            "Proportionnalité",
            "Organisation et représentation de données (tableaux et graphiques)",
            "Règle, équerre et compas",
            "Figures planes (milieu, cercle, médiatrice d'un segment)",
            "Les angles",
            "Symétrie axiale",
            "Figures usuelles (triangles et quadrilatères)",
            "Périmètres et aires",
            "Géométrie dans l'espace (parallélépipède rectangle et volumes)",
        ],
        "francais": [
            "La phrase nominale et la phrase verbale",
            "L'adjectif qualificatif",
            "Le présent des verbes usuels",
            "L'imparfait des verbes usuels",
            "Lecture et compréhension de textes",
            "Production écrite",
            "Orthographe grammaticale",
        ],
        "arabe": [
            "النص القرائي",
            "التراكيب",
            "الصرف والتحويل",
            "الإملاء",
            "التعبير الكتابي",
        ],
        "sciences_et_technologie": [
            "Le corps humain et la santé",
            "Les êtres vivants et leur environnement",
            "La matière et ses transformations",
            "L'énergie",
            "Les objets techniques",
        ],
        "histoire_geographie": [
            "Les civilisations anciennes",
            "Le Maroc dans son environnement géographique",
            "Les ressources naturelles",
            "Population et activités humaines",
        ],
        "education_islamique": [
            "القرآن الكريم",
            "العقيدة",
            "الاقتداء",
            "الاستجابة",
            "القسط",
        ],
        "education_artistique": [
            "Dessin et expression artistique",
            "Couleurs et formes",
            "Création artistique",
        ],
    }

    # Subject alias: activite_scientifique → sciences_et_technologie
    _6eme_alias = {"activite_scientifique": "sciences_et_technologie"}

    for subj_name in primary_subject_map["6eme_annee_primaire"]:
        subj_norm = _norm(subj_name)
        lookup = _6eme_alias.get(subj_norm, subj_norm)
        names = _6eme_chapters.get(lookup, [])
        if names:
            s1, s2 = flat_to_s1_s2(names)
            for i, name in enumerate(s1):
                chapter_docs.append({"specialty_id": "6eme_annee_primaire", "subject_norm": subj_norm, "semester": "s1", "name": name, "order": i})
            for i, name in enumerate(s2):
                chapter_docs.append({"specialty_id": "6eme_annee_primaire", "subject_norm": subj_norm, "semester": "s2", "name": name, "order": i})

    # ── Default chapters for primary 1–5 (placeholder) ────────────────
    default_s1 = ["Introduction", "Notions essentielles"]
    default_s2 = ["Exercices guidés", "Révision finale"]

    for spec_id in ["1ere_annee_primaire", "2eme_annee_primaire", "3eme_annee_primaire",
                     "4eme_annee_primaire", "5eme_annee_primaire"]:
        for subj_name in primary_subject_map[spec_id]:
            subj_norm = _norm(subj_name)
            for i, name in enumerate(default_s1):
                chapter_docs.append({"specialty_id": spec_id, "subject_norm": subj_norm, "semester": "s1", "name": name, "order": i})
            for i, name in enumerate(default_s2):
                chapter_docs.append({"specialty_id": spec_id, "subject_norm": subj_norm, "semester": "s2", "name": name, "order": i})

    # ── College chapters ─────────────────────────────────────────────────
    college_chapters_data = {
        "mathematiques": (["Nombres relatifs", "Puissances et calculs"], ["Proportionnalité", "Géométrie plane"]),
        "francais":      (["Compréhension de texte", "Grammaire"], ["Conjugaison", "Rédaction"]),
        "arabe":         (["النصوص", "التراكيب"], ["الصرف", "التعبير"]),
        "physique_chimie": (["Matière", "Mouvement"], ["Energie", "Réactions chimiques"]),
        "svt":           (["Cellule", "Reproduction"], ["Ecosystèmes", "Santé"]),
        "histoire_geographie": (["Repères historiques", "Carte et territoire"], ["Population", "Citoyenneté"]),
        "education_islamique": (["القرآن", "العقيدة"], ["السيرة", "القيم"]),
        "anglais":       (["Basic communication", "Grammar essentials"], ["Vocabulary", "Reading"]),
    }

    for spec_id in ["1ere_annee_college", "2eme_annee_college", "3eme_annee_college"]:
        for subj_name in college_subjects:
            subj_norm = _norm(subj_name)
            s1_names, s2_names = college_chapters_data.get(subj_norm, (default_s1, default_s2))
            for i, name in enumerate(s1_names):
                chapter_docs.append({"specialty_id": spec_id, "subject_norm": subj_norm, "semester": "s1", "name": name, "order": i})
            for i, name in enumerate(s2_names):
                chapter_docs.append({"specialty_id": spec_id, "subject_norm": subj_norm, "semester": "s2", "name": name, "order": i})

    # ── Lycée chapters ───────────────────────────────────────────────────
    _2bac_sm_maths_s1 = [
        "Dérivation et étude des fonctions",
        "Fonctions exponentielles",
        "Fonctions logarithmiques",
        "Limites et continuité",
        "Nombres complexes",
        "Suites numériques",
    ]
    _2bac_sm_maths_s2 = [
        "Arithmétique dans Z",
        "Calcul de probabilités",
        "Calcul intégral",
        "Équations différentielles",
        "Espaces vectoriels",
        "Structures algébriques",
    ]

    lycee_specific_chapters = {
        ("2bac_sm_a", "mathematiques"): (_2bac_sm_maths_s1, _2bac_sm_maths_s2),
        ("2bac_sm_b", "mathematiques"): (_2bac_sm_maths_s1, _2bac_sm_maths_s2),
    }

    for spec_id, subjects_list in lycee_subject_map.items():
        for subj_name in subjects_list:
            subj_norm = _norm(subj_name)
            key = (spec_id, subj_norm)
            if key in lycee_specific_chapters:
                s1_names, s2_names = lycee_specific_chapters[key]
            else:
                s1_names, s2_names = default_s1, default_s2
            for i, name in enumerate(s1_names):
                chapter_docs.append({"specialty_id": spec_id, "subject_norm": subj_norm, "semester": "s1", "name": name, "order": i})
            for i, name in enumerate(s2_names):
                chapter_docs.append({"specialty_id": spec_id, "subject_norm": subj_norm, "semester": "s2", "name": name, "order": i})

    if chapter_docs:
        await db.chapters.insert_many(chapter_docs)

    # ── Indexes ──────────────────────────────────────────────────────────
    await db.specialties.create_index("school_level")
    await db.subjects.create_index([("specialty_id", 1), ("order", 1)])
    await db.chapters.create_index([("specialty_id", 1), ("subject_norm", 1), ("semester", 1), ("order", 1)])

    total_chapters = len(chapter_docs)
    total_subjects = len(subject_docs)
    total_specs = len(all_specialties)
    print(f"[seed] Done: {len(school_levels)} levels, {total_specs} specialties, {total_subjects} subjects, {total_chapters} chapters")
