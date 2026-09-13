'use client';

import React, { createContext, useContext, useSyncExternalStore, useCallback } from 'react';

export type LanguageMode = 'hi' | 'en';

interface LanguageContextType {
  language: LanguageMode;
  setLanguage: (lang: LanguageMode) => void;
  isHindi: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  isHindi: false,
});

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener('storage', callback);
  window.addEventListener('ksa_language_change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('ksa_language_change', callback);
  };
}

function getSnapshot(): LanguageMode {
  if (typeof window === 'undefined') {
    return 'en';
  }
  try {
    const saved = localStorage.getItem('ksa_language');
    if (saved === 'hi' || saved === 'en') {
      return saved;
    }
  } catch {
    // Ignore localStorage access exceptions
  }
  return 'en';
}

function getServerSnapshot(): LanguageMode {
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLanguage = useCallback((lang: LanguageMode) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ksa_language', lang);
        window.dispatchEvent(new Event('ksa_language_change'));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const isHindi = language === 'hi';

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        isHindi,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}


