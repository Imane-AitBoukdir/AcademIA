import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Home, PenTool } from "lucide-react";
import { Link } from "react-router-dom";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const features = [
  {
    title: "Programme Marocain",
    desc: "Des cours complets alignés avec le programme officiel de l'éducation marocaine, du primaire au collège.",
    accent: "mint",
    icon: <BookOpen size={20} />,
  },
  {
    title: "Exercices Interactifs",
    desc: "Entraînez-vous avec des exercices conçus pour chaque chapitre, avec un retour instantané.",
    accent: "peach",
    icon: <PenTool size={20} />,
  },
  {
    title: "Tuteur IA",
    desc: "Un tuteur personnel qui explique les cours, répond aux questions et aide aux devoirs en arabe ou en français.",
    accent: "lavender",
    icon: <ChevronRight size={20} />,
  },
  {
    title: "Apprenez Partout",
    desc: "Accédez à votre classe depuis n'importe quel appareil, que ce soit à la maison ou en déplacement.",
    accent: "primary",
    icon: <Home size={20} />,
  },
];

const steps = [
  { num: "01", title: "Créez votre compte", desc: "Inscription simple avec votre niveau scolaire et vos informations." },
  { num: "02", title: "Choisissez votre matière", desc: "Parcourez votre programme et choisissez le chapitre souhaité." },
  { num: "03", title: "Apprenez avec l'IA", desc: "Étudiez le cours, pratiquez les exercices et demandez l'aide du tuteur." },
];

const heroCards = [
  {
    title: "Cours bilingues",
    desc: "Passez facilement entre l'arabe et le français.",
    className: "hero-card hero-card-purple",
    icon: <BookOpen size={18} />,
  },
  {
    title: "Exercices interactifs",
    desc: "Entraînez-vous chapitre par chapitre avec un retour instantané.",
    className: "hero-card hero-card-gold",
    icon: <PenTool size={18} />,
  },
  {
    title: "Étudiez partout",
    desc: "Continuez à apprendre à la maison, en déplacement, ou à distance.",
    className: "hero-card hero-card-mint",
    icon: <Home size={18} />,
  },
];

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <motion.div className="hero-copy" {...fadeUp}>
              <p className="hero-kicker">Maroc • Élèves • Apprendre avec plaisir</p>
              <h1>
                Une meilleure façon d'<span className="hero-accent hero-accent-pink">étudier,</span>{" "}
                <span className="hero-accent hero-accent-purple">grandir,</span>
                <br />
                et <span className="hero-accent hero-accent-orange">rester motivé à l'école.</span>
              </h1>
              <p className="hero-sub">
                AcademIA offre aux élèves marocains un espace d'apprentissage chaleureux et inspirant
                avec des cours, exercices et un tuteur IA conçu pour la vie scolaire réelle.
              </p>
              <div className="hero-actions">
                <Link to="/signup" className="btn btn-primary">Commencer</Link>
                <a href="#features" className="btn btn-outline">Explorer les matières</a>
              </div>
              <div className="hero-chips">
                <span className="hero-chip">Du primaire au Lycée</span>
                <span className="hero-chip">Support arabe et français</span>
                <span className="hero-chip">Tuteur IA bienveillant</span>
              </div>
            </motion.div>

            <motion.div
              className="hero-stage"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="hero-stage-board" />
              <div className="hero-stage-title">
                <span>Apprendre</span>
                <span>Rêver</span>
                <span>Grandir</span>
              </div>
              {heroCards.map((card, index) => (
                <div key={card.title} className={`${card.className} hero-card-${index + 1}`}>
                  <div className="hero-card-icon">{card.icon}</div>
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section id="features" className="section section-alt">
        <div className="container">
          <div className="section-header">
            <p className="section-label">Fonctionnalités</p>
            <h2>Tout ce dont un élève a besoin pour réussir</h2>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className={`feature-card accent-${f.accent}`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
              >
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section">
        <div className="container">
          <div className="section-header">
            <p className="section-label">Comment ça marche</p>
            <h2>Commencez à apprendre en trois étapes simples</h2>
          </div>
          <div className="steps-grid">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                className="step-card"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <span className="step-num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="ai-tutor" className="section section-alt">
        <div className="container">
          <div className="ai-tutor-block">
            <div className="ai-tutor-text">
              <p className="section-label">Tuteur IA</p>
              <h2>Votre assistant d'apprentissage personnel</h2>
              <p>
                Le tuteur IA comprend votre programme et parle votre
                langue. Il peut :
              </p>
              <ul className="ai-tutor-list">
                <li>Expliquer n'importe quel cours étape par étape</li>
                <li>Répondre aux questions en arabe ou en français</li>
                <li>Aider avec les devoirs à partir de photos ou documents</li>
                <li>Vous interroger pour préparer les examens</li>
              </ul>
              <Link to="/signup" className="btn btn-primary">Essayer maintenant</Link>
            </div>
            <div className="ai-tutor-preview">
              <div className="chat-preview">
                <div className="chat-bubble chat-ai">
                  <p>
                    Bonjour. Je suis votre tuteur IA. Qu'aimeriez-vous apprendre aujourd'hui ?
                  </p>
                </div>
                <div className="chat-bubble chat-user">
                  <p>Tu peux m'expliquer la proportionnalité ?</p>
                </div>
                <div className="chat-bubble chat-ai">
                  <p>
                    Bien sûr. La proportionnalité signifie que deux grandeurs varient
                    au même rythme, donc quand l'une double, l'autre double aussi...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <p className="footer-logo">AcademIA</p>
          <p className="footer-copy">
            Une éducation accessible pour chaque élève marocain.
          </p>
        </div>
      </footer>
    </div>
  );
}
