"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RefreshCcw, HelpCircle, Settings, LayoutDashboard, BookOpen, Repeat, CreditCard, LineChart, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import HelpGuideModal from '@/components/HelpGuideModal';
import { useTranslation } from '@/providers/LanguageProvider';

export default function GreenThemeWrapper({ children }: { children: React.ReactNode }) {
  const { locale, t } = useTranslation();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeSidebar = () => {
    const drawer = document.getElementById('main-drawer') as HTMLInputElement;
    if (drawer) drawer.checked = false;
  };

  return (
    <div className="drawer lg:drawer-open min-h-screen bg-base-100 text-base-content">
      <input id="main-drawer" type="checkbox" className="drawer-toggle" />
      
      <div className="drawer-content flex flex-col">
        {/* Mobile Navbar */}
        <div className="navbar bg-base-100 border-b border-base-200 lg:hidden sticky top-0 z-40">
          <div className="flex-none">
            <label htmlFor="main-drawer" aria-label="open sidebar" className="btn btn-square btn-ghost">
              <Menu className="w-6 h-6" />
            </label>
          </div>
          <div className="flex-1">
            <Link href={`/${locale}`} className="btn btn-ghost text-xl font-bold truncate">Trackerthon</Link>
          </div>
        </div>

        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between p-4 border-b border-base-200 bg-base-100/80 backdrop-blur sticky top-0 z-30">
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="btn btn-ghost btn-sm btn-square text-base-content/70 hover:text-primary" title="Toggle Sidebar">
            {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="btn btn-ghost btn-sm btn-circle" title="Refresh Data">
              <RefreshCcw className="w-4 h-4" />
            </button>
            <button onClick={() => setIsHelpOpen(true)} className="btn btn-ghost btn-sm btn-circle" title="App Guide">
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </header>

        <HelpGuideModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

        {/* Main Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div> 
      
      <div className="drawer-side z-[60]">
        <label htmlFor="main-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
        <aside className={`min-h-full bg-base-200 border-r border-base-300 flex flex-col transition-all duration-300 overflow-visible relative z-[60] ${isCollapsed ? 'w-20' : 'w-72'}`}>
          <div className="p-6 flex items-center justify-center min-h-[80px]">
            {isCollapsed ? (
              <Link href={`/${locale}`} className="text-3xl font-bold text-primary tracking-tight" onClick={closeSidebar}>
                T
              </Link>
            ) : (
              <Link href={`/${locale}`} className="text-2xl font-bold text-primary tracking-tight truncate w-full" onClick={closeSidebar}>
                Trackerthon
              </Link>
            )}
          </div>
          
          <ul className={`menu menu-md py-2 flex-1 gap-2 overflow-visible ${isCollapsed ? 'px-2' : 'px-4'}`}>
            <li>
              <Link href={`/${locale}`} onClick={closeSidebar} className={isCollapsed ? 'tooltip tooltip-right !justify-center !px-0 py-3' : ''} data-tip={isCollapsed ? t('nav.dashboard') : ''}>
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{t('nav.dashboard')}</span>}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/ledger`} onClick={closeSidebar} className={isCollapsed ? 'tooltip tooltip-right !justify-center !px-0 py-3' : ''} data-tip={isCollapsed ? t('nav.ledger') : ''}>
                <BookOpen className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{t('nav.ledger')}</span>}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/recurring`} onClick={closeSidebar} className={isCollapsed ? 'tooltip tooltip-right !justify-center !px-0 py-3' : ''} data-tip={isCollapsed ? t('nav.recurring') : ''}>
                <Repeat className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{t('nav.recurring')}</span>}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/debts`} onClick={closeSidebar} className={isCollapsed ? 'tooltip tooltip-right !justify-center !px-0 py-3' : ''} data-tip={isCollapsed ? t('nav.debts') : ''}>
                <CreditCard className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{t('nav.debts')}</span>}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/scenarios`} onClick={closeSidebar} className={isCollapsed ? 'tooltip tooltip-right !justify-center !px-0 py-3' : ''} data-tip={isCollapsed ? t('nav.scenarios') : ''}>
                <LineChart className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{t('nav.scenarios')}</span>}
              </Link>
            </li>
          </ul>

          <div className="p-4 border-t border-base-300">
            <ul className={`menu menu-md w-full gap-2 p-0 overflow-visible`}>
              <li>
                <Link href={`/${locale}/settings`} onClick={closeSidebar} className={isCollapsed ? 'tooltip tooltip-right !justify-center !px-0 py-3' : ''} data-tip={isCollapsed ? t('nav.settings') : ''}>
                  <Settings className="w-5 h-5 shrink-0" />
                  {!isCollapsed && <span>{t('nav.settings')}</span>}
                </Link>
              </li>
              <li className="lg:hidden">
                <button onClick={() => { closeSidebar(); window.location.reload(); }}>
                  <RefreshCcw className="w-5 h-5 shrink-0" />
                  <span>Refresh</span>
                </button>
              </li>
              <li className="lg:hidden">
                <button onClick={() => { closeSidebar(); setIsHelpOpen(true); }}>
                  <HelpCircle className="w-5 h-5 shrink-0" />
                  <span>Help Guide</span>
                </button>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
