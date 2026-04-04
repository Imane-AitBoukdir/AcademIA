import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import { useLanguage } from "./i18n";
import { loadCurriculum } from "./lib/curriculum";
import AdminPage from "./pages/AdminPage";
import CoursePage from "./pages/CoursePage";
import DashboardPage from "./pages/DashboardPage";
import ExercicePage from "./pages/ExercicePage";
import HomePage from "./pages/HomePage";
import MockExamsPage from "./pages/MockExamsPage";
import ProfAIPage from "./pages/ProfAIPage";
import ProfilPage from "./pages/ProfilPage";
import SettingsPage from "./pages/SettingsPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import SubjectPickerPage from "./pages/SubjectPickerPage";

function PublicLayout({ children }) {
	return (
		<>
			<Navbar />
			{children}
		</>
	);
}

export default function App() {
	const [ready, setReady] = useState(false);
	const [loadError, setLoadError] = useState(false);
	const { t } = useLanguage();

	const tryLoad = () => {
		setLoadError(false);
		loadCurriculum()
			.then(() => setReady(true))
			.catch(() => setLoadError(true));
	};

	useEffect(() => { tryLoad(); }, []);

	if (loadError) {
		return (
			<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-primary, #f9fafb)" }}>
				<div style={{ textAlign: "center", maxWidth: 360 }}>
					<p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8, color: "var(--text-primary, #1a1a2e)" }}>
						{t("common.loadError")}
					</p>
					<p style={{ fontSize: "0.9rem", color: "var(--text-secondary, #666)", marginBottom: 16 }}>
						{t("common.loadErrorDesc")}
					</p>
					<button
						type="button"
						onClick={tryLoad}
						style={{
							padding: "0.5rem 1.5rem", borderRadius: 8, border: "none",
							background: "var(--primary, #6C47B8)", color: "#fff",
							fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
						}}
					>
						{t("common.retry")}
					</button>
				</div>
			</div>
		);
	}

	if (!ready) {
		return (
			<div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
				<div className="text-center">
					<div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
					<p className="text-gray-600 dark:text-gray-300">{t("common.loading")}</p>
				</div>
			</div>
		);
	}

	return (
		<Routes>
			<Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
			<Route path="/signin" element={<PublicLayout><SignInPage /></PublicLayout>} />
			<Route path="/signup" element={<PublicLayout><SignUpPage /></PublicLayout>} />
			<Route path="/dashboard" element={<DashboardPage />} />
			<Route path="/pick/:mode" element={<SubjectPickerPage />} />
			<Route path="/courses/:specialty/:subject" element={<CoursePage />} />
			<Route path="/exercises/:specialty/:subject" element={<ExercicePage />} />
			<Route path="/mock-exams/:specialty/:subject" element={<MockExamsPage />} />
			<Route path="/prof-ai" element={<ProfAIPage />} />
			<Route path="/profil" element={<ProfilPage />} />
			<Route path="/settings" element={<SettingsPage />} />
			<Route path="/admin" element={<AdminPage />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
