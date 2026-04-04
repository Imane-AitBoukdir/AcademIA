import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./i18n";
import "./index.css";

// Apply saved theme before first paint to avoid flash
const _savedTheme = localStorage.getItem("academia_theme") || "light";
document.documentElement.setAttribute("data-theme", _savedTheme);

// Apply saved language direction before first paint
const _savedLang = localStorage.getItem("academia_lang") || "fr";
document.documentElement.lang = _savedLang;
document.documentElement.dir = _savedLang === "ar" ? "rtl" : "ltr";

ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<BrowserRouter>
			<LanguageProvider>
				<App />
			</LanguageProvider>
		</BrowserRouter>
	</React.StrictMode>,
);
