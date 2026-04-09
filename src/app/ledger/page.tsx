"use client";

import React, { useState, useEffect } from 'react';
import { Transaction } from '@/lib/calculations';
import { Search, Filter, Plus, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useCurrency } from '@/components/CurrencyProvider';

export default function Ledger() {
  const { currencyStr } = useCurrency();
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTx, setNewTx] = useState<Partial<Transaction>>({ type: 'expense', payment_status: 'paid' });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (error) {
      console.error('Error fetching transactions:', error);
    } else if (data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  const syncToSheets = async (txData: Transaction, action: 'create' | 'update' | 'delete') => {
    try {
      await fetch('/api/google-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, transaction: txData })
      });
    } catch {}
  };

  const categories = ['All', ...Array.from(new Set(transactions.map(t => t.category)))];

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.description || !newTx.date || !newTx.category) return;

    if (editingId) {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          amount: Number(newTx.amount),
          description: newTx.description,
          date: newTx.date,
          category: newTx.category,
          payment_status: newTx.payment_status,
          type: newTx.type
        })
        .eq('id', editingId)
        .select();

      if (error) console.error(error);
      if (data) {
        setTransactions(transactions.map(t => t.id === editingId ? data[0] : t));
        syncToSheets(data[0], 'update');
      }
    } else {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          amount: Number(newTx.amount),
          description: newTx.description,
          date: newTx.date,
          category: newTx.category,
          payment_status: newTx.payment_status,
          type: newTx.type
        }])
        .select();

      if (error) console.error(error);
      if (data) {
        setTransactions([data[0], ...transactions]);
        syncToSheets(data[0], 'create');
      }
    }

    setIsFormOpen(false);
    setEditingId(null);
    setNewTx({ type: 'expense', payment_status: 'paid' });
  };

  const deleteTransaction = async (tx: Transaction) => {
    await syncToSheets(tx, 'delete');
    
    const { error } = await supabase.from('transactions').delete().eq('id', tx.id);
    if (error) {
      console.error('Error deleting transaction', error);
    } else {
      setTransactions(transactions.filter(t => t.id !== tx.id));
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
    setIsFormOpen(!isFormOpen);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Transaction Ledger</h2>
        <button 
          onClick={openAdd}
          className="flex items-center gap-2 bg-money-green hover:bg-money-hover text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Transaction
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Transaction' : 'Log New Transaction'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" className="w-full border rounded-lg p-2" value={newTx.description || ''} onChange={e => setNewTx({...newTx, description: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input type="number" className="w-full border rounded-lg p-2" value={newTx.amount || ''} onChange={e => setNewTx({...newTx, amount: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select 
                className="w-full border rounded-lg p-2 bg-white" 
                value={newTx.category || ''} 
                onChange={e => setNewTx({...newTx, category: e.target.value})}
                required
              >
                <option value="" disabled>Select a Category...</option>
                <optgroup label="Operating Expenses">
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
                <optgroup label="Revenue Streams">
                  <option value="Sales & Core Revenue">Sales & Core Revenue</option>
                  <option value="Consulting & Services">Consulting & Services</option>
                  <option value="Investments & Dividends">Investments & Dividends</option>
                  <option value="Grants & Funding">Grants & Funding</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="Miscellaneous / Other">Miscellaneous / Other</option>
                </optgroup>
                
                {/* Dynamically include existing custom categories if editing an old legacy transaction */}
                {newTx.category && ![
                  "Software & Subscriptions", "Hardware & Equipment", "Marketing & Advertising", 
                  "Payroll & Contractors", "Office Supplies & Rent", "Travel & Meals", 
                  "Legal & Professional", "Taxes & Licenses", "Utilities & Internet", 
                  "Debt Repayment", "Sales & Core Revenue", "Consulting & Services", 
                  "Investments & Dividends", "Grants & Funding", "Miscellaneous / Other"
                ].includes(newTx.category) && (
                  <option value={newTx.category}>{newTx.category} (Legacy)</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" className="w-full border rounded-lg p-2" value={newTx.date || ''} onChange={e => setNewTx({...newTx, date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select className="w-full border rounded-lg p-2" value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value as 'income'|'expense'})}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full border rounded-lg p-2" value={newTx.payment_status} onChange={e => setNewTx({...newTx, payment_status: e.target.value as 'paid'|'pending'})}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="lg:col-span-4 flex justify-end">
              <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800">
                {editingId ? 'Update & Sync to Sheets' : 'Save & Sync to Sheets'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search transactions..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-money-light focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-5 h-5 text-gray-400" />
          <select 
            className="border rounded-lg py-2 px-3 focus:ring-2 focus:ring-money-light bg-white focus:outline-none"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Loading transactions from Supabase...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No transactions found matching your criteria.
                </td>
              </tr>
            ) : filteredTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.date}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{tx.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">{tx.category}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.payment_status === 'paid' ? 'bg-money-light text-money-dark' : 'bg-yellow-100 text-yellow-800'}`}>
                    {tx.payment_status}
                  </span>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${tx.type === 'income' ? 'text-money-green' : 'text-gray-900'}`}>
                  {tx.type === 'income' ? '+' : '-'}{currencyStr}{tx.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => openEdit(tx)} className="text-gray-400 hover:text-money-green transition-colors mr-3">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteTransaction(tx)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
