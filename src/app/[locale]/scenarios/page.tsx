"use client";

import React, { useState, useMemo } from 'react';
import { FinanceEngine, Transaction } from '@/lib/calculations';
import { createClient } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useCurrency } from '@/components/CurrencyProvider';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SlidersHorizontal, ArrowRight, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from '@/providers/LanguageProvider';

interface Debt { id: string; remaining: number; }
interface RecurringPayment { id: string; amount: number; frequency: string; }

export default function ScenariosPage() {
  const { formatAmount, convertAmount, currencyStr } = useCurrency();
  const { t } = useTranslation();
  const supabase = createClient();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // State for What-If variables
  const [revenueChangePercent, setRevenueChangePercent] = useState<number>(0);
  const [expenseCutPercent, setExpenseCutPercent] = useState<number>(0);

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      return (data || []) as Transaction[];
    }
  });

  const { data: recurring = [], isLoading: recLoading } = useQuery({
    queryKey: ['recurring_payments'],
    queryFn: async () => {
      const { data } = await supabase.from('recurring_payments').select('id, amount, frequency');
      return (data || []) as RecurringPayment[];
    }
  });

  const loading = txLoading || recLoading;

  // Base Calculations
  const totalCashFlow = FinanceEngine.calculateCashFlow(transactions);
  
  // Calculate average monthly revenue from the last 3 months
  const monthlyRevenue = useMemo(() => {
    const incomes = transactions.filter(t => t.type === 'income');
    if (incomes.length === 0) return 0;
    
    // Group by month
    const revByMonth: Record<string, number> = {};
    incomes.forEach(t => {
      const m = t.date.substring(0, 7);
      revByMonth[m] = (revByMonth[m] || 0) + t.amount;
    });
    const months = Object.keys(revByMonth);
    if (months.length === 0) return 0;
    const sum = Object.values(revByMonth).reduce((a, b) => a + b, 0);
    return sum / months.length;
  }, [transactions]);

  // Base Burn Rate
  const baseMonthlyBurnRate = recurring.reduce((acc, sub) => {
    let monthlyCost = sub.amount;
    if (sub.frequency === 'Weekly') monthlyCost = sub.amount * 4.33;
    if (sub.frequency === 'Yearly') monthlyCost = sub.amount / 12;
    return acc + monthlyCost;
  }, 0);

  // Scenario Adjustments
  const scenarioMonthlyRevenue = monthlyRevenue * (1 + (revenueChangePercent / 100));
  const scenarioMonthlyBurn = baseMonthlyBurnRate * (1 - (expenseCutPercent / 100));

  const baseNetMonthly = monthlyRevenue - baseMonthlyBurnRate;
  const scenarioNetMonthly = scenarioMonthlyRevenue - scenarioMonthlyBurn;

  const baseRunway = baseMonthlyBurnRate > 0 ? (totalCashFlow / baseMonthlyBurnRate) : 999;
  const scenarioRunway = scenarioMonthlyBurn > 0 ? (totalCashFlow / scenarioMonthlyBurn) : 999;

  // Projections for Chart
  const projectionData = useMemo(() => {
    const data = [];
    let baseCash = convertAmount(totalCashFlow);
    let scenCash = convertAmount(totalCashFlow);
    
    const bRev = convertAmount(monthlyRevenue);
    const bBurn = convertAmount(baseMonthlyBurnRate);
    const sRev = convertAmount(scenarioMonthlyRevenue);
    const sBurn = convertAmount(scenarioMonthlyBurn);

    for (let i = 0; i <= 12; i++) {
      data.push({
        month: `Month ${i}`,
        base_cash: Math.max(0, baseCash),
        scenario_cash: Math.max(0, scenCash)
      });
      baseCash += (bRev - bBurn);
      scenCash += (sRev - sBurn);
    }
    return data;
  }, [totalCashFlow, monthlyRevenue, baseMonthlyBurnRate, scenarioMonthlyRevenue, scenarioMonthlyBurn, convertAmount]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
      <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-base-200">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-base-content">{t('scenarios.title')}</h2>
          <p className="text-base-content/70 mt-1">{t('scenarios.subtitle')}</p>
        </div>
        <SlidersHorizontal className="w-8 h-8 opacity-40" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Controls */}
        <div className="card bg-base-100 shadow-sm border border-base-200 lg:col-span-1">
          <div className="card-body space-y-4">
            <h3 className="card-title text-lg">{t('scenarios.adjustment_levers')}</h3>
            
            <div className="form-control">
              <div className="flex justify-between mb-2">
                <label className="label-text font-medium">{t('scenarios.revenue_impact')}</label>
                <span className={`text-sm font-bold ${revenueChangePercent >= 0 ? 'text-success' : 'text-error'}`}>
                  {revenueChangePercent > 0 ? '+' : ''}{revenueChangePercent}%
                </span>
              </div>
              <input 
                type="range" 
                min="-100" max="100" step="5"
                value={revenueChangePercent}
                onChange={(e) => setRevenueChangePercent(Number(e.target.value))}
                className="range range-primary range-sm py-2 md:py-0"
              />
              <p className="label-text-alt opacity-70 mt-2">{t('scenarios.simulate_growth')}</p>
            </div>

            <div className="form-control">
              <div className="flex justify-between mb-2">
                <label className="label-text font-medium">{t('scenarios.cut_expenses')}</label>
                <span className={`text-sm font-bold ${expenseCutPercent > 0 ? 'text-success' : 'opacity-70'}`}>
                  {expenseCutPercent}% {t('scenarios.reduction')}
                </span>
              </div>
              <input 
                type="range" 
                min="0" max="100" step="5"
                value={expenseCutPercent}
                onChange={(e) => setExpenseCutPercent(Number(e.target.value))}
                className="range range-primary range-sm py-2 md:py-0"
              />
              <p className="label-text-alt opacity-70 mt-2">{t('scenarios.simulate_cut')}</p>
            </div>

            <div className="alert alert-warning shadow-sm mt-4 text-warning-content rounded-xl">
               <AlertTriangle className="w-5 h-5 flex-shrink-0" />
               <p className="text-xs">
                 {t('scenarios.note').replace('{cash}', formatAmount(totalCashFlow))}
               </p>
            </div>
          </div>
        </div>

        {/* Results Matrix */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ResultCard 
               title={t('scenarios.monthly_revenue')}
               base={formatAmount(monthlyRevenue)}
               scenario={formatAmount(scenarioMonthlyRevenue)}
               trend={revenueChangePercent}
            />
            <ResultCard 
               title={t('scenarios.monthly_burn_rate')}
               base={formatAmount(baseMonthlyBurnRate)}
               scenario={formatAmount(scenarioMonthlyBurn)}
               trend={expenseCutPercent > 0 ? 1 : 0} // Positive outcome for cutting expenses
               reverseColors={true}
            />
            <ResultCard 
               title={t('scenarios.runway_no_rev')}
               base={baseRunway === 999 ? t('scenarios.runway_infinite') : `${baseRunway.toFixed(1)} ${t('scenarios.runway_mo')}`}
               scenario={scenarioRunway === 999 ? t('scenarios.runway_infinite') : `${scenarioRunway.toFixed(1)} ${t('scenarios.runway_mo')}`}
               trend={scenarioRunway - baseRunway}
            />
          </div>

          <div className="card bg-base-100 shadow-sm border border-base-200 min-w-0">
            <div className="card-body">
              <h3 className="card-title text-lg mb-4">{t('scenarios.projection_title')}</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projectionData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#374151" : "#e5e7eb"} />
                    <XAxis dataKey="month" stroke={isDark ? "#9ca3af" : "#6b7280"} />
                    <YAxis stroke={isDark ? "#9ca3af" : "#6b7280"} />
                    <Tooltip 
                      formatter={(value: any) => `${currencyStr}${Number(value).toLocaleString(undefined, {maximumFractionDigits:0})}`}
                      contentStyle={{ 
                        borderRadius: '8px', 
                        backgroundColor: isDark ? '#111827' : '#ffffff',
                        borderColor: isDark ? '#374151' : '#e5e7eb',
                        color: isDark ? '#ffffff' : '#000000'
                      }} 
                    />
                    <Legend />
                    <Line type="monotone" dataKey="base_cash" name={t('scenarios.current_trajectory')} stroke={isDark ? "#6b7280" : "#9ca3af"} strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="scenario_cash" name={t('scenarios.scenario_trajectory')} stroke="#15803d" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

interface ResultCardProps {
  title: string;
  base: string;
  scenario: string;
  trend: number;
  reverseColors?: boolean;
}

function ResultCard({ title, base, scenario, trend, reverseColors = false }: ResultCardProps) {
  const { t } = useTranslation();
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  const isNeutral = trend === 0;

  let trendColor = 'opacity-70';
  if (!isNeutral) {
     if (reverseColors) {
        trendColor = isPositive ? 'text-success' : 'text-error';
     } else {
        trendColor = isPositive ? 'text-success' : 'text-error';
     }
  }

  return (
    <div className="card bg-base-100 shadow-sm border border-base-200">
      <div className="card-body p-5">
        <p className="text-sm font-medium opacity-70 mb-2">{title}</p>
        
        <div className="flex items-center justify-between mb-2">
           <div>
             <p className="text-xs opacity-50 mb-1">{t('scenarios.current')}</p>
             <p className="text-lg font-semibold opacity-70 line-through decoration-base-content/40">{base}</p>
           </div>
           <ArrowRight className="w-5 h-5 opacity-40" />
        </div>
        
        <div className="pt-3 border-t border-base-200">
          <p className="text-xs text-success font-medium mb-1">{t('scenarios.scenario')}</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">{scenario}</p>
            {!isNeutral && (
               isPositive ? <TrendingUp className={`w-5 h-5 ${trendColor}`} /> : <TrendingDown className={`w-5 h-5 ${trendColor}`} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
