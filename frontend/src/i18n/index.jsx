import { createContext, useCallback, useContext, useEffect, useState } from "react";
import ar from "./ar";
import fr from "./fr";

const translations = { fr, ar };

const LangContext = createContext({ lang: "fr", t: (k) => k, setLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("academia_lang") || "fr");

  const setLang = useCallback((l) => {
    setLangState(l);
    localStorage.setItem("academia_lang", l);
  }, []);

  // Apply RTL / LTR + lang attribute + CSS custom properties
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.style.setProperty(
      "--drop-pdf-text",
      `"${translations[lang]?.["course.dropHere"] || translations.fr["course.dropHere"]}"`,
    );
  }, [lang]);

  const t = useCallback(
    (key) => translations[lang]?.[key] ?? translations.fr[key] ?? key,
    [lang],
  );

  return (
    <LangContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LangContext);
}
