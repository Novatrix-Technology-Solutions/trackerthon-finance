"use client";

import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Trash2, Pencil, Calendar } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useCurrency } from '@/components/CurrencyProvider';

interface RecurringPayment {
  id: string;
  subscription_name: string;
  amount: number;
  category: string;
  frequency: string;
  next_billing_date: string;
  calendar_event_id?: string | null;
}

export default function RecurringPage() {
  const { currencyStr } = useCurrency();
  const supabase = createClient();
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPayment, setNewPayment] = useState<Partial<RecurringPayment>>({ frequency: 'Monthly' });

  useEffect(() => {
    const fetchPayments = async () => {
      const { data } = await supabase.from('recurring_payments').select('*').order('next_billing_date', { ascending: true });
      if (data) setPayments(data);
      setLoading(false);
    };
    fetchPayments();
  }, [supabase]);

  const syncToCalendar = async (paymentData: RecurringPayment, action: 'create' | 'update' | 'delete') => {
    try {
      const res = await fetch('/api/calendar-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'recurring_payment', 
          action, 
          data: paymentData,
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
    if (!newPayment.subscription_name || !newPayment.amount || !newPayment.next_billing_date) return;

    if (editingId) {
      // 1. Update in Supabase
      const { data, error } = await supabase
        .from('recurring_payments')
        .update({
          subscription_name: newPayment.subscription_name,
          amount: Number(newPayment.amount),
          category: newPayment.category || 'Other',
          frequency: newPayment.frequency,
          next_billing_date: newPayment.next_billing_date
        })
        .eq('id', editingId)
        .select();

      if (data) {
        let updatedEntity = data[0];
        setPayments(payments.map(p => p.id === editingId ? updatedEntity : p));
        
        // 2. Background sync to Calendar
        const generatedEventId = await syncToCalendar(updatedEntity, 'update');
        
        // Catch gracefully created events (usually happens if editing historically generated records without IDs)
        if (generatedEventId && !updatedEntity.calendar_event_id) {
           const { data: patchedRecord } = await supabase.from('recurring_payments').update({ calendar_event_id: generatedEventId }).eq('id', editingId).select();
           if (patchedRecord) setPayments(payments.map(p => p.id === editingId ? patchedRecord[0] : p));
        }
      }
    } else {
      // 1. Insert into Supabase
      const { data, error } = await supabase
        .from('recurring_payments')
        .insert([{
          subscription_name: newPayment.subscription_name,
          amount: Number(newPayment.amount),
          category: newPayment.category || 'Other',
          frequency: newPayment.frequency,
          next_billing_date: newPayment.next_billing_date
        }])
        .select();

      if (data) {
        let insertedPayment = data[0];
        setPayments([...payments, insertedPayment]);
        
        // 2. Mock Background sync to Calendar (to fetch event ID)
        const eventId = await syncToCalendar(insertedPayment, 'create');
        if (eventId) {
          // 3. Update Supabase with generated Calendar ID
          const { data: updatedData } = await supabase.from('recurring_payments').update({ calendar_event_id: eventId }).eq('id', insertedPayment.id).select();
          if (updatedData) setPayments([...payments.filter(p => p.id !== insertedPayment.id), updatedData[0]]);
        }
      }
    }

    setIsFormOpen(false);
    setEditingId(null);
    setNewPayment({ frequency: 'Monthly' });
  };

  const deletePayment = async (payment: RecurringPayment) => {
    // 1. Sync deletion to Google Calendar first
    await syncToCalendar(payment, 'delete');

    // 2. Delete from Supabase
    const { error } = await supabase.from('recurring_payments').delete().eq('id', payment.id);
    if (!error) {
      setPayments(payments.filter(p => p.id !== payment.id));
    }
  };

  const openEdit = (p: RecurringPayment) => {
    setEditingId(p.id);
    setNewPayment({ ...p });
    setIsFormOpen(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setNewPayment({ frequency: 'Monthly' });
    setIsFormOpen(!isFormOpen);
  };

  const weeklyTotal = payments.filter(p => p.frequency === 'Weekly').reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyTotal = payments.filter(p => p.frequency === 'Monthly').reduce((acc, curr) => acc + curr.amount, 0);
  const yearlyTotal = payments.filter(p => p.frequency === 'Yearly').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Recurring Payments</h2>
        <button 
          onClick={openAdd}
          className="flex items-center gap-2 bg-money-green hover:bg-money-hover text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Subscription
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Subscription' : 'Log New Subscription'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
              <input type="text" className="w-full border rounded-lg p-2" value={newPayment.subscription_name || ''} onChange={e => setNewPayment({...newPayment, subscription_name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input type="number" step="0.01" className="w-full border rounded-lg p-2" value={newPayment.amount || ''} onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input type="text" className="w-full border rounded-lg p-2" value={newPayment.category || ''} onChange={e => setNewPayment({...newPayment, category: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select className="w-full border rounded-lg p-2" value={newPayment.frequency} onChange={e => setNewPayment({...newPayment, frequency: e.target.value})}>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Billing Date</label>
              <input type="date" className="w-full border rounded-lg p-2" value={newPayment.next_billing_date || ''} onChange={e => setNewPayment({...newPayment, next_billing_date: e.target.value})} required />
            </div>
            <div className="lg:col-span-5 flex justify-end mt-2">
              <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800">
                {editingId ? 'Update Subscription' : 'Create & Sync to Calendar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-700 to-green-900 text-white p-6 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-money-light text-sm font-medium mb-1">Weekly Liabilities</p>
            <p className="text-3xl font-bold">
               {loading ? <span className="animate-pulse bg-money-dark h-8 w-24 rounded block mt-1"></span> : `${currencyStr}${weeklyTotal.toLocaleString()}`}
            </p>
          </div>
          <RefreshCw className="w-8 h-8 text-white opacity-40 ml-4" />
        </div>
        <div className="bg-gradient-to-br from-money-green to-money-hover text-white p-6 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-money-light text-sm font-medium mb-1">Monthly Subscriptions</p>
            <p className="text-3xl font-bold">
               {loading ? <span className="animate-pulse bg-money-dark h-8 w-32 rounded block mt-1"></span> : `${currencyStr}${monthlyTotal.toLocaleString()}`}
            </p>
          </div>
          <RefreshCw className="w-8 h-8 text-white opacity-40 ml-4" />
        </div>
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white p-6 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Yearly Contracts</p>
            <p className="text-3xl font-bold">
               {loading ? <span className="animate-pulse bg-blue-800 h-8 w-32 rounded block mt-1"></span> : `${currencyStr}${yearlyTotal.toLocaleString()}`}
            </p>
          </div>
          <RefreshCw className="w-8 h-8 text-white opacity-40 ml-4" />
        </div>
      </div>

      {!loading && payments.length === 0 && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
          <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No active subscriptions tracked.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {payments.map(p => {
          return (
            <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:shadow-md transition-shadow relative">
              <div className="absolute top-4 right-4 flex space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(p)} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deletePayment(p)} className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <div className="flex justify-between items-start mb-4 pr-16">
                  <h3 className="font-semibold text-lg text-gray-900 truncate">{p.subscription_name}</h3>
                  {p.calendar_event_id && (
                     <div title="Synced to Google Calendar" className="flex items-center">
                       <Calendar className="w-4 h-4 text-blue-500" />
                     </div>
                  )}
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Amount</span>
                      <span className="font-bold text-2xl text-money-dark">{currencyStr}{p.amount.toLocaleString()}</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">{p.frequency}</span>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm mb-2">
                       <span className="text-gray-500">Category</span>
                       <span className="font-medium text-gray-900">{p.category}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Next Billing</span>
                       <span className="font-medium text-gray-900">{p.next_billing_date}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
