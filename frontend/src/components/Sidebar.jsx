import {
  BookOpen,
  Bot,
  Dumbbell,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../i18n";

const baseKeys = [
  { icon: LayoutDashboard, key: "sidebar.dashboard", path: "/dashboard", match: "exact" },
  { icon: BookOpen, key: "sidebar.subjects", path: "/pick/courses", match: "/courses" },
  { icon: Dumbbell, key: "sidebar.exercises", path: "/pick/exercises", match: "/exercises" },
  { icon: GraduationCap, key: "sidebar.mockExams", path: "/pick/mock-exams", match: "/mock-exams" },
  { icon: Bot, key: "sidebar.profAi", path: "/prof-ai", match: "/prof-ai" },
  { icon: UserCircle, key: "sidebar.profile", path: "/profil", match: "/profil" },
  { icon: Settings, key: "sidebar.settings", path: "/settings", match: "/settings" },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const { t } = useLanguage();
  const user = JSON.parse(localStorage.getItem("academiaUser") || "{}");
  const items = user.role === "admin"
    ? [...baseKeys, { icon: Shield, key: "sidebar.admin", path: "/admin", match: "/admin" }]
    : baseKeys;

  return (
    <>
      <div
        className={`sidebar-overlay${open ? " visible" : ""}`}
        onClick={onClose}
      />
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="sidebar-logo">
          <Link to="/dashboard">
            <Sparkles size={18} className="sidebar-logo-icon" />
            AcademIA
          </Link>
        </div>
        <nav className="sidebar-nav">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.match === "exact"
              ? location.pathname === item.path
              : location.pathname.startsWith(item.match) || location.pathname === item.path;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`sidebar-item${active ? " active" : ""}`}
                onClick={onClose}
              >
                <span className="sidebar-item-icon">
                  <Icon size={18} />
                </span>
                <span>{t(item.key)}</span>
                {active && <span className="sidebar-active-dot" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <Link to="/" className="sidebar-item">
            <span className="sidebar-item-icon">
              <LogOut size={18} />
            </span>
            <span>{t("sidebar.logout")}</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
