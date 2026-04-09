"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { RefreshCcw, HelpCircle } from 'lucide-react';
import { useCurrency } from '@/components/CurrencyProvider';
import HelpGuideModal from '@/components/HelpGuideModal';

export default function GreenThemeWrapper({ children }: { children: React.ReactNode }) {
  const { currencyStr, setCurrencyStr } = useCurrency();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-money-green selection:text-white">
      {/* Navigation / Header can go here later */}
      <header className="bg-money-green text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Trackerthon: Finance</h1>
          <nav className="space-x-6 text-sm font-medium flex items-center">
            <Link href="/" className="hover:text-money-light transition-colors">Dashboard</Link>
            <Link href="/ledger" className="hover:text-money-light transition-colors">Ledger</Link>
            <Link href="/recurring" className="hover:text-money-light transition-colors">Recurring</Link>
            <Link href="/debts" className="hover:text-money-light transition-colors">Debts</Link>
            
            <select 
              value={currencyStr} 
              onChange={(e) => setCurrencyStr(e.target.value)}
              className="ml-4 bg-money-dark text-white text-sm border border-money-light/30 rounded py-1 px-2 focus:ring-2 focus:ring-money-light focus:outline-none cursor-pointer"
            >
              <option value="$">USD ($)</option>
              <option value="€">EUR (€)</option>
              <option value="£">GBP (£)</option>
              <option value="¥">JPY (¥)</option>
              <option value="₹">INR (₹)</option>
              <option value="K">ZMW (K)</option>
              <option value="R">ZAR (R)</option>
            </select>
            <button 
              onClick={() => window.location.reload()}
              className="ml-4 p-1.5 bg-money-dark hover:bg-money-light rounded-md text-white transition-colors flex items-center justify-center"
              title="Refresh Data"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsHelpOpen(true)}
              className="ml-3 p-1.5 bg-money-dark hover:bg-money-light rounded-md text-white transition-colors flex items-center justify-center"
              title="App Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </header>

      <HelpGuideModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
