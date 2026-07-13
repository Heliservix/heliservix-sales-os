"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  defaultLanguage,
  languageStorageKey,
  translateKey,
  translatePhrase,
  type Language,
  type TranslationKey
} from "@/lib/i18n";

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
  tx: (value: string) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [hasLoadedLanguage, setHasLoadedLanguage] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem(languageStorageKey);
      if (saved === "es" || saved === "en") setLanguageState(saved);
      setHasLoadedLanguage(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hasLoadedLanguage) return;
    window.localStorage.setItem(languageStorageKey, language);
    document.documentElement.lang = language;
  }, [hasLoadedLanguage, language]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage: setLanguageState,
    t: (key) => translateKey(language, key),
    tx: (text) => translatePhrase(language, text)
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
