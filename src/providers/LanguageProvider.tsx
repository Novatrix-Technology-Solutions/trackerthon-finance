"use client";

import React, { createContext, useContext, useState } from 'react';
import type { Locale } from '@/utils/dictionaries';

interface LanguageContextType {
  locale: Locale;
  t: (keyPath: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
  children,
  locale,
  dictionary,
}: {
  children: React.ReactNode;
  locale: Locale;
  dictionary: any;
}) {
  const t = (keyPath: string) => {
    const keys = keyPath.split('.');
    let result: any = dictionary;
    for (const key of keys) {
      if (result && result[key] !== undefined) {
        result = result[key];
      } else {
        return keyPath; // fallback to key path if translation missing
      }
    }
    return result || keyPath;
  };

  return (
    <LanguageContext.Provider value={{ locale, t }}>
      <div className={locale === 'ja' ? 'tracking-wide leading-relaxed' : ''}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
