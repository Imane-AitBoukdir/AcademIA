import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import DashboardPage from "./pages/DashboardPage";
import CoursePage from "./pages/CoursePage";

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
			<Route path="/courses/:level/:subject" element={<CoursePage />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
