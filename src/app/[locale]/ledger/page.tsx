"use client";

import React, { useState } from 'react';
import { Transaction } from '@/lib/calculations';
import { Search, Filter, Plus, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useCurrency } from '@/components/CurrencyProvider';
import Drawer from '@/components/ui/Drawer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getCategoryColor } from '@/lib/colors';
import { useTranslation } from '@/providers/LanguageProvider';

export default function Ledger() {
  const { formatAmount } = useCurrency();
  const { t } = useTranslation();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTx, setNewTx] = useState<Partial<Transaction>>({ type: 'expense', payment_status: 'paid' });

  const { data: transactions = [], isLoading: loading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    }
  });

  const syncToSheets = async (txData: Transaction, action: 'create' | 'update' | 'delete') => {
    try {
      const res = await fetch('/api/google-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, transaction: txData })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Sync failed');
      toast.success(`Google Sheets: ${action} successful`);
    } catch (e: any) {
      toast.error(`Google Sheets sync failed: ${e.message}`);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (tx: Partial<Transaction>) => {
      if (editingId) {
        const { data, error } = await supabase
          .from('transactions')
          .update({
            amount: Number(tx.amount),
            description: tx.description,
            date: tx.date,
            category: tx.category,
            payment_status: tx.payment_status,
            type: tx.type
          })
          .eq('id', editingId)
          .select();
        if (error) throw error;
        await syncToSheets(data[0], 'update');
        return data[0];
      } else {
        const { data, error } = await supabase
          .from('transactions')
          .insert([{
            amount: Number(tx.amount),
            description: tx.description,
            date: tx.date,
            category: tx.category,
            payment_status: tx.payment_status,
            type: tx.type
          }])
          .select();
        if (error) throw error;
        await syncToSheets(data[0], 'create');
        return data[0];
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(editingId ? t('ledger.toast_updated') : t('ledger.toast_created'));
      setIsFormOpen(false);
      setEditingId(null);
      setNewTx({ type: 'expense', payment_status: 'paid' });
    },
    onError: (err: any) => {
      toast.error(`Failed to save: ${err.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (tx: Transaction) => {
      await syncToSheets(tx, 'delete');
      const { error } = await supabase.from('transactions').delete().eq('id', tx.id);
      if (error) throw error;
      return tx.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(t('ledger.toast_deleted'));
    },
    onError: (err: any) => {
      toast.error(`Failed to delete: ${err.message}`);
    }
  });

  const categories = ['All', ...Array.from(new Set(transactions.map(t => t.category)))];

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.description || !newTx.date || !newTx.category) return;
    saveMutation.mutate(newTx);
  };

  const deleteTransaction = (tx: Transaction) => {
    if (window.confirm(t('ledger.confirm_delete'))) {
      deleteMutation.mutate(tx);
    }
  };

  const openEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setNewTx({ ...tx });
    setIsFormOpen(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setNewTx({ type: 'expense', payment_status: 'paid' });
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-base-200">
        <h2 className="text-3xl font-bold tracking-tight text-base-content">{t('ledger.title')}</h2>
        <button 
          onClick={openAdd}
          className="btn btn-primary w-full md:w-auto"
        >
          <Plus className="w-4 h-4" /> {t('ledger.add_tx')}
        </button>
      </div>

      <Drawer isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingId ? t('ledger.edit_tx') : t('ledger.log_tx')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">{t('ledger.description')}</span></label>
            <input type="text" className="input input-bordered w-full" value={newTx.description || ''} onChange={e => setNewTx({...newTx, description: e.target.value})} required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('ledger.amount')}</span></label>
            <input type="number" step="0.01" className="input input-bordered w-full" value={newTx.amount || ''} onChange={e => setNewTx({...newTx, amount: Number(e.target.value)})} required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('ledger.category')}</span></label>
            <select 
              className="select select-bordered w-full" 
              value={newTx.category || ''} 
              onChange={e => setNewTx({...newTx, category: e.target.value})}
              required
            >
              <option value="" disabled>{t('ledger.select_cat')}</option>
              <optgroup label={t('ledger.cat_group_opex')}>
                <option value="Software & Subscriptions">Software & Subscriptions</option>
                <option value="Hardware & Equipment">Hardware & Equipment</option>
                <option value="Marketing & Advertising">Marketing & Advertising</option>
                <option value="Payroll & Contractors">Payroll & Contractors</option>
                <option value="Office Supplies & Rent">Office Supplies & Rent</option>
                <option value="Travel & Meals">Travel & Meals</option>
                <option value="Legal & Professional">Legal & Professional</option>
                <option value="Taxes & Licenses">Taxes & Licenses</option>
                <option value="Utilities & Internet">Utilities & Internet</option>
                <option value="Debt Repayment">Debt Repayment</option>
              </optgroup>
              <optgroup label={t('ledger.cat_group_rev')}>
                <option value="Sales & Core Revenue">Sales & Core Revenue</option>
                <option value="Consulting & Services">Consulting & Services</option>
                <option value="Investments & Dividends">Investments & Dividends</option>
                <option value="Grants & Funding">Grants & Funding</option>
              </optgroup>
              <optgroup label={t('ledger.cat_group_other')}>
                <option value="Miscellaneous / Other">Miscellaneous / Other</option>
              </optgroup>
              {newTx.category && ![
                "Software & Subscriptions", "Hardware & Equipment", "Marketing & Advertising", 
                "Payroll & Contractors", "Office Supplies & Rent", "Travel & Meals", 
                "Legal & Professional", "Taxes & Licenses", "Utilities & Internet", 
                "Debt Repayment", "Sales & Core Revenue", "Consulting & Services", 
                "Investments & Dividends", "Grants & Funding", "Miscellaneous / Other"
              ].includes(newTx.category) && (
                <option value={newTx.category}>{newTx.category} ({t('ledger.legacy')})</option>
              )}
            </select>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('ledger.date')}</span></label>
            <input type="date" className="input input-bordered w-full" value={newTx.date || ''} onChange={e => setNewTx({...newTx, date: e.target.value})} required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('ledger.type')}</span></label>
            <select className="select select-bordered w-full" value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value as 'income'|'expense'})}>
              <option value="expense">{t('ledger.expense')}</option>
              <option value="income">{t('ledger.income')}</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('ledger.status')}</span></label>
            <select className="select select-bordered w-full" value={newTx.payment_status} onChange={e => setNewTx({...newTx, payment_status: e.target.value as 'paid'|'pending'})}>
              <option value="paid">{t('ledger.paid')}</option>
              <option value="pending">{t('ledger.pending')}</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={saveMutation.isPending} className="btn btn-primary">
              {saveMutation.isPending ? <span className="loading loading-spinner"></span> : null}
              {saveMutation.isPending ? t('ledger.saving') : (editingId ? t('ledger.update_sync') : t('ledger.save_sync'))}
            </button>
          </div>
        </form>
      </Drawer>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-base-100 p-4 rounded-xl shadow-sm border border-base-200">
        <label className="input input-bordered flex items-center gap-2 w-full md:w-96">
          <Search className="w-4 h-4 opacity-70" />
          <input 
            type="text" 
            placeholder={t('ledger.search')} 
            className="grow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-5 h-5 opacity-70" />
          <select 
            className="select select-bordered w-full md:w-auto"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat === 'All' ? t('ledger.all_cats') : cat}</option>)}
          </select>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm border border-base-200 overflow-x-auto w-full p-2 md:p-0">
        <table className="table table-zebra table-md w-full block md:table">
          <thead className="hidden md:table-header-group">
            <tr>
              <th>{t('ledger.date_th')}</th>
              <th>{t('ledger.desc_th')}</th>
              <th>{t('ledger.cat_th')}</th>
              <th>{t('ledger.status_th')}</th>
              <th className="text-right">{t('ledger.amount_th')}</th>
              <th className="text-right">{t('ledger.actions_th')}</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {loading ? (
              <tr className="block md:table-row">
                <td colSpan={6} className="text-center py-8 block md:table-cell">
                  <span className="loading loading-dots loading-lg text-primary"></span>
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr className="block md:table-row">
                <td colSpan={6} className="text-center py-8 opacity-50 block md:table-cell">
                  {t('ledger.no_matches')}
                </td>
              </tr>
            ) : filteredTransactions.map((tx) => (
              <tr key={tx.id} className="hover block md:table-row mb-4 border border-base-300 md:border-none rounded-lg p-3 bg-base-100 md:bg-transparent shadow-sm md:shadow-none">
                <td className="block md:table-cell border-none md:border-b relative pl-[45%] md:pl-4 py-2 md:py-4 text-left whitespace-nowrap text-sm opacity-70" data-label={t('ledger.date_th')}>
                  <span className="absolute left-3 top-2.5 font-bold md:hidden text-xs text-base-content/60">{t('ledger.date_th')}</span>
                  {tx.date}
                </td>
                <td className="block md:table-cell border-none md:border-b relative pl-[45%] md:pl-4 py-2 md:py-4 text-left font-medium" data-label={t('ledger.desc_th')}>
                  <span className="absolute left-3 top-2.5 font-bold md:hidden text-xs text-base-content/60">{t('ledger.desc_th')}</span>
                  {tx.description}
                </td>
                <td className="block md:table-cell border-none md:border-b relative pl-[45%] md:pl-4 py-2 md:py-4 text-left whitespace-nowrap" data-label={t('ledger.cat_th')}>
                  <span className="absolute left-3 top-2.5 font-bold md:hidden text-xs text-base-content/60">{t('ledger.cat_th')}</span>
                  <span className={`badge badge-sm font-medium ${getCategoryColor(tx.category).bgClass} ${getCategoryColor(tx.category).textClass}`}>{tx.category}</span>
                </td>
                <td className="block md:table-cell border-none md:border-b relative pl-[45%] md:pl-4 py-2 md:py-4 text-left whitespace-nowrap" data-label={t('ledger.status_th')}>
                  <span className="absolute left-3 top-2.5 font-bold md:hidden text-xs text-base-content/60">{t('ledger.status_th')}</span>
                  <span className={`badge badge-sm ${tx.payment_status === 'paid' ? 'badge-success badge-outline' : 'badge-warning badge-outline'}`}>
                    {tx.payment_status === 'paid' ? t('ledger.paid') : t('ledger.pending')}
                  </span>
                </td>
                <td className={`block md:table-cell border-none md:border-b relative pl-[45%] md:pl-4 py-2 md:py-4 text-left md:text-right font-medium ${tx.type === 'income' ? 'text-success' : ''}`} data-label={t('ledger.amount_th')}>
                  <span className="absolute left-3 top-2.5 font-bold md:hidden text-xs text-base-content/60">{t('ledger.amount_th')}</span>
                  {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)}
                </td>
                <td className="block md:table-cell border-none md:border-b relative pl-[45%] md:pl-4 py-2 md:py-4 text-left md:text-right whitespace-nowrap" data-label={t('ledger.actions_th')}>
                  <span className="absolute left-3 top-3.5 font-bold md:hidden text-xs text-base-content/60">{t('ledger.actions_th')}</span>
                  <div className="inline-flex md:flex justify-start md:justify-end gap-1">
                    <button onClick={() => openEdit(tx)} className="btn btn-ghost btn-square h-11 w-11 min-h-0 md:h-8 md:w-8 text-base-content/70 hover:text-primary">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteTransaction(tx)} disabled={deleteMutation.isPending} className="btn btn-ghost btn-square h-11 w-11 min-h-0 md:h-8 md:w-8 text-base-content/70 hover:text-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

