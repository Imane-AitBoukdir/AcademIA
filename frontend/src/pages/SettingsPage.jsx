import { motion } from "framer-motion";
import { Globe, Menu, Moon, Sun, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useLanguage } from "../i18n";

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const [ttsEnabled, setTtsEnabled] = useState(() => localStorage.getItem("academia_tts") !== "off");
  const [theme, setTheme] = useState(() => localStorage.getItem("academia_theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("academia_theme", theme);
  }, [theme]);

  const saveLang = (v) => { setLang(v); };
  const saveTts = (v) => { setTtsEnabled(v); localStorage.setItem("academia_tts", v ? "on" : "off"); };

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="dashboard-main">
        <header className="course-top-bar" style={{ marginBottom: "1.5rem" }}>
          <button
            className="mobile-sidebar-toggle"
            type="button"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>
          <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{t("settings.title")}</h1>
        </header>

        <motion.div
          style={{ maxWidth: 640, margin: "0 auto" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Language */}
          <div className="settings-card">
            <div className="settings-card-header">
              <Globe size={18} />
              <h2>{t("settings.language")}</h2>
            </div>
            <p className="settings-desc">{t("settings.languageDesc")}</p>
            <div className="settings-options">
              {[
                { value: "fr", label: "Français" },
                { value: "ar", label: "العربية" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`settings-option${lang === opt.value ? " active" : ""}`}
                  onClick={() => saveLang(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* TTS */}
          <div className="settings-card">
            <div className="settings-card-header">
              <Volume2 size={18} />
              <h2>{t("settings.tts")}</h2>
            </div>
            <p className="settings-desc">{t("settings.ttsDesc")}</p>
            <label className="settings-toggle-label">
              <span>{ttsEnabled ? t("settings.ttsOn") : t("settings.ttsOff")}</span>
              <button
                type="button"
                className={`settings-toggle${ttsEnabled ? " active" : ""}`}
                onClick={() => saveTts(!ttsEnabled)}
                aria-label="Toggle TTS"
              >
                <span className="settings-toggle-knob" />
              </button>
            </label>
          </div>

          {/* Theme */}
          <div className="settings-card">
            <div className="settings-card-header">
              {theme === "light" ? <Sun size={18} /> : <Moon size={18} />}
              <h2>{t("settings.theme")}</h2>
            </div>
            <p className="settings-desc">{t("settings.themeDesc")}</p>
            <div className="settings-options">
              <button
                type="button"
                className={`settings-option${theme === "light" ? " active" : ""}`}
                onClick={() => setTheme("light")}
              >
                <Sun size={15} /> {t("settings.themeLight")}
              </button>
              <button
                type="button"
                className={`settings-option${theme === "dark" ? " active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                <Moon size={15} /> {t("settings.themeDark")}
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
