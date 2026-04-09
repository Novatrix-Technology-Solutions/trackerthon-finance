"use client";

import React, { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, CheckCircle2, Plus, Trash2, Pencil } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useCurrency } from '@/components/CurrencyProvider';

interface Debt {
  id: string;
  creditor: string;
  principal: number;
  remaining: number;
  interest_rate: number;
  due_date: string;
  calendar_event_id?: string | null;
}

export default function DebtsPage() {
  const { currencyStr } = useCurrency();
  const supabase = createClient();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDebt, setNewDebt] = useState<Partial<Debt>>({});

  useEffect(() => {
    const fetchDebts = async () => {
      const { data } = await supabase.from('debts').select('*').order('due_date', { ascending: true });
      if (data) setDebts(data);
      setLoading(false);
    };
    fetchDebts();
  }, [supabase]);

  const syncToCalendar = async (debtData: Debt, action: 'create' | 'update' | 'delete') => {
    try {
      const res = await fetch('/api/calendar-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'debt', 
          action, 
          data: debtData,
          currency: currencyStr
        })
      });
      const result = await res.json();
      return result.calendar_event_id;
    } catch (e) {
      console.warn('Backend sync disabled in UI-vacuum mode:', e);
      return null;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebt.creditor || !newDebt.principal || !newDebt.due_date) return;

    if (editingId) {
      const { data, error } = await supabase
        .from('debts')
        .update({
          creditor: newDebt.creditor,
          principal: Number(newDebt.principal),
          remaining: Number(newDebt.remaining || 0),
          interest_rate: Number(newDebt.interest_rate || 0),
          due_date: newDebt.due_date
        })
        .eq('id', editingId)
        .select();

      if (data) {
        let updatedEntity = data[0];
        setDebts(debts.map(d => d.id === editingId ? updatedEntity : d));
        
        const generatedEventId = await syncToCalendar(updatedEntity, 'update');
        
        // Ensure graceful ID patch if historical record spawns a new Calendar node physically
        if (generatedEventId && !updatedEntity.calendar_event_id) {
           const { data: patchedRecord } = await supabase.from('debts').update({ calendar_event_id: generatedEventId }).eq('id', editingId).select();
           if (patchedRecord) setDebts(debts.map(d => d.id === editingId ? patchedRecord[0] : d));
        }
      }
    } else {
      const { data, error } = await supabase
        .from('debts')
        .insert([{
          creditor: newDebt.creditor,
          principal: Number(newDebt.principal),
          remaining: Number(newDebt.remaining || newDebt.principal),
          interest_rate: Number(newDebt.interest_rate || 0),
          due_date: newDebt.due_date
        }])
        .select();

      if (data) {
        let insertedDebt = data[0];
        setDebts([...debts, insertedDebt]);
        
        const eventId = await syncToCalendar(insertedDebt, 'create');
        if (eventId) {
          const { data: updatedData } = await supabase.from('debts').update({ calendar_event_id: eventId }).eq('id', insertedDebt.id).select();
          if (updatedData) setDebts([...debts.filter(d => d.id !== insertedDebt.id), updatedData[0]]);
        }
      }
    }

    setIsFormOpen(false);
    setEditingId(null);
    setNewDebt({});
  };

  const deleteDebt = async (debt: Debt) => {
    await syncToCalendar(debt, 'delete');
    const { error } = await supabase.from('debts').delete().eq('id', debt.id);
    if (!error) {
      setDebts(debts.filter(d => d.id !== debt.id));
    }
  };

  const openEdit = (debt: Debt) => {
    setEditingId(debt.id);
    setNewDebt({ ...debt });
    setIsFormOpen(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setNewDebt({});
    setIsFormOpen(!isFormOpen);
  };

  const totalDebt = debts.reduce((acc, curr) => acc + curr.remaining, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Debt & Liability Tracker</h2>
        <button 
          onClick={openAdd}
          className="flex items-center gap-2 bg-money-green hover:bg-money-hover text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Liability
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Liability' : 'Log New Liability'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Creditor</label>
              <input type="text" className="w-full border rounded-lg p-2" value={newDebt.creditor || ''} onChange={e => setNewDebt({...newDebt, creditor: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Principal Amount</label>
              <input type="number" className="w-full border rounded-lg p-2" value={newDebt.principal || ''} onChange={e => setNewDebt({...newDebt, principal: Number(e.target.value)})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Balance</label>
              <input type="number" className="w-full border rounded-lg p-2" value={newDebt.remaining !== undefined ? newDebt.remaining : ''} onChange={e => setNewDebt({...newDebt, remaining: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
              <input type="number" step="0.1" className="w-full border rounded-lg p-2" value={newDebt.interest_rate !== undefined ? newDebt.interest_rate : ''} onChange={e => setNewDebt({...newDebt, interest_rate: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" className="w-full border rounded-lg p-2" value={newDebt.due_date || ''} onChange={e => setNewDebt({...newDebt, due_date: e.target.value})} required />
            </div>
            <div className="lg:col-span-5 flex justify-end mt-2">
              <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800">
                {editingId ? 'Update Liability' : 'Save Liability'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-money-green text-white p-6 rounded-xl shadow-md flex items-center justify-between">
        <div>
          <p className="text-money-light text-sm font-medium mb-1">Total Outstanding Debt</p>
          <p className="text-4xl font-bold">
             {loading ? <span className="animate-pulse bg-money-dark h-10 w-48 rounded block mt-1"></span> : `${currencyStr}${totalDebt.toLocaleString()}`}
          </p>
        </div>
        <CreditCard className="w-12 h-12 text-money-light opacity-80" />
      </div>

      {!loading && debts.length === 0 && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No active liabilities recorded.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {debts.map(debt => {
          const progress = debt.principal > 0 ? ((debt.principal - debt.remaining) / debt.principal) * 100 : 0;
          return (
            <div key={debt.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:-translate-y-1 transition-transform relative">
              <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(debt)} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteDebt(debt)} className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <div className="flex justify-between items-start mb-4 pr-16">
                  <h3 className="font-semibold text-lg text-gray-900 truncate">{debt.creditor}</h3>
                  {debt.remaining === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-money-green flex-shrink-0 ml-2" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                  )}
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Remaining</span>
                    <span className="font-medium text-gray-900">{currencyStr}{debt.remaining.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Principal</span>
                    <span className="font-medium text-gray-900">{currencyStr}{debt.principal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Interest Rate</span>
                    <span className="font-medium text-gray-900">{debt.interest_rate}% APR</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Due Date</span>
                    <span className="font-medium text-gray-900">{debt.due_date}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Repayment Progress</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-money-green h-2 rounded-full" style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
