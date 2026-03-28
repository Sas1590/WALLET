import React from 'react';
import { 
  PlusCircle, User, Building2, Repeat, CreditCard, Landmark, 
  ArrowRight, CalendarClock, Infinity, Edit3, Trash2, X, Loader2 
} from 'lucide-react';
import { GlassCard, SectionTitle } from '../components/UI';
import { Debt, PaidDebt, DebtForm } from '../types';

interface DebtsTabProps {
  debts: Debt[];
  bankDebts: Debt[];
  personalDebts: Debt[];
  paidDebts: PaidDebt[];
  debtForm: DebtForm;
  setDebtForm: React.Dispatch<React.SetStateAction<DebtForm>>;
  isSubmitting: boolean;
  handleAddDebt: () => void;
  startEditDebt: (debt: Debt) => void;
  setDebtToDelete: React.Dispatch<React.SetStateAction<Debt | null>>;
  setActivePaymentDebt: React.Dispatch<React.SetStateAction<Debt | null>>;
  setFormError: React.Dispatch<React.SetStateAction<string | null>>;
  deletePaidDebt: (id: string) => void;
}

export const DebtsTab: React.FC<DebtsTabProps> = ({
  bankDebts,
  personalDebts,
  paidDebts,
  debtForm,
  setDebtForm,
  isSubmitting,
  handleAddDebt,
  startEditDebt,
  setDebtToDelete,
  setActivePaymentDebt,
  setFormError,
  deletePaidDebt
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            
      {/* 1. Add New Debt Form */}
      <GlassCard className="p-5 border-violet-500/20">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-violet-600/20 p-2 rounded-lg text-violet-400"><PlusCircle size={20}/></div>
          <h3 className="font-bold text-white">Nueva Deuda</h3>
        </div>
        
        <div className="space-y-3">
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-2 bg-black/30 p-1 rounded-lg">
              <button 
                  onClick={() => setDebtForm({ ...debtForm, type: 'personal' })}
                  className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${debtForm.type === 'personal' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                  <User size={14} /> Personal
              </button>
              <button 
                  onClick={() => setDebtForm({ ...debtForm, type: 'bank' })}
                  className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${debtForm.type === 'bank' ? 'bg-fuchsia-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                  <Building2 size={14} /> Bancaria
              </button>
          </div>

          <input type="text" placeholder={debtForm.type === 'bank' ? "Concepto (ej. Seguro, Fibra...)" : "Concepto (ej. Préstamo Juan)"} value={debtForm.name} onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-violet-500 outline-none" />
          
          {/* Bank Specific Toggle: Recurring */}
          {debtForm.type === 'bank' && (
              <div className="flex items-center gap-2 bg-fuchsia-500/10 p-2 rounded-lg border border-fuchsia-500/20">
                  <button 
                      onClick={() => setDebtForm({ ...debtForm, isRecurring: !debtForm.isRecurring })}
                      className={`w-10 h-5 rounded-full relative transition-colors ${debtForm.isRecurring ? 'bg-fuchsia-500' : 'bg-gray-700'}`}
                  >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${debtForm.isRecurring ? 'left-6' : 'left-1'}`} />
                  </button>
                  <span className="text-xs text-fuchsia-200 font-bold flex items-center gap-1">
                      {debtForm.isRecurring ? <Repeat size={12}/> : <CreditCard size={12}/>}
                      {debtForm.isRecurring ? 'Pago Recurrente (Sin fin / Suscripción)' : 'Préstamo Finito (Se reduce al pagar)'}
                  </span>
              </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {!debtForm.isRecurring && (
                <input type="number" placeholder="Monto Total Deuda" value={debtForm.amount} onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })} className="bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-violet-500 outline-none" />
            )}
            <input type="text" placeholder="Acreedor" value={debtForm.creditor} onChange={(e) => setDebtForm({ ...debtForm, creditor: e.target.value })} className={`bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-violet-500 outline-none ${debtForm.isRecurring ? 'col-span-2' : ''}`} />
          </div>
          
          {/* Bank Specific Fields */}
          {debtForm.type === 'bank' && (
              <div className="grid grid-cols-2 gap-3 pt-2 animate-in fade-in slide-in-from-top-2">
                  <div>
                       <label className="text-[10px] text-gray-400 ml-1 mb-0.5 block">{debtForm.isRecurring ? "Cuota Fija Mensual (€)" : "Cuota Mensual (€)"}</label>
                       <input type="number" placeholder="Ej. 62.67" value={debtForm.installmentAmount} onChange={(e) => setDebtForm({ ...debtForm, installmentAmount: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-fuchsia-500 outline-none" />
                  </div>
                  <div>
                       <label className="text-[10px] text-gray-400 ml-1 mb-0.5 block">Próxima Fecha</label>
                       <input type="date" value={debtForm.nextPaymentDate} onChange={(e) => setDebtForm({ ...debtForm, nextPaymentDate: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-fuchsia-500 outline-none" />
                  </div>
              </div>
          )}

          <button 
            onClick={handleAddDebt} 
            disabled={isSubmitting}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg text-sm font-bold mt-1 flex justify-center items-center disabled:opacity-70"
          >
             {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : "Registrar Deuda"}
          </button>
        </div>
      </GlassCard>

      {/* 2. Bank / Fixed Debts Section (Highlighted) */}
      {bankDebts.length > 0 && (
          <div>
              <SectionTitle>Deudas Bancarias / Fijas</SectionTitle>
              <div className="space-y-4">
                  {bankDebts.map(debt => (
                       <div key={debt.id} className="relative group">
                          {/* Enhanced Liquid Glass Background */}
                          <div className={`absolute -inset-0.5 bg-gradient-to-r rounded-[24px] opacity-30 blur-lg group-hover:opacity-60 transition duration-500 ${debt.isRecurring ? 'from-cyan-600 to-blue-600' : 'from-fuchsia-600 to-purple-600'}`}></div>
                          <div className="relative bg-white/[0.05] backdrop-blur-2xl border border-white/10 rounded-[22px] p-6 overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
                              <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none transform scale-150 rotate-12">
                                  <Landmark size={100} className="text-white" />
                              </div>
                              
                              <div className="flex justify-between items-start mb-4 relative z-10">
                                  <div>
                                      <h4 className="text-xl font-bold text-white tracking-tight drop-shadow-md">{debt.name}</h4>
                                      <p className={`${debt.isRecurring ? 'text-cyan-300' : 'text-fuchsia-300'} text-xs font-bold uppercase tracking-wider mt-1 flex items-center gap-1 drop-shadow-sm`}>
                                          <Building2 size={12}/> {debt.creditor}
                                      </p>
                                  </div>
                                  <div className="flex gap-2 bg-black/20 p-1 rounded-full backdrop-blur-md">
                                       <button onClick={() => startEditDebt(debt)} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"><Edit3 size={16}/></button>
                                       <button onClick={() => setDebtToDelete(debt)} className="text-gray-400 hover:text-rose-500 transition-colors p-2 hover:bg-rose-500/10 rounded-full"><Trash2 size={16}/></button>
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                                  <div>
                                      <span className="text-gray-400 text-[10px] uppercase tracking-widest block mb-1 font-semibold">
                                          {debt.isRecurring ? "Pago Recurrente" : "Capital Pendiente"}
                                      </span>
                                      <span className="text-3xl font-black text-white tracking-tighter flex items-center gap-2 drop-shadow-lg">
                                          {debt.isRecurring ? <Infinity size={24} className="text-cyan-400"/> : `€${debt.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
                                      </span>
                                  </div>
                                  {debt.nextPaymentDate && debt.installmentAmount && (
                                      <div className="bg-white/5 rounded-2xl p-3 border border-white/10 flex flex-col justify-center backdrop-blur-md shadow-inner">
                                          <div className="flex items-center gap-1.5 mb-1">
                                              <CalendarClock size={12} className={`${debt.isRecurring ? 'text-cyan-400' : 'text-fuchsia-400'}`}/>
                                              <span className={`${debt.isRecurring ? 'text-cyan-200' : 'text-fuchsia-200'} text-[9px] font-bold uppercase tracking-wider`}>Próxima Cuota</span>
                                          </div>
                                          <div className="flex items-baseline gap-2">
                                              <span className="text-xl font-bold text-white">€{debt.installmentAmount.toFixed(2)}</span>
                                              <span className="text-[10px] text-gray-400 font-medium bg-black/30 px-1.5 py-0.5 rounded-md">{new Date(debt.nextPaymentDate).toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})}</span>
                                          </div>
                                      </div>
                                  )}
                              </div>

                              <button 
                                  onClick={() => { setActivePaymentDebt(debt); setFormError(null); }}
                                  className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${debt.isRecurring ? 'from-cyan-900/50 to-blue-900/50 border-cyan-500/30' : 'from-fuchsia-900/50 to-purple-900/50 border-fuchsia-500/30'} hover:bg-white/10 border text-white font-bold flex justify-between items-center px-5 transition-all shadow-lg hover:shadow-xl group/btn relative z-10`}
                              >
                                  <span className="text-sm tracking-wide">{debt.isRecurring ? "Adelantar / Pagar Manual" : "Aportar Capital Extra"}</span>
                                  <div className={`${debt.isRecurring ? 'bg-cyan-500 text-black' : 'bg-fuchsia-500 text-white'} rounded-full p-1 shadow-md transition-transform group-hover/btn:scale-110`}>
                                      <ArrowRight size={14} strokeWidth={3} />
                                  </div>
                              </button>
                          </div>
                       </div>
                  ))}
              </div>
          </div>
      )}

      {/* 3. Personal / Regular Debts List */}
      <div>
        <SectionTitle>Pendientes Personales ({personalDebts.length})</SectionTitle>
        <div className="space-y-3">
          {personalDebts.length === 0 ? (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center">
              <p className="text-gray-400 text-sm">No hay deudas personales.</p>
            </div>
          ) : (
            personalDebts.map(debt => (
              <div key={debt.id} className="relative group">
                  <div className="bg-white/[0.04] backdrop-blur-xl hover:bg-white/[0.08] border border-white/10 border-l-4 border-l-rose-500 rounded-r-2xl rounded-l-md p-5 flex justify-between items-center transition-all shadow-lg">
                    <div>
                      <h4 className="font-bold text-white text-base tracking-wide">{debt.name}</h4>
                      <p className="text-[10px] text-rose-300 uppercase tracking-widest font-bold mt-1 bg-rose-500/10 w-fit px-2 py-0.5 rounded-full border border-rose-500/20">{debt.creditor}</p>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className="text-2xl font-black text-white tracking-tight">€{debt.amount.toFixed(2)}</span>
                      <div className="flex gap-1.5">
                          <button 
                              onClick={() => { setActivePaymentDebt(debt); setFormError(null); }} 
                              className="p-2.5 text-white bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500 hover:border-emerald-500 rounded-xl transition-all shadow-md"
                              title="Pagar"
                          >
                              <ArrowRight size={18} strokeWidth={2.5}/>
                          </button>
                        <button onClick={() => startEditDebt(debt)} className="p-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all"><Edit3 size={18}/></button>
                        <button onClick={() => setDebtToDelete(debt)} className="p-2.5 text-gray-400 hover:text-rose-200 bg-white/5 hover:bg-rose-500/20 border border-white/5 hover:border-rose-500/30 rounded-xl transition-all"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Paid Debts History */}
      {paidDebts.length > 0 && (
        <div className="opacity-60 hover:opacity-100 transition-opacity duration-500 pt-4">
          <SectionTitle>Historial de Pagos</SectionTitle>
          <div className="space-y-2">
            {paidDebts.map(debt => (
              <div key={debt.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center grayscale hover:grayscale-0 transition-all">
                <div>
                  <p className="text-gray-500 text-sm line-through decoration-emerald-500/50">{debt.name}</p>
                  <p className="text-[10px] text-gray-600 font-mono">Pagado: {debt.paidDate}</p>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-emerald-500/50 font-bold text-sm">€{debt.amount.toFixed(2)}</span>
                   <button onClick={() => deletePaidDebt(debt.id)} className="text-gray-700 hover:text-rose-500 p-1"><X size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};