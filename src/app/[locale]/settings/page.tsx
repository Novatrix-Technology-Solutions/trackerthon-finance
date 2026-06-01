"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Globe, DollarSign, Palette, Settings, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { useCurrency } from '@/components/CurrencyProvider';
import { useTheme } from 'next-themes';
import { useTranslation } from '@/providers/LanguageProvider';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { currencyStr, setCurrencyStr, baseCurrencyStr, setBaseCurrencyStr } = useCurrency();
  const { theme, setTheme } = useTheme();
  const { locale, t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = (newLocale: string) => {
    const pathParts = pathname.split('/');
    pathParts[1] = newLocale;
    router.push(pathParts.join('/'));
    toast.success(newLocale === 'ja' ? '設定を更新しました！' : 'Settings updated!');
  };

  const handleCurrencyChange = (type: 'base' | 'display', val: string) => {
    if (type === 'base') {
      setBaseCurrencyStr(val);
    } else {
      setCurrencyStr(val);
    }
    toast.success(t('settings.saved'));
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast.success(t('settings.saved'));
  };

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-base-200">
        <div>
          <Link 
            href="/"
            className="btn btn-ghost btn-sm px-0 hover:bg-transparent text-primary mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {t('nav.dashboard')}
          </Link>
          <h1 className="text-3xl font-extrabold text-base-content flex items-center gap-2 tracking-tight">
            <Settings className="w-8 h-8 text-primary animate-spin-slow" />
            {t('settings.title')}
          </h1>
          <p className="text-base-content/70 text-sm mt-1">
            {t('settings.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Nav (Visual Indicator) */}
        <div className="md:col-span-1 space-y-2">
          <ul className="menu bg-base-100 w-full rounded-box border border-base-200 shadow-sm">
            <li className="menu-title px-4 py-2">
              <span className="text-xs font-semibold opacity-50 uppercase tracking-wider">{t('settings.general')}</span>
            </li>
            <li>
              <a className="active flex items-center gap-2.5 bg-primary/10 text-primary hover:bg-primary/20">
                <Settings className="w-4 h-4" />
                {t('nav.settings')}
              </a>
            </li>
          </ul>
        </div>

        {/* Content Section */}
        <div className="md:col-span-2 space-y-6">
          {/* Language Selector */}
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-info/10 text-info rounded-xl">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="card-title text-lg">{t('language.title')}</h3>
                  <p className="text-base-content/70 text-sm">{t('language.desc')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { code: 'en', label: t('language.en') },
                  { code: 'es', label: t('language.es') },
                  { code: 'pt', label: t('language.pt') },
                  { code: 'de', label: t('language.de') },
                  { code: 'fr', label: t('language.fr') },
                  { code: 'ja', label: t('language.ja') },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`btn justify-between normal-case font-medium ${
                      locale === lang.code
                        ? 'btn-primary'
                        : 'btn-outline border-base-300 hover:bg-base-200 hover:text-base-content hover:border-base-300'
                    }`}
                  >
                    <span>{lang.label}</span>
                    {locale === lang.code && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Currencies Config */}
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-success/10 text-success rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="card-title text-lg">Currencies Config</h3>
                  <p className="text-base-content/70 text-sm">{t('currency.settings_desc')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">{t('currency.base')}</span></label>
                  <select 
                    value={baseCurrencyStr} 
                    onChange={(e) => handleCurrencyChange('base', e.target.value)}
                    className="select select-bordered w-full"
                  >
                    <option value="$">USD ($)</option>
                    <option value="€">EUR (€)</option>
                    <option value="£">GBP (£)</option>
                    <option value="¥">JPY (¥)</option>
                    <option value="₹">INR (₹)</option>
                    <option value="K">ZMW (K)</option>
                    <option value="R">ZAR (R)</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">{t('currency.display')}</span></label>
                  <select 
                    value={currencyStr} 
                    onChange={(e) => handleCurrencyChange('display', e.target.value)}
                    className="select select-bordered w-full"
                  >
                    <option value="$">USD ($)</option>
                    <option value="€">EUR (€)</option>
                    <option value="£">GBP (£)</option>
                    <option value="¥">JPY (¥)</option>
                    <option value="₹">INR (₹)</option>
                    <option value="K">ZMW (K)</option>
                    <option value="R">ZAR (R)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Theme customizer */}
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
                  <Palette className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="card-title text-lg">{t('theme.title')}</h3>
                  <p className="text-base-content/70 text-sm">{t('theme.desc')}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: 'emerald', label: t('theme.light') },
                  { name: 'dark', label: t('theme.dark') },
                  { name: 'system', label: t('theme.system') },
                ].map((tItem) => (
                  <button
                    key={tItem.name}
                    onClick={() => handleThemeChange(tItem.name)}
                    className={`btn normal-case ${
                      theme === tItem.name
                        ? 'btn-primary'
                        : 'btn-outline border-base-300 hover:bg-base-200 hover:text-base-content hover:border-base-300'
                    }`}
                  >
                    <span>{tItem.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
