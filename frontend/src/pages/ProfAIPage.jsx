import { motion } from "framer-motion";
import { GraduationCap, Menu } from "lucide-react";
import { useState } from "react";
import AIChatPanel from "../components/AIChatPanel";
import Sidebar from "../components/Sidebar";

export default function ProfAIPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* Read level from stored user profile */
  let level = "";
  try {
    const raw = localStorage.getItem("academiaUser");
    if (raw) {
      const u = JSON.parse(raw);
      level = u.niveauScolaire || "";
    }
  } catch {
    /* ignore */
  }

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="dashboard-main" style={{ display: "flex", flexDirection: "column" }}>
        <header className="course-top-bar">
          <button
            className="mobile-sidebar-toggle"
            type="button"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <GraduationCap size={20} style={{ color: "var(--primary)" }} />
            <h1 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>
              Prof IA
            </h1>
          </div>
          {level && (
            <p className="course-level-badge">{level.replaceAll("_", " ")}</p>
          )}
        </header>

        <motion.div
          style={{ flex: 1, minHeight: 0, display: "flex" }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <AIChatPanel mode="general" level={level} fullWidth />
        </motion.div>
      </main>
    </div>
  );
}
