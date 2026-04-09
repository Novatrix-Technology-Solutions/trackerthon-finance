"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

type CurrencyContextType = {
  currencyStr: string;
  setCurrencyStr: (c: string) => void;
};

const CurrencyContext = createContext<CurrencyContextType>({ currencyStr: '$', setCurrencyStr: () => {} });

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyStr, setCurrencyStr] = useState('$');

  useEffect(() => {
    const saved = localStorage.getItem('trackerthon_currency');
    if (saved) setCurrencyStr(saved);
  }, []);

  const handleSetCurrency = (c: string) => {
    setCurrencyStr(c);
    localStorage.setItem('trackerthon_currency', c);
  };

  return (
    <CurrencyContext.Provider value={{ currencyStr, setCurrencyStr: handleSetCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
