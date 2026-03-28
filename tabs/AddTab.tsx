import React from 'react';
import { GlassCard, ActionButton } from '../components/UI';
import { FormData, Category } from '../types';

interface AddTabProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleAddTransaction: () => void;
  isSubmitting: boolean;
  incomeCategories: Category[];
  expenseCategories: Category[];
}

export const AddTab: React.FC<AddTabProps> = ({
  formData,
  setFormData,
  handleAddTransaction,
  isSubmitting,
  incomeCategories,
  expenseCategories
}) => {
  const inputClass = "w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white text-base focus:border-violet-500 focus:bg-white/[0.06] outline-none transition-all placeholder:text-gray-600 shadow-inner";
  const labelClass = "block text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-2 ml-1";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
      
      <div className="relative group">
         <div className={`absolute -inset-0.5 bg-gradient-to-r ${formData.type === 'expense' ? 'from-rose-600 to-purple-600' : 'from-emerald-600 to-teal-600'} rounded-[34px] opacity-20 blur group-hover:opacity-40 transition duration-1000`}></div>
         <GlassCard className="p-8 relative bg-[#0d1017]">
            <h2 className="text-2xl font-black text-white mb-8 tracking-tight">Nueva Transacción</h2>
            
            {/* Toggle Switch */}
            <div className="bg-[#000000]/40 p-1.5 rounded-[20px] mb-8 grid grid-cols-2 relative border border-white/5">
              <div 
                 className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-gradient-to-br rounded-[16px] shadow-lg transition-all duration-300 ease-spring ${formData.type === 'expense' ? 'left-1.5 from-rose-600 to-rose-500' : 'left-[calc(50%+3px)] from-emerald-500 to-teal-500'}`}
              />
              <button 
                onClick={() => setFormData({ ...formData, type: 'expense' })} 
                className={`relative z-10 py-3 rounded-[16px] text-sm font-bold transition-colors ${formData.type === 'expense' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
              >
                Gasto
              </button>
              <button 
                onClick={() => setFormData({ ...formData, type: 'income' })} 
                className={`relative z-10 py-3 rounded-[16px] text-sm font-bold transition-colors ${formData.type === 'income' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
              >
                Ingreso
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className={labelClass}>Monto (€)</label>
                <div className="relative">
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      autoFocus
                      value={formData.amount} 
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
                      className={`${inputClass} text-2xl font-bold pl-8`} 
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xl">€</span>
                </div>
              </div>

              <div>
                <label className={labelClass}>Categoría</label>
                <div className="relative group">
                  <select 
                    value={formData.category} 
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                    className={`${inputClass} appearance-none cursor-pointer`}
                  >
                    {formData.type === 'income' ? (
                      incomeCategories.map(cat => (
                        <option key={cat.name} value={cat.name} className="bg-gray-900">{cat.name}</option>
                      ))
                    ) : (
                      expenseCategories.map(cat => (
                        <option key={cat.name} value={cat.name} className="bg-gray-900">{cat.name}</option>
                      ))
                    )}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-hover:text-white transition-colors">▼</div>
                </div>
              </div>

              <div>
                 <label className={labelClass}>Descripción</label>
                 <input 
                  type="text" 
                  placeholder="Ej. Cena con amigos" 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  className={inputClass} 
                />
              </div>

              <ActionButton 
                onClick={handleAddTransaction} 
                variant={formData.type === 'income' ? 'success' : 'primary'} 
                className="w-full mt-4 !py-4 text-base shadow-xl"
                disabled={isSubmitting}
              >
                {formData.type === 'income' ? 'Agregar Ingreso' : 'Registrar Gasto'}
              </ActionButton>
            </div>
         </GlassCard>
      </div>
    </div>
  );
};