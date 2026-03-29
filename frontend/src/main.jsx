import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Apply saved theme before first paint to avoid flash
const _savedTheme = localStorage.getItem("academia_theme") || "light";
document.documentElement.setAttribute("data-theme", _savedTheme);

ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</React.StrictMode>,
);
