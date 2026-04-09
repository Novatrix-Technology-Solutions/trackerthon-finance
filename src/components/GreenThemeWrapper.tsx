"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { RefreshCcw, HelpCircle, Menu, X } from 'lucide-react';
import { useCurrency } from '@/components/CurrencyProvider';
import HelpGuideModal from '@/components/HelpGuideModal';

export default function GreenThemeWrapper({ children }: { children: React.ReactNode }) {
  const { currencyStr, setCurrencyStr } = useCurrency();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-money-green selection:text-white flex flex-col">
      <header className="bg-money-green text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Trackerthon: Finance</h1>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6 text-sm font-medium items-center">
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

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button 
                onClick={toggleMobileMenu}
                className="p-2 bg-money-dark hover:bg-money-light rounded-md text-white transition-colors focus:outline-none focus:ring-2 focus:ring-money-light"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Dropdown */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-money-light/20 flex flex-col space-y-4 pb-2 animate-in slide-in-from-top-4 duration-200">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="block px-2 py-1 text-base font-medium hover:text-money-light hover:bg-money-dark rounded transition-colors">Dashboard</Link>
              <Link href="/ledger" onClick={() => setIsMobileMenuOpen(false)} className="block px-2 py-1 text-base font-medium hover:text-money-light hover:bg-money-dark rounded transition-colors">Ledger</Link>
              <Link href="/recurring" onClick={() => setIsMobileMenuOpen(false)} className="block px-2 py-1 text-base font-medium hover:text-money-light hover:bg-money-dark rounded transition-colors">Recurring Payments</Link>
              <Link href="/debts" onClick={() => setIsMobileMenuOpen(false)} className="block px-2 py-1 text-base font-medium hover:text-money-light hover:bg-money-dark rounded transition-colors">Debts & Liabilities</Link>
              
              <div className="flex items-center justify-between px-2 pt-2 border-t border-money-light/20">
                <select 
                  value={currencyStr} 
                  onChange={(e) => setCurrencyStr(e.target.value)}
                  className="bg-money-dark text-white text-sm border border-money-light/30 rounded py-2 px-3 focus:ring-2 focus:ring-money-light focus:outline-none cursor-pointer w-full max-w-[150px]"
                >
                  <option value="$">USD ($)</option>
                  <option value="€">EUR (€)</option>
                  <option value="£">GBP (£)</option>
                  <option value="¥">JPY (¥)</option>
                  <option value="₹">INR (₹)</option>
                  <option value="K">ZMW (K)</option>
                  <option value="R">ZAR (R)</option>
                </select>

                <div className="flex space-x-3">
                  <button 
                    onClick={() => { setIsMobileMenuOpen(false); window.location.reload(); }}
                    className="p-2 bg-money-dark hover:bg-money-light rounded-md text-white transition-colors flex items-center justify-center"
                    title="Refresh Data"
                  >
                    <RefreshCcw className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => { setIsMobileMenuOpen(false); setIsHelpOpen(true); }}
                    className="p-2 bg-money-dark hover:bg-money-light rounded-md text-white transition-colors flex items-center justify-center"
                    title="App Guide"
                  >
                    <HelpCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <HelpGuideModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
