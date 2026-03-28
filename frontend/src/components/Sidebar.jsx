import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Dumbbell,
  GraduationCap,
  Settings,
  LogOut,
  Sparkles,
  Bot,
  UserCircle,
} from "lucide-react";

const items = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: BookOpen, label: "Subjects", path: "/dashboard" },
  { icon: Dumbbell, label: "Exercises", path: "/dashboard" },
  { icon: GraduationCap, label: "Mock Exams", path: "/dashboard" },
  { icon: Bot, label: "Prof IA", path: "/dashboard" },
  { icon: UserCircle, label: "Profil", path: "/dashboard" },
  { icon: Settings, label: "Settings", path: "/dashboard" },
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
            const active =
              item.label === "Dashboard"
                ? location.pathname === "/dashboard"
                : item.label === "Subjects"
                  ? location.pathname.startsWith("/courses")
                  : false;
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
