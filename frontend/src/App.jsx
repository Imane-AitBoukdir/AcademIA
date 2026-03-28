import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import CoursePage from "./pages/CoursePage";
import DashboardPage from "./pages/DashboardPage";
import ExercicePage from "./pages/ExercicePage";
import HomePage from "./pages/HomePage";
import MockExamsPage from "./pages/MockExamsPage";
import ProfAIPage from "./pages/ProfAIPage";
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
	return (
		<Routes>
			<Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
			<Route path="/signin" element={<PublicLayout><SignInPage /></PublicLayout>} />
			<Route path="/signup" element={<PublicLayout><SignUpPage /></PublicLayout>} />
			<Route path="/dashboard" element={<DashboardPage />} />
			<Route path="/pick/:mode" element={<SubjectPickerPage />} />
			<Route path="/courses/:level/:subject" element={<CoursePage />} />
			<Route path="/exercises/:level/:subject" element={<ExercicePage />} />
			<Route path="/mock-exams/:level/:subject" element={<MockExamsPage />} />
			<Route path="/prof-ai" element={<ProfAIPage />} />
			<Route path="/profil" element={<DashboardPage />} />
			<Route path="/settings" element={<DashboardPage />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
