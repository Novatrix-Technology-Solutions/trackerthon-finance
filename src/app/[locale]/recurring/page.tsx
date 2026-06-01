"use client";

import React, { useState } from 'react';
import { RefreshCw, Plus, Trash2, Pencil, Calendar } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useCurrency } from '@/components/CurrencyProvider';
import Drawer from '@/components/ui/Drawer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getCategoryColor, getFrequencyColor } from '@/lib/colors';
import { useTranslation } from '@/providers/LanguageProvider';

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
  const { currencyStr, formatAmount } = useCurrency();
  const { t } = useTranslation();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPayment, setNewPayment] = useState<Partial<RecurringPayment>>({ frequency: 'Monthly' });

  const { data: payments = [], isLoading: loading } = useQuery({
    queryKey: ['recurring_payments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('recurring_payments').select('*').order('next_billing_date', { ascending: true });
      if (error) throw error;
      return data as RecurringPayment[];
    }
  });

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
      if (!res.ok) throw new Error(result.error || 'Calendar sync failed');
      return result.calendar_event_id;
    } catch (e: any) {
      console.warn('Backend sync disabled in UI-vacuum mode:', e);
      toast.error(`Calendar sync failed: ${e.message}`);
      return null;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (payment: Partial<RecurringPayment>) => {
      if (editingId) {
        const { data, error } = await supabase
          .from('recurring_payments')
          .update({
            subscription_name: payment.subscription_name,
            amount: Number(payment.amount),
            category: payment.category || 'Other',
            frequency: payment.frequency,
            next_billing_date: payment.next_billing_date
          })
          .eq('id', editingId)
          .select();
        
        if (error) throw error;
        
        let updatedEntity = data[0];
        const generatedEventId = await syncToCalendar(updatedEntity, 'update');
        
        if (generatedEventId && !updatedEntity.calendar_event_id) {
           const { data: patchedRecord } = await supabase.from('recurring_payments').update({ calendar_event_id: generatedEventId }).eq('id', editingId).select();
           if (patchedRecord) updatedEntity = patchedRecord[0];
        }
        return updatedEntity;
      } else {
        const { data, error } = await supabase
          .from('recurring_payments')
          .insert([{
            subscription_name: payment.subscription_name,
            amount: Number(payment.amount),
            category: payment.category || 'Other',
            frequency: payment.frequency,
            next_billing_date: payment.next_billing_date
          }])
          .select();

        if (error) throw error;
        let insertedPayment = data[0];
        const eventId = await syncToCalendar(insertedPayment, 'create');
        if (eventId) {
          const { data: updatedData } = await supabase.from('recurring_payments').update({ calendar_event_id: eventId }).eq('id', insertedPayment.id).select();
          if (updatedData) insertedPayment = updatedData[0];
        }
        return insertedPayment;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_payments'] });
      toast.success(editingId ? t('recurring.toast_updated') : t('recurring.toast_created'));
      setIsFormOpen(false);
      setEditingId(null);
      setNewPayment({ frequency: 'Monthly' });
    },
    onError: (err: any) => {
      toast.error(`Failed to save: ${err.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (payment: RecurringPayment) => {
      await syncToCalendar(payment, 'delete');
      const { error } = await supabase.from('recurring_payments').delete().eq('id', payment.id);
      if (error) throw error;
      return payment.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_payments'] });
      toast.success(t('recurring.toast_deleted'));
    },
    onError: (err: any) => {
      toast.error(`Failed to delete: ${err.message}`);
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.subscription_name || !newPayment.amount || !newPayment.next_billing_date) return;
    saveMutation.mutate(newPayment);
  };

  const deletePayment = (payment: RecurringPayment) => {
    if (window.confirm(t('recurring.confirm_delete'))) {
      deleteMutation.mutate(payment);
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
    setIsFormOpen(true);
  };

  const weeklyTotal = payments.filter(p => p.frequency === 'Weekly').reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyTotal = payments.filter(p => p.frequency === 'Monthly').reduce((acc, curr) => acc + curr.amount, 0);
  const yearlyTotal = payments.filter(p => p.frequency === 'Yearly').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-base-200">
        <h2 className="text-3xl font-bold tracking-tight text-base-content">{t('recurring.title')}</h2>
        <button 
          onClick={openAdd}
          className="btn btn-primary w-full md:w-auto"
        >
          <Plus className="w-4 h-4" /> {t('recurring.add_sub')}
        </button>
      </div>

      <Drawer isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingId ? t('recurring.edit_sub') : t('recurring.log_sub')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">{t('recurring.service_name')}</span></label>
            <input type="text" className="input input-bordered w-full" value={newPayment.subscription_name || ''} onChange={e => setNewPayment({...newPayment, subscription_name: e.target.value})} required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('recurring.amount')}</span></label>
            <input type="number" step="0.01" className="input input-bordered w-full" value={newPayment.amount || ''} onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})} required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('ledger.category')}</span></label>
            <input type="text" className="input input-bordered w-full" value={newPayment.category || ''} onChange={e => setNewPayment({...newPayment, category: e.target.value})} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('recurring.frequency')}</span></label>
            <select className="select select-bordered w-full" value={newPayment.frequency} onChange={e => setNewPayment({...newPayment, frequency: e.target.value})}>
              <option value="Weekly">{t('recurring.weekly')}</option>
              <option value="Monthly">{t('recurring.monthly')}</option>
              <option value="Yearly">{t('recurring.yearly')}</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('recurring.next_billing')}</span></label>
            <input type="date" className="input input-bordered w-full" value={newPayment.next_billing_date || ''} onChange={e => setNewPayment({...newPayment, next_billing_date: e.target.value})} required />
          </div>
          <div className="pt-4 flex justify-end mt-2">
            <button type="submit" disabled={saveMutation.isPending} className="btn btn-primary">
              {saveMutation.isPending ? <span className="loading loading-spinner"></span> : null}
              {saveMutation.isPending ? t('ledger.saving') : (editingId ? t('ledger.update_sync') : t('ledger.save_sync'))}
            </button>
          </div>
        </form>
      </Drawer>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-secondary text-secondary-content shadow-md">
          <div className="card-body flex-row items-center justify-between">
            <div>
              <h2 className="card-title text-secondary-content/80 text-sm font-medium mb-1">{t('recurring.weekly_liabilities')}</h2>
              <p className="text-3xl font-bold">
                 {loading ? <span className="loading loading-dots"></span> : formatAmount(weeklyTotal)}
              </p>
            </div>
            <RefreshCw className="w-8 h-8 opacity-40 ml-4" />
          </div>
        </div>
        <div className="card bg-primary text-primary-content shadow-md">
          <div className="card-body flex-row items-center justify-between">
            <div>
              <h2 className="card-title text-primary-content/80 text-sm font-medium mb-1">{t('recurring.monthly_subs')}</h2>
              <p className="text-3xl font-bold">
                 {loading ? <span className="loading loading-dots"></span> : formatAmount(monthlyTotal)}
              </p>
            </div>
            <RefreshCw className="w-8 h-8 opacity-40 ml-4" />
          </div>
        </div>
        <div className="card bg-accent text-accent-content shadow-md">
          <div className="card-body flex-row items-center justify-between">
            <div>
              <h2 className="card-title text-accent-content/80 text-sm font-medium mb-1">{t('recurring.yearly_contracts')}</h2>
              <p className="text-3xl font-bold">
                 {loading ? <span className="loading loading-dots"></span> : formatAmount(yearlyTotal)}
              </p>
            </div>
            <RefreshCw className="w-8 h-8 opacity-40 ml-4" />
          </div>
        </div>
      </div>

      {!loading && payments.length === 0 && (
        <div className="card bg-base-100 p-8 shadow-sm border border-base-200 text-center opacity-70">
          <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('recurring.no_subs')}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {payments.map(p => {
          return (
            <div key={p.id} className="card bg-base-100 shadow-sm border border-base-200 group hover:shadow-md transition-shadow relative">
              <div className="card-body p-6">
                <div className="absolute top-4 right-4 flex space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(p)} className="btn btn-ghost btn-square h-11 w-11 min-h-0 md:h-8 md:w-8 text-base-content/70 hover:text-primary">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deletePayment(p)} disabled={deleteMutation.isPending} className="btn btn-ghost btn-square h-11 w-11 min-h-0 md:h-8 md:w-8 text-base-content/70 hover:text-error">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-between items-start mb-4 pr-28 md:pr-16">
                  <h3 className="card-title text-lg truncate">{p.subscription_name}</h3>
                  {p.calendar_event_id && (
                     <div title="Synced to Google Calendar" className="flex items-center tooltip tooltip-left" data-tip="Synced to Google Calendar">
                       <Calendar className="w-4 h-4 text-info" />
                     </div>
                  )}
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="block text-xs opacity-70 uppercase tracking-wider mb-1">{t('recurring.amount')}</span>
                      <span className="font-bold text-2xl text-success">{formatAmount(p.amount)}</span>
                    </div>
                    <span className={`badge badge-sm font-medium ${getFrequencyColor(p.frequency).bgClass} ${getFrequencyColor(p.frequency).textClass}`}>
                      {p.frequency === 'Weekly' ? t('recurring.weekly') : p.frequency === 'Monthly' ? t('recurring.monthly') : t('recurring.yearly')}
                    </span>
                  </div>
                  
                  <div className="pt-4 border-t border-base-200">
                    <div className="flex justify-between items-center text-sm mb-2">
                       <span className="opacity-70">{t('ledger.category')}</span>
                       <span className={`badge badge-sm font-medium ${getCategoryColor(p.category).bgClass} ${getCategoryColor(p.category).textClass}`}>{p.category}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                       <span className="opacity-70">{t('recurring.next_billing')}</span>
                       <span className="font-medium">{p.next_billing_date}</span>
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
