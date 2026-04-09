"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { FinanceEngine, Transaction } from '@/lib/calculations';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Coins, Flame, Clock, Scale, Percent, Info } from 'lucide-react';
import ReportGenerator from '@/components/ReportGenerator';
import { createClient } from '@/utils/supabase/client';
import { useCurrency } from '@/components/CurrencyProvider';

interface Debt { id: string; remaining: number; }
interface RecurringPayment { id: string; amount: number; frequency: string; }

export default function Dashboard() {
  const { currencyStr } = useCurrency();
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      const [txRes, debtsRes, recRes] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('debts').select('id, remaining'),
        supabase.from('recurring_payments').select('id, amount, frequency')
      ]);

      if (txRes.data) setTransactions(txRes.data);
      if (debtsRes.data) setDebts(debtsRes.data);
      if (recRes.data) setRecurring(recRes.data);
      setLoading(false);
    };
    fetchAllData();
  }, []);

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
      if (t.type === 'income') dataMap[month].income += t.amount;
      else dataMap[month].expense += t.amount;
      dataMap[month].profit = dataMap[month].income - dataMap[month].expense;
    });
    return Object.keys(dataMap).sort().map(month => ({ month, ...dataMap[month] }));
  }, [transactions]);

  const expenseCategories = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);
  }, [transactions]);

  const PIE_COLORS = ['#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7'];

  // Growth Rate Validation
  let growthRate = 0;
  let growthTitle = "MoM Growth Rate";
  if (monthlyData.length >= 2) {
    const current = monthlyData[monthlyData.length - 1];
    const prev = monthlyData[monthlyData.length - 2];
    growthRate = FinanceEngine.calculateGrowthRate(current.profit, prev.profit);
    const formatMonth = (m: string) => new Date(`${m}-02T00:00:00`).toLocaleString('default', { month: 'short' });
    growthTitle = `MoM Growth (${formatMonth(current.month)} vs ${formatMonth(prev.month)})`;
  } else if (monthlyData.length === 1) {
    growthTitle = "MoM Growth Rate (Need more data)";
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-center pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Financial Overview</h2>
        <div className="flex space-x-3">
          <ReportGenerator 
             transactions={transactions} 
             metrics={{ totalCashFlow, netProfit, operatingMargin, monthlyBurnRate, runwayMonths, totalDebt }}
          />
        </div>
      </div>

      {/* TIER 1 METRICS (Foundational) */}
      <h3 className="text-lg font-bold tracking-tight text-gray-900 mb-2">Core Performance</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Cash Flow" 
          value={`${currencyStr}${totalCashFlow.toLocaleString()}`} 
          icon={<Coins className="w-6 h-6 text-money-green" />} 
          loading={loading}
          info="All cumulative incoming cash minus all outgoing cash. Formula: (∑ Income - ∑ Expenses)"
        />
        <MetricCard 
          title="Net Profit" 
          value={`${currencyStr}${netProfit.toLocaleString()}`} 
          icon={<Activity className="w-6 h-6 text-money-green" />} 
          loading={loading}
          info="Actual tracked profit organically generated from product ledger. Formula: (∑ Income - ∑ Expenses)"
        />
        <MetricCard 
          title={growthTitle} 
          value={monthlyData.length >= 2 ? `${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%` : '--'} 
          icon={growthRate >= 0 ? <TrendingUp className="w-6 h-6 text-money-green" /> : <TrendingDown className="w-6 h-6 text-red-500" />} 
          trend={monthlyData.length >= 2 ? growthRate : undefined}
          loading={loading}
          info="Comparing recent monthly profits against immediate past to highlight scalable pacing. Formula: ((Current Month - Previous Month) / Previous Month) * 100"
        />
        <MetricCard 
          title="Operating Margin" 
          value={`${operatingMargin.toFixed(1)}%`} 
          icon={<Percent className="w-6 h-6 text-money-green" />} 
          trend={operatingMargin < 5 ? -1 : 1} 
          loading={loading}
          info="Percentage of revenue actively retained after fulfilling structural operating expenses. Formula: (Net Profit / Total Revenue) * 100"
        />
      </div>

      {/* TIER 2 METRICS (Silicon Valley Benchmarks) */}
      <h3 className="text-lg font-bold tracking-tight text-gray-900 mt-8 mb-2">Liability & Risk Engines</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="Structural Burn Rate" 
          value={`${currencyStr}${monthlyBurnRate.toLocaleString(undefined, {maximumFractionDigits: 2})}/mo`} 
          icon={<Flame className="w-6 h-6 text-orange-500" />} 
          loading={loading}
          info="Strict average monthly drain caused natively by active recurring subscriptions. Formula: (∑ Monthly Subscriptions)"
        />
        <MetricCard 
          title="Financial Runway Projection" 
          value={runwayMonths === 999 ? "Infinite (No Burn)" : `${runwayMonths.toFixed(1)} Months left`} 
          icon={<Clock className={`w-6 h-6 ${runwayMonths < 3 ? 'text-red-500' : 'text-money-green'}`} />} 
          trend={runwayMonths < 3 ? -1 : undefined} 
          loading={loading}
          info="Exact amount of timeline months the business can structurally survive relying strictly on current cash reserves assuming absolutely zero future product revenue. Formula: (Total Cash Flow / Monthly Burn)"
        />
        <MetricCard 
          title="Total Open Debt" 
          value={`${currencyStr}${totalDebt.toLocaleString()}`} 
          icon={<Scale className="w-6 h-6 text-yellow-600" />} 
          loading={loading}
          info="Cumulative external liabilities directly tracked towards creditors. Formula: (∑ Remaining Principal Balances)"
        />
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        
        {/* Main P&L Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="text-xl font-semibold mb-6">Income vs Expenses (Monthly)</h3>
          <div className="h-[350px]">
            {loading ? (
               <div className="w-full h-full flex items-center justify-center text-gray-400">Loading chart data...</div>
            ) : monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#15803d" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#15803d" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="income" stroke="#15803d" fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                 <Activity className="w-12 h-12 mb-2 opacity-30" />
                 <p>No transactions logged yet.</p>
               </div>
            )}
          </div>
        </div>

        {/* Expense Concentration PieChart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1">
          <h3 className="text-xl font-semibold mb-6">Expense Concentration</h3>
          <div className="h-[350px]">
             {loading ? (
                 <div className="w-full h-full flex items-center justify-center text-gray-400">Loading chart data...</div>
             ) : expenseCategories.length > 0 ? (
               <div className="w-full h-full flex flex-col">
                 <div className="flex-1">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                         data={expenseCategories}
                         innerRadius={60}
                         outerRadius={100}
                         paddingAngle={2}
                         dataKey="value"
                         stroke="none"
                       >
                         {expenseCategories.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                         ))}
                       </Pie>
                       <Tooltip formatter={(value: any) => `${currencyStr}${Number(value || 0).toLocaleString()}`} />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
                 {/* Custom Legend to fit nicely */}
                 <div className="mt-4 max-h-32 overflow-y-auto space-y-2">
                   {expenseCategories.slice(0, 5).map((category, idx) => (
                     <div key={category.name} className="flex items-center justify-between text-sm">
                       <div className="flex items-center truncate">
                         <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></div>
                         <span className="text-gray-600 truncate max-w-[140px] pr-2" title={category.name}>{category.name}</span>
                       </div>
                       <span className="font-semibold text-gray-900">{currencyStr}{category.value.toLocaleString()}</span>
                     </div>
                   ))}
                   {expenseCategories.length > 5 && (
                     <div className="text-xs text-center text-gray-400 font-medium pt-2 border-t">...and {expenseCategories.length - 5} more categories</div>
                   )}
                 </div>
               </div>
             ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-center">
                  <Activity className="w-12 h-12 mb-2 opacity-30" />
                  <p>Log expenses via strict categories to generate distribution.</p>
                </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, trend, loading, info }: { title: string, value: string, icon: React.ReactNode, trend?: number, loading?: boolean, info?: string }) {
  // If trend is provided as negative, tint the card lightly to warn the user
  const isWarningCard = trend !== undefined && trend < 0; 
  
  return (
    <div className={`p-6 rounded-xl shadow-sm border flex items-center justify-between group hover:shadow-md transition-shadow 
      ${isWarningCard ? 'bg-red-50/50 border-red-100' : 'bg-white border-gray-100'}`}>
      <div>
        <div className={`text-sm font-medium mb-1 flex items-center gap-1.5 relative group/info ${isWarningCard ? 'text-red-700/70' : 'text-gray-500'}`}>
          {title}
          {info && (
            <>
              <Info className="w-3.5 h-3.5 cursor-help opacity-60 hover:opacity-100 transition-opacity" />
              <div 
                className="absolute left-0 bottom-full mb-2 hidden w-64 p-2.5 text-xs leading-relaxed rounded-lg shadow-2xl group-hover/info:block pointer-events-none"
                style={{ backgroundColor: '#111827', color: '#ffffff', opacity: 1, zIndex: 20000 }}
              >
                {info}
              </div>
            </>
          )}
        </div>
        <p className={`text-2xl font-bold ${isWarningCard ? 'text-red-900' : 'text-gray-900'}`}>
          {loading ? <span className="animate-pulse bg-gray-200 h-6 w-20 rounded block mt-2"></span> : value}
        </p>
      </div>
      <div className={`p-3 rounded-full transition-transform group-hover:scale-110 
        ${isWarningCard ? 'bg-red-100/50' : 'bg-money-light'}`}>
        {icon}
      </div>
    </div>
  );
}
