import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Home, PenTool } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function HomePage() {
  const { t } = useLanguage();

  const heroCards = [
    { className: "hero-card hero-card-purple", icon: <BookOpen size={20} />, title: t("home.feat1Title"), desc: t("home.feat1Desc") },
    { className: "hero-card hero-card-gold", icon: <PenTool size={20} />, title: t("home.feat2Title"), desc: t("home.feat2Desc") },
    { className: "hero-card hero-card-mint", icon: <ChevronRight size={20} />, title: t("home.feat3Title"), desc: t("home.feat3Desc") },
  ];

  const features = [
    { title: t("home.feat1Title"), desc: t("home.feat1Desc"), accent: "mint", icon: <BookOpen size={20} /> },
    { title: t("home.feat2Title"), desc: t("home.feat2Desc"), accent: "peach", icon: <PenTool size={20} /> },
    { title: t("home.feat3Title"), desc: t("home.feat3Desc"), accent: "lavender", icon: <ChevronRight size={20} /> },
    { title: t("home.feat4Title"), desc: t("home.feat4Desc"), accent: "primary", icon: <Home size={20} /> },
  ];

  const steps = [
    { num: "01", title: t("home.step1Title"), desc: t("home.step1Desc") },
    { num: "02", title: t("home.step2Title"), desc: t("home.step2Desc") },
    { num: "03", title: t("home.step3Title"), desc: t("home.step3Desc") },
  ];

  return (
    <div className="home-page">
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <motion.div className="hero-copy" {...fadeUp}>
              <p className="hero-kicker">Maroc • Élèves • Apprendre avec plaisir</p>
              <h1>
                {t("home.heroTitle1")}<span className="hero-accent hero-accent-blue">{t("home.heroTitle2")}</span>
                {" "}<span className="hero-accent hero-accent-purple">{t("home.heroTitle3")}</span>
                {" "}{t("home.heroTitle4")}{" "}
                <span className="hero-accent hero-accent-orange">{t("home.heroTitle5")}</span>
              </h1>
              <p className="hero-sub">
                {t("home.heroSubtitle")}
              </p>
              <div className="hero-actions">
                <Link to="/signup" className="btn btn-primary">{t("home.cta")}</Link>
                <a href="#features" className="btn btn-outline">{t("home.ctaSecondary")}</a>
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
            <p className="section-label">{t("nav.features")}</p>
            <h2>{t("home.featuresTitle")} {t("home.featuresSubtitle")}</h2>
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
            <p className="section-label">{t("nav.howItWorks")}</p>
            <h2>{t("home.howTitle")} <span className="accent">{t("home.howTitleAccent")}</span></h2>
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
              <p className="section-label">{t("nav.aiTutor")}</p>
              <h2>{t("home.aiTitle")} {t("home.aiTitleAccent")}</h2>
              <p>{t("home.aiDesc")}</p>
              <ul className="ai-tutor-list">
                <li>{t("home.aiPoint1")}</li>
                <li>{t("home.aiPoint2")}</li>
                <li>{t("home.aiPoint3")}</li>
                <li>{t("home.aiPoint4")}</li>
              </ul>
              <Link to="/signup" className="btn btn-primary">{t("home.aiTry")}</Link>
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
            © {new Date().getFullYear()} AcademIA. {t("home.footerRights")}
          </p>
        </div>
      </footer>
    </div>
  );
}
