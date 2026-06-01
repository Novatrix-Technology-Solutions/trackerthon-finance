"use client";

import React, { useState } from 'react';
import { CreditCard, AlertCircle, CheckCircle2, Plus, Trash2, Pencil, Calendar } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useCurrency } from '@/components/CurrencyProvider';
import Drawer from '@/components/ui/Drawer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from '@/providers/LanguageProvider';

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
  const { currencyStr, formatAmount } = useCurrency();
  const { t } = useTranslation();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDebt, setNewDebt] = useState<Partial<Debt>>({});

  const { data: debts = [], isLoading: loading } = useQuery({
    queryKey: ['debts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('debts').select('*').order('due_date', { ascending: true });
      if (error) throw error;
      return data as Debt[];
    }
  });

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
      if (!res.ok) throw new Error(result.error || 'Calendar sync failed');
      return result.calendar_event_id;
    } catch (e: any) {
      console.warn('Backend sync disabled in UI-vacuum mode:', e);
      toast.error(`Calendar sync failed: ${e.message}`);
      return null;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (debt: Partial<Debt>) => {
      if (editingId) {
        const { data, error } = await supabase
          .from('debts')
          .update({
            creditor: debt.creditor,
            principal: Number(debt.principal),
            remaining: Number(debt.remaining || 0),
            interest_rate: Number(debt.interest_rate || 0),
            due_date: debt.due_date
          })
          .eq('id', editingId)
          .select();
        
        if (error) throw error;
        
        let updatedEntity = data[0];
        const generatedEventId = await syncToCalendar(updatedEntity, 'update');
        
        if (generatedEventId && !updatedEntity.calendar_event_id) {
           const { data: patchedRecord } = await supabase.from('debts').update({ calendar_event_id: generatedEventId }).eq('id', editingId).select();
           if (patchedRecord) updatedEntity = patchedRecord[0];
        }
        return updatedEntity;
      } else {
        const { data, error } = await supabase
          .from('debts')
          .insert([{
            creditor: debt.creditor,
            principal: Number(debt.principal),
            remaining: Number(debt.remaining ?? debt.principal),
            interest_rate: Number(debt.interest_rate || 0),
            due_date: debt.due_date
          }])
          .select();

        if (error) throw error;
        let insertedDebt = data[0];
        const eventId = await syncToCalendar(insertedDebt, 'create');
        if (eventId) {
          const { data: updatedData } = await supabase.from('debts').update({ calendar_event_id: eventId }).eq('id', insertedDebt.id).select();
          if (updatedData) insertedDebt = updatedData[0];
        }
        return insertedDebt;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast.success(editingId ? t('debts.toast_updated') : t('debts.toast_created'));
      setIsFormOpen(false);
      setEditingId(null);
      setNewDebt({});
    },
    onError: (err: any) => {
      toast.error(`Failed to save: ${err.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (debt: Debt) => {
      await syncToCalendar(debt, 'delete');
      const { error } = await supabase.from('debts').delete().eq('id', debt.id);
      if (error) throw error;
      return debt.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast.success(t('debts.toast_deleted'));
    },
    onError: (err: any) => {
      toast.error(`Failed to delete: ${err.message}`);
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebt.creditor || !newDebt.principal || !newDebt.due_date) return;
    saveMutation.mutate(newDebt);
  };

  const deleteDebt = (debt: Debt) => {
    if (window.confirm(t('debts.confirm_delete'))) {
      deleteMutation.mutate(debt);
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
    setIsFormOpen(true);
  };

  const totalDebt = debts.reduce((acc, curr) => acc + curr.remaining, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-base-200">
        <h2 className="text-3xl font-bold tracking-tight text-base-content">{t('debts.title')}</h2>
        <button 
          onClick={openAdd}
          className="btn btn-primary w-full md:w-auto"
        >
          <Plus className="w-4 h-4" /> {t('debts.add_liability')}
        </button>
      </div>

      <Drawer isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingId ? t('debts.edit_liability') : t('debts.log_liability')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">{t('debts.creditor')}</span></label>
            <input type="text" className="input input-bordered w-full" value={newDebt.creditor || ''} onChange={e => setNewDebt({...newDebt, creditor: e.target.value})} required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('debts.principal')}</span></label>
            <input type="number" step="0.01" className="input input-bordered w-full" value={newDebt.principal || ''} onChange={e => setNewDebt({...newDebt, principal: Number(e.target.value)})} required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('debts.remaining')}</span></label>
            <input type="number" step="0.01" className="input input-bordered w-full" value={newDebt.remaining !== undefined ? newDebt.remaining : ''} onChange={e => setNewDebt({...newDebt, remaining: Number(e.target.value)})} />
            <label className="label"><span className="label-text-alt opacity-70">{t('debts.leave_empty')}</span></label>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('debts.interest_rate')}</span></label>
            <input type="number" step="0.1" className="input input-bordered w-full" value={newDebt.interest_rate !== undefined ? newDebt.interest_rate : ''} onChange={e => setNewDebt({...newDebt, interest_rate: Number(e.target.value)})} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">{t('debts.due_date')}</span></label>
            <input type="date" className="input input-bordered w-full" value={newDebt.due_date || ''} onChange={e => setNewDebt({...newDebt, due_date: e.target.value})} required />
          </div>
          <div className="pt-4 flex justify-end mt-2">
            <button type="submit" disabled={saveMutation.isPending} className="btn btn-primary">
              {saveMutation.isPending ? <span className="loading loading-spinner"></span> : null}
              {saveMutation.isPending ? t('ledger.saving') : (editingId ? t('ledger.update_sync') : t('ledger.save_sync'))}
            </button>
          </div>
        </form>
      </Drawer>

      <div className="card bg-primary text-primary-content shadow-md">
        <div className="card-body flex-row items-center justify-between">
          <div>
            <h2 className="card-title text-primary-content/80 text-sm font-medium mb-1">{t('debts.total_outstanding')}</h2>
            <p className="text-4xl font-bold">
               {loading ? <span className="loading loading-dots loading-lg"></span> : formatAmount(totalDebt)}
            </p>
          </div>
          <CreditCard className="w-12 h-12 opacity-80" />
        </div>
      </div>

      {!loading && debts.length === 0 && (
        <div className="card bg-base-100 p-8 shadow-sm border border-base-200 text-center opacity-70">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('debts.no_liabilities')}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {debts.map(debt => {
          const progress = debt.principal > 0 ? ((debt.principal - debt.remaining) / debt.principal) * 100 : 0;
          return (
            <div key={debt.id} className="card bg-base-100 shadow-sm border border-base-200 group hover:-translate-y-1 transition-transform relative">
              <div className="card-body p-6">
                <div className="absolute top-4 right-4 flex space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(debt)} className="btn btn-ghost btn-square h-11 w-11 min-h-0 md:h-8 md:w-8 text-base-content/70 hover:text-primary">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteDebt(debt)} disabled={deleteMutation.isPending} className="btn btn-ghost btn-square h-11 w-11 min-h-0 md:h-8 md:w-8 text-base-content/70 hover:text-error">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-between items-start mb-4 pr-28 md:pr-16">
                  <h3 className="card-title text-lg truncate">{debt.creditor}</h3>
                  <div className="flex items-center space-x-2">
                    {debt.calendar_event_id && (
                       <div title="Synced to Google Calendar" className="flex items-center tooltip tooltip-left" data-tip="Synced to Google Calendar">
                         <Calendar className="w-4 h-4 text-info flex-shrink-0" />
                       </div>
                    )}
                    {debt.remaining === 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">{t('debts.remaining_lbl')}</span>
                    <span className="font-medium">{formatAmount(debt.remaining)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">{t('debts.principal_lbl')}</span>
                    <span className="font-medium">{formatAmount(debt.principal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">{t('debts.interest_rate_lbl')}</span>
                    <span className="font-medium">{debt.interest_rate}% APR</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">{t('debts.due_date_lbl')}</span>
                    <span className="font-medium">{debt.due_date}</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="flex justify-between text-xs opacity-70 mb-1">
                    <span>{t('debts.repayment_progress')}</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <progress className="progress progress-primary w-full" value={progress} max="100"></progress>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
