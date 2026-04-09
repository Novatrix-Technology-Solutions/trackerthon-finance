"use client";

import React from 'react';
import jsPDF from 'jspdf';
import { Transaction } from '@/lib/calculations';
import { Download } from 'lucide-react';
import { useCurrency } from '@/components/CurrencyProvider';

interface ReportProps {
  transactions: Transaction[];
  metrics?: {
    totalCashFlow: number;
    netProfit: number;
    operatingMargin: number;
    monthlyBurnRate: number;
    runwayMonths: number;
    totalDebt: number;
  };
}

export default function ReportGenerator({ transactions, metrics }: ReportProps) {
  const { currencyStr } = useCurrency();

  const generatePDF = () => {
    const doc = new jsPDF();
    const uniqueHash = Math.random().toString(36).substring(2, 9).toUpperCase();
    
    // Header
    doc.setTextColor(21, 128, 61); // Money Green
    doc.setFontSize(22);
    doc.text('Novatrix Technologies Limited: Financial Report', 20, 20);
    
    doc.setTextColor(100);
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
    
    // Summary
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text('Profit & Loss Summary', 20, 45);
    doc.setFontSize(11);
    doc.text(`Total Lifetime Income: ${currencyStr}${totalIncome.toLocaleString()}`, 20, 55);
    doc.text(`Total Lifetime Expenses: ${currencyStr}${totalExpense.toLocaleString()}`, 20, 62);
    
    // Core KPIs from context
    if (metrics) {
      doc.setFontSize(14);
      doc.text('Advanced Business Metrics', 110, 45);
      doc.setFontSize(11);
      
      doc.text(`Operating Margin: ${metrics.operatingMargin.toFixed(1)}%`, 110, 55);
      doc.text(`Total Open Debt: ${currencyStr}${metrics.totalDebt.toLocaleString()}`, 110, 62);
      doc.text(`Monthly Burn Rate: ${currencyStr}${metrics.monthlyBurnRate.toLocaleString(undefined, {maximumFractionDigits: 2})}/mo`, 110, 69);
      
      const rMonths = metrics.runwayMonths === 999 ? 'Infinite' : `${metrics.runwayMonths.toFixed(1)} months`;
      doc.text(`Runway Projection: ${rMonths}`, 110, 76);
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Net Profit: ${currencyStr}${metrics?.netProfit.toLocaleString() || (totalIncome - totalExpense).toLocaleString()}`, 20, 76);
    doc.setFont('helvetica', 'normal');

    // Ledger Snapshot
    doc.setFontSize(14);
    doc.text('Recent Transactions Ledger', 20, 95);
    
    doc.setFontSize(10);
    let y = 105;
    
    // Table Header
    doc.setFont('helvetica', 'bold');
    doc.text('Date', 20, y);
    doc.text('Description', 60, y);
    doc.text('Category', 130, y);
    doc.text('Amount', 170, y);
    
    y += 8;
    doc.setFont('helvetica', 'normal');
    
    transactions.slice(0, 15).forEach((t) => {
      doc.text(t.date, 20, y);
      doc.text(t.description.substring(0, 25), 60, y);
      doc.text(t.category, 130, y);
      const amtText = t.type === 'income' ? `+${currencyStr}${t.amount}` : `-${currencyStr}${t.amount}`;
      if(t.type === 'income') doc.setTextColor(21, 128, 61);
      else doc.setTextColor(239, 68, 68);
      
      doc.text(amtText, 170, y);
      doc.setTextColor(0);
      y += 8;
    });

    doc.save(`Trackerthon_Report_${uniqueHash}.pdf`);
  };

  return (
    <button 
      onClick={generatePDF}
      className="flex items-center gap-2 bg-money-green hover:bg-money-hover text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
    >
      <Download className="w-4 h-4" />
      Generate Report (PDF)
    </button>
  );
}
