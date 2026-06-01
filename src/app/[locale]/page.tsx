"use client";

import React, { useMemo } from 'react';
import { FinanceEngine, Transaction } from '@/lib/calculations';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Coins, Flame, Clock, Scale, Percent, Info } from 'lucide-react';
import ReportGenerator from '@/components/ReportGenerator';
import { createClient } from '@/utils/supabase/client';
import { useCurrency } from '@/components/CurrencyProvider';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { getCategoryColor } from '@/lib/colors';
import { useTranslation } from '@/providers/LanguageProvider';

interface Debt { id: string; remaining: number; }
interface RecurringPayment { id: string; amount: number; frequency: string; }

export default function Dashboard() {
  const { currencyStr, formatAmount, convertAmount } = useCurrency();
  const { t } = useTranslation();
  const supabase = createClient();
  const { theme } = useTheme();

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    }
  });

  const { data: debts = [], isLoading: debtsLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('debts').select('id, remaining');
      if (error) throw error;
      return data as Debt[];
    }
  });

  const { data: recurring = [], isLoading: recLoading } = useQuery({
    queryKey: ['recurring_payments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('recurring_payments').select('id, amount, frequency');
      if (error) throw error;
      return data as RecurringPayment[];
    }
  });

  const loading = txLoading || debtsLoading || recLoading;

  // --- CORE FINANCIAL CALCULATIONS ---
  const totalCashFlow = FinanceEngine.calculateCashFlow(transactions);
  const netProfit = FinanceEngine.calculateNetProfit(transactions);
  
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalDebt = debts.reduce((acc, d) => acc + d.remaining, 0);
  
  // Burn Rate: Monthly structural leakage
  const monthlyBurnRate = recurring.reduce((acc, sub) => {
    let monthlyCost = sub.amount;
    if (sub.frequency === 'Weekly') monthlyCost = sub.amount * 4.33;
    if (sub.frequency === 'Yearly') monthlyCost = sub.amount / 12;
    return acc + monthlyCost;
  }, 0);

  // Runway Projection: Assuming $0 future revenue
  const runwayMonths = monthlyBurnRate > 0 ? (totalCashFlow / monthlyBurnRate) : 999;
  
  // Operating Margin
  const operatingMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  // --- VISUALIZATION DATA MAPS ---
  const monthlyData = useMemo(() => {
    const dataMap: Record<string, { income: number, expense: number, profit: number }> = {};
    transactions.forEach(t => {
      const month = t.date.substring(0, 7); // yyyy-mm
      if (!dataMap[month]) dataMap[month] = { income: 0, expense: 0, profit: 0 };
      if (t.type === 'income') dataMap[month].income += convertAmount(t.amount);
      else dataMap[month].expense += convertAmount(t.amount);
      dataMap[month].profit = dataMap[month].income - dataMap[month].expense;
    });
    return Object.keys(dataMap).sort().map(month => ({ month, ...dataMap[month] }));
  }, [transactions, convertAmount]);

  const expenseCategories = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + convertAmount(t.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);
  }, [transactions, convertAmount]);

  const isDark = theme === 'dark';

  // Growth Rate Validation
  let growthRate = 0;
  let growthTitle = t('dashboard.mom_growth_rate');
  if (monthlyData.length >= 2) {
    const current = monthlyData[monthlyData.length - 1];
    const prev = monthlyData[monthlyData.length - 2];
    growthRate = FinanceEngine.calculateGrowthRate(current.profit, prev.profit);
    const formatMonth = (m: string) => new Date(`${m}-02T00:00:00`).toLocaleString('default', { month: 'short' });
    growthTitle = `${t('dashboard.mom_growth')} (${formatMonth(current.month)} vs ${formatMonth(prev.month)})`;
  } else if (monthlyData.length === 1) {
    growthTitle = `${t('dashboard.mom_growth_rate')} (${t('dashboard.need_data')})`;
  }

  return (
    <div className="flex flex-col gap-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-base-200">
        <h2 className="text-3xl font-bold tracking-tight text-base-content">{t('dashboard.title')}</h2>
        <div className="flex space-x-3 w-full md:w-auto">
          <ReportGenerator 
             transactions={transactions} 
             metrics={{ totalCashFlow, netProfit, operatingMargin, monthlyBurnRate, runwayMonths, totalDebt }}
          />
        </div>
      </div>

      {/* TOP ROW: 4 Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title={t('dashboard.total_cash_flow')} 
          value={formatAmount(totalCashFlow)} 
          icon={<Coins className="w-8 h-8" />} 
          loading={loading}
          info="All cumulative incoming cash minus all outgoing cash. Formula: (∑ Income - ∑ Expenses)"
        />
        <MetricCard 
          title={t('dashboard.net_profit')} 
          value={formatAmount(netProfit)} 
          icon={<Activity className="w-8 h-8" />} 
          loading={loading}
          info="Actual tracked profit organically generated from product ledger. Formula: (∑ Income - ∑ Expenses)"
        />
        <MetricCard 
          title={growthTitle} 
          value={monthlyData.length >= 2 ? `${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%` : '--'} 
          icon={growthRate >= 0 ? <TrendingUp className="w-8 h-8 text-success" /> : <TrendingDown className="w-8 h-8 text-error" />} 
          trend={monthlyData.length >= 2 ? growthRate : undefined}
          loading={loading}
          info="Comparing recent monthly profits against immediate past to highlight scalable pacing. Formula: ((Current Month - Previous Month) / Previous Month) * 100"
        />
        <MetricCard 
          title={t('dashboard.operating_margin')} 
          value={`${operatingMargin.toFixed(1)}%`} 
          icon={<Percent className="w-8 h-8" />} 
          trend={operatingMargin < 5 ? -1 : 1} 
          loading={loading}
          info="Percentage of revenue actively retained after fulfilling structural operating expenses. Formula: (Net Profit / Total Revenue) * 100"
        />
      </div>

      {/* MIDDLE SECTION: Charts & Risk Metrics dense layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        
        {/* Main P&L Chart */}
        <div className="card bg-base-100 shadow-sm border border-base-200 min-w-0 lg:col-span-2 xl:col-span-2">
          <div className="card-body p-4 sm:p-6">
            <h3 className="card-title text-xl mb-4 whitespace-normal break-words">{t('dashboard.income_vs_expenses')}</h3>
            <div className="h-[350px] w-full">
              {loading ? (
                 <div className="w-full h-full flex items-center justify-center text-base-content/50"><span className="loading loading-spinner loading-lg"></span></div>
              ) : monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#374151" : "#e5e7eb"} />
                    <XAxis dataKey="month" stroke={isDark ? "#9ca3af" : "#6b7280"} tick={{ fontSize: 12 }} />
                    <YAxis stroke={isDark ? "#9ca3af" : "#6b7280"} tick={{ fontSize: 12 }} width={45} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '0.5rem', 
                        border: '1px solid ' + (isDark ? '#374151' : '#f3f4f6'), 
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        backgroundColor: isDark ? '#1f2937' : '#ffffff',
                        color: isDark ? '#ffffff' : '#000000'
                      }} 
                    />
                    <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-base-content/50">
                   <Activity className="w-12 h-12 mb-2 opacity-30" />
                   <p>{t('dashboard.no_transactions')}</p>
                 </div>
              )}
            </div>
          </div>
        </div>

        {/* Expense Concentration PieChart */}
        <div className="card bg-base-100 shadow-sm border border-base-200 min-w-0 lg:col-span-1 xl:col-span-1 flex flex-col">
          <div className="card-body p-4 sm:p-6 flex flex-col h-full">
            <h3 className="card-title text-xl mb-4 whitespace-normal break-words shrink-0">{t('dashboard.expense_concentration')}</h3>
            <div className="flex-1 flex flex-col min-h-[350px]">
               {loading ? (
                   <div className="w-full h-full flex items-center justify-center text-base-content/50"><span className="loading loading-spinner loading-lg"></span></div>
               ) : expenseCategories.length > 0 ? (
                 <div className="w-full h-full flex flex-col">
                   <div className="flex-1 min-h-[200px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie
                           data={expenseCategories}
                           innerRadius="50%"
                           outerRadius="90%"
                           paddingAngle={2}
                           dataKey="value"
                           stroke="none"
                         >
                           {expenseCategories.map((entry, index) => {
                             const { hex } = getCategoryColor(entry.name);
                             return <Cell key={`cell-${index}`} fill={hex} />;
                           })}
                         </Pie>
                         <Tooltip 
                           formatter={(value: any) => `${currencyStr}${Number(value || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                           contentStyle={{ 
                             backgroundColor: isDark ? '#1f2937' : '#ffffff', 
                             borderColor: isDark ? '#374151' : '#e5e7eb',
                             color: isDark ? '#ffffff' : '#000000',
                             borderRadius: '0.5rem'
                           }}
                         />
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                   {/* Custom Legend */}
                   <div className="mt-4 shrink-0 max-h-[140px] overflow-y-auto space-y-2 pr-1">
                     {expenseCategories.slice(0, 5).map((category, idx) => (
                       <div key={category.name} className="flex items-center justify-between text-sm gap-2">
                         <div className="flex items-center min-w-0 flex-1">
                           <div className="w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: getCategoryColor(category.name).hex }}></div>
                           <span className="text-base-content/80 truncate" title={category.name}>{category.name}</span>
                         </div>
                         <span className="font-semibold text-base-content shrink-0">{currencyStr}{category.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                       </div>
                     ))}
                     {expenseCategories.length > 5 && (
                       <div className="text-xs text-center text-base-content/50 font-medium pt-2 border-t border-base-200">...and {expenseCategories.length - 5} more categories</div>
                     )}
                   </div>
                 </div>
               ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-base-content/50 text-center">
                    <Activity className="w-12 h-12 mb-2 opacity-30" />
                    <p>{t('dashboard.log_expenses')}</p>
                  </div>
               )}
            </div>
          </div>
        </div>

        {/* 3 Risk Metrics (Stacked on xl, 3-cols on lg) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-4 lg:col-span-3 xl:col-span-1">
          <MetricCard 
            title={t('dashboard.structural_burn_rate')} 
            value={`${formatAmount(monthlyBurnRate)}/mo`} 
            icon={<Flame className="w-8 h-8 text-warning" />} 
            loading={loading}
            trend={-1}
            info="Strict average monthly drain caused natively by active recurring subscriptions. Formula: (∑ Monthly Subscriptions)"
          />
          <MetricCard 
            title={t('dashboard.runway_projection')} 
            value={runwayMonths === 999 ? t('dashboard.infinite_runway') : `${runwayMonths.toFixed(1)} ${t('dashboard.months_left')}`} 
            icon={<Clock className={`w-8 h-8 ${runwayMonths < 3 ? 'text-error' : 'text-success'}`} />} 
            trend={runwayMonths < 3 ? -1 : undefined} 
            loading={loading}
            info="Exact amount of timeline months the business can structurally survive relying strictly on current cash reserves assuming absolutely zero future product revenue. Formula: (Total Cash Flow / Monthly Burn)"
          />
          <MetricCard 
            title={t('dashboard.total_open_debt')} 
            value={formatAmount(totalDebt)} 
            icon={<Scale className="w-8 h-8 text-accent" />} 
            loading={loading}
            trend={totalDebt > 0 ? -1 : undefined}
            info="Cumulative external liabilities directly tracked towards creditors. Formula: (∑ Remaining Principal Balances)"
          />
        </div>

      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, trend, loading, info }: { title: string, value: string, icon: React.ReactNode, trend?: number, loading?: boolean, info?: string }) {
  const isWarningCard = trend !== undefined && trend < 0; 
  const isPositiveCard = trend !== undefined && trend > 0;
  
  return (
    <div className={`stat rounded-box border p-4 md:p-5 h-full flex flex-col justify-center ${isWarningCard ? 'bg-error/5 text-base-content border-error/30' : 'bg-base-100 border-base-200 shadow-sm'}`}>
      <div className={`stat-figure p-3 rounded-full ${isWarningCard ? 'bg-error/20 text-error' : 'bg-primary/10 text-primary'}`}>
        {icon}
      </div>
      <div className={`stat-title flex items-start justify-between gap-2 whitespace-normal overflow-visible break-words leading-snug w-full ${isWarningCard ? 'text-base-content/80' : 'text-base-content/60'}`}>
        <span className="flex-1 min-w-0 pr-2">{title}</span>
        {info && (
          <div className="tooltip tooltip-left z-10 hidden sm:block flex-shrink-0 ml-1" data-tip={info}>
            <Info className="w-4 h-4 cursor-help opacity-70 mt-0.5" />
          </div>
        )}
      </div>
      <div className={`stat-value text-[clamp(1.15rem,2.2vw+0.5rem,1.75rem)] whitespace-normal overflow-visible break-words leading-tight mt-1 min-w-0 ${isWarningCard ? 'text-error' : ''}`}>
        {loading ? <span className="loading loading-spinner loading-md"></span> : value}
      </div>
      {trend !== undefined && (
        <div className={`stat-desc font-medium hidden sm:block mt-1 whitespace-normal break-words ${isWarningCard ? 'text-error/80' : 'text-success'}`}>
          {isPositiveCard ? '↗︎ Trending up' : '↘︎ Trending down'}
        </div>
      )}
    </div>
  );
}

