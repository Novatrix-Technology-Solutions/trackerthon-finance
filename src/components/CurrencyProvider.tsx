"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

type CurrencyContextType = {
  currencyStr: string;
  setCurrencyStr: (c: string) => void;
  baseCurrencyStr: string;
  setBaseCurrencyStr: (c: string) => void;
  formatAmount: (amountBase: number) => string;
  convertAmount: (amountBase: number) => number;
  isLoadingRates: boolean;
};

const SYMBOL_TO_CODE: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₹': 'INR',
  'K': 'ZMW',
  'R': 'ZAR'
};

const CurrencyContext = createContext<CurrencyContextType>({ 
  currencyStr: '$', 
  setCurrencyStr: () => {},
  baseCurrencyStr: 'K',
  setBaseCurrencyStr: () => {},
  formatAmount: (amt) => `$${amt.toLocaleString()}`,
  convertAmount: (amt) => amt,
  isLoadingRates: false
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyStr, setCurrencyStr] = useState('$');
  const [baseCurrencyStr, setBaseCurrencyStr] = useState('K');

  useEffect(() => {
    const saved = localStorage.getItem('trackerthon_currency');
    if (saved) setCurrencyStr(saved);
    const savedBase = localStorage.getItem('trackerthon_base_currency');
    if (savedBase) setBaseCurrencyStr(savedBase);
  }, []);

  const handleSetCurrency = (c: string) => {
    setCurrencyStr(c);
    localStorage.setItem('trackerthon_currency', c);
  };

  const handleSetBaseCurrency = (c: string) => {
    setBaseCurrencyStr(c);
    localStorage.setItem('trackerthon_base_currency', c);
  };

  const apiKey = process.env.NEXT_PUBLIC_EXCHANGERATE_API_KEY;

  const { data: rates, isLoading: isLoadingRates } = useQuery({
    queryKey: ['exchange_rates'],
    queryFn: async () => {
      if (!apiKey) return null;
      const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
      if (!res.ok) throw new Error('Failed to fetch rates');
      const data = await res.json();
      return data.conversion_rates as Record<string, number>;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
  });

  const convertAmount = (amountBase: number) => {
    if (!rates) return amountBase;
    const baseCode = SYMBOL_TO_CODE[baseCurrencyStr] || 'USD';
    const targetCode = SYMBOL_TO_CODE[currencyStr] || 'USD';
    
    const baseRate = rates[baseCode] || 1;
    const targetRate = rates[targetCode] || 1;
    
    // Convert base currency amount to USD, then to target currency
    const amountUSD = amountBase / baseRate;
    return amountUSD * targetRate;
  };

  const formatAmount = (amountBase: number) => {
    const converted = convertAmount(amountBase);
    const code = SYMBOL_TO_CODE[currencyStr] || 'USD';
    
    // Some currencies format differently, but standard locale string works for most generic cases
    return `${currencyStr}${converted.toLocaleString(undefined, { 
      minimumFractionDigits: ['JPY'].includes(code) ? 0 : 2,
      maximumFractionDigits: ['JPY'].includes(code) ? 0 : 2 
    })}`;
  };

  return (
    <CurrencyContext.Provider value={{ 
      currencyStr, 
      setCurrencyStr: handleSetCurrency,
      baseCurrencyStr,
      setBaseCurrencyStr: handleSetBaseCurrency,
      formatAmount,
      convertAmount,
      isLoadingRates
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
