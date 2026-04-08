import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations, type Lang, type TKey } from './translations';

interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey) => string;
}

const LanguageContext = createContext<LanguageCtx>({
  lang: 'en',
  setLang: () => {},
  t: (key) => translations[key]?.en ?? key,
});

const STORAGE_KEY = 'hando_lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'en' || saved === 'sr') ? saved : 'en';
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback((key: TKey): string => {
    return translations[key]?.[lang] ?? translations[key]?.en ?? key;
  }, [lang]);

  return React.createElement(LanguageContext.Provider, { value: { lang, setLang, t } }, children);
}

export function useLanguage() {
  return useContext(LanguageContext);
}
