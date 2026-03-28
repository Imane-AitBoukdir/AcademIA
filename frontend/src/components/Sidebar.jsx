import {
    BookOpen,
    Bot,
    Dumbbell,
    GraduationCap,
    LayoutDashboard,
    LogOut,
    Settings,
    Sparkles,
    UserCircle,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const items = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", match: "exact" },
  { icon: BookOpen, label: "Subjects", path: "/pick/courses", match: "/courses" },
  { icon: Dumbbell, label: "Exercises", path: "/pick/exercises", match: "/exercises" },
  { icon: GraduationCap, label: "Mock Exams", path: "/pick/mock-exams", match: "/mock-exams" },
  { icon: Bot, label: "Prof IA", path: "/prof-ai", match: "/prof-ai" },
  { icon: UserCircle, label: "Profil", path: "/profil", match: "/profil" },
  { icon: Settings, label: "Settings", path: "/settings", match: "/settings" },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  return (
    <>
      <div
        className={`sidebar-overlay${open ? " visible" : ""}`}
        onClick={onClose}
      />
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="sidebar-logo">
          <Link to="/">
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
                key={item.label}
                to={item.path}
                className={`sidebar-item${active ? " active" : ""}`}
                onClick={onClose}
              >
                <span className="sidebar-item-icon">
                  <Icon size={18} />
                </span>
                <span>{item.label}</span>
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
            <span>Log out</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
