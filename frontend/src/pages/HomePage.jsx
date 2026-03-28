import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, PenTool, Home, ChevronRight } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const features = [
  {
    title: "Moroccan Curriculum",
    desc: "Complete lessons aligned with the official Moroccan education program, from primary to middle school.",
    accent: "mint",
    icon: <BookOpen size={20} />,
  },
  {
    title: "Interactive Exercises",
    desc: "Practice with exercises designed for each chapter, with instant feedback to help you improve.",
    accent: "peach",
    icon: <PenTool size={20} />,
  },
  {
    title: "AI Tutor",
    desc: "A personal tutor that explains lessons, answers questions, and helps with homework in Arabic or French.",
    accent: "lavender",
    icon: <ChevronRight size={20} />,
  },
  {
    title: "Learn Anywhere",
    desc: "Access your classroom from any device, whether at home, in a shelter, or on the go.",
    accent: "primary",
    icon: <Home size={20} />,
  },
];

const steps = [
  { num: "01", title: "Create your account", desc: "Simple registration with your school level and basic info." },
  { num: "02", title: "Choose your subject", desc: "Browse your curriculum and pick the chapter you need." },
  { num: "03", title: "Learn with AI", desc: "Study the lesson, practice exercises, and ask the tutor for help." },
];

const heroCards = [
  {
    title: "Bilingual lessons",
    desc: "Move between Arabic and French learning support with ease.",
    className: "hero-card hero-card-purple",
    icon: <BookOpen size={18} />,
  },
  {
    title: "Interactive exercises",
    desc: "Practice chapter by chapter with instant feedback.",
    className: "hero-card hero-card-gold",
    icon: <PenTool size={18} />,
  },
  {
    title: "Study from anywhere",
    desc: "Keep learning at home, on the move, or during distance learning.",
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
              <p className="hero-kicker">Morocco • Students • Joyful Learning</p>
              <h1>
                A brighter way to <span className="hero-accent hero-accent-pink">study,</span>{" "}
                <span className="hero-accent hero-accent-purple">grow,</span>
                <br />
                and <span className="hero-accent hero-accent-orange">stay excited about school.</span>
              </h1>
              <p className="hero-sub">
                AcademIA gives Moroccan students a warm, inspiring learning space
                with lessons, exercises, and an AI tutor designed for real school life.
              </p>
              <div className="hero-actions">
                <Link to="/signup" className="btn btn-primary">Start Learning</Link>
                <a href="#features" className="btn btn-outline">Explore Subjects</a>
              </div>
              <div className="hero-chips">
                <span className="hero-chip">Primary to middle school</span>
                <span className="hero-chip">Arabic and French support</span>
                <span className="hero-chip">Friendly AI tutor</span>
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
                <span>Learn</span>
                <span>Dream</span>
                <span>Grow</span>
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
            <p className="section-label">Features</p>
            <h2>Everything a student needs to succeed</h2>
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
            <p className="section-label">How it works</p>
            <h2>Start learning in three simple steps</h2>
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
              <p className="section-label">AI Tutor</p>
              <h2>Your personal learning assistant</h2>
              <p>
                The AI tutor understands your curriculum and speaks your
                language. It can:
              </p>
              <ul className="ai-tutor-list">
                <li>Explain any lesson step by step</li>
                <li>Answer questions in Arabic or French</li>
                <li>Help with homework from photos or documents</li>
                <li>Quiz you to prepare for exams</li>
              </ul>
              <Link to="/signup" className="btn btn-primary">Try it now</Link>
            </div>
            <div className="ai-tutor-preview">
              <div className="chat-preview">
                <div className="chat-bubble chat-ai">
                  <p>
                    Hello. I am your AI tutor. What would you like to learn today?
                  </p>
                </div>
                <div className="chat-bubble chat-user">
                  <p>Can you explain proportionality to me?</p>
                </div>
                <div className="chat-bubble chat-ai">
                  <p>
                    Of course. Proportionality means that two quantities change
                    at the same rate, so when one doubles, the other doubles too...
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
            Accessible education for every Moroccan student.
          </p>
        </div>
      </footer>
    </div>
  );
}
