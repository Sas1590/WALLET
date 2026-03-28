import React, { useState } from 'react';
import { GlassCard, SectionTitle, ActionButton, ConfirmModal } from '../components/UI';
import { Plus, X, Tag, Settings, Check } from 'lucide-react';
import { Category } from '../types';

interface SettingsTabProps {
  incomeCategories: Category[];
  expenseCategories: Category[];
  onAddCategory: (type: 'income' | 'expense', name: string, color: string) => void;
  onRemoveCategory: (type: 'income' | 'expense', name: string) => void;
}

const NEON_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#f43f5e', // Rose
  '#64748b'  // Slate
];

interface CategoryChipProps {
  category: Category;
  type: 'income' | 'expense';
  onDeleteRequest: (category: Category, type: 'income' | 'expense') => void;
}

const CategoryChip: React.FC<CategoryChipProps> = ({ category, type, onDeleteRequest }) => (
  <div 
    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all"
    style={{ 
        backgroundColor: `${category.color}15`, 
        color: category.color, 
        borderColor: `${category.color}30` 
    }}
  >
    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
    <span>{category.name}</span>
    <button 
      onClick={() => onDeleteRequest(category, type)}
      className="hover:bg-white/10 rounded-full p-0.5 transition-colors ml-1"
      style={{ color: category.color }}
    >
      <X size={12} />
    </button>
  </div>
);

export const SettingsTab: React.FC<SettingsTabProps> = ({
  incomeCategories,
  expenseCategories,
  onAddCategory,
  onRemoveCategory
}) => {
  const [newIncomeCat, setNewIncomeCat] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState('');
  const [selectedColor, setSelectedColor] = useState(NEON_COLORS[5]);
  
  // Modal State
  const [categoryToDelete, setCategoryToDelete] = useState<{ cat: Category, type: 'income' | 'expense' } | null>(null);

  const handleAddIncome = () => {
    if (newIncomeCat.trim()) {
      onAddCategory('income', newIncomeCat.trim(), selectedColor);
      setNewIncomeCat('');
    }
  };

  const handleAddExpense = () => {
    if (newExpenseCat.trim()) {
      onAddCategory('expense', newExpenseCat.trim(), selectedColor);
      setNewExpenseCat('');
    }
  };

  const ColorPicker = () => (
      <div className="flex flex-wrap gap-2 mb-3 bg-[#0a0a10] p-2 rounded-xl border border-white/5">
          {NEON_COLORS.map(color => (
              <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${selectedColor === color ? 'scale-110 ring-2 ring-white ring-offset-1 ring-offset-black' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: color }}
              >
                  {selectedColor === color && <Check size={12} className="text-white drop-shadow-md" strokeWidth={3} />}
              </button>
          ))}
      </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      
      <GlassCard className="p-5 border-violet-500/20">
        <div className="flex items-center gap-2 mb-6">
            <div className="bg-gray-700/30 p-2 rounded-lg text-gray-200">
                <Settings size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">Configuración de Categorías</h3>
        </div>

        {/* Expense Categories Section */}
        <div className="mb-8">
            <SectionTitle>Categorías de Gastos</SectionTitle>
            
            {/* Color Picker */}
            <ColorPicker />

            <div className="flex gap-2 mb-3">
                <input 
                    type="text" 
                    placeholder="Nueva categoría de gasto..." 
                    value={newExpenseCat}
                    onChange={(e) => setNewExpenseCat(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddExpense()}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-rose-500 outline-none placeholder-gray-600"
                />
                <button 
                    onClick={handleAddExpense}
                    disabled={!newExpenseCat.trim()}
                    className="hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: selectedColor }}
                >
                    <Plus size={20} />
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {expenseCategories.map(cat => (
                    <CategoryChip 
                        key={cat.name} 
                        category={cat} 
                        type="expense" 
                        onDeleteRequest={(c, t) => setCategoryToDelete({ cat: c, type: t })} 
                    />
                ))}
            </div>
        </div>

        {/* Income Categories Section */}
        <div>
            <SectionTitle>Categorías de Ingresos</SectionTitle>
            
            {/* Reusing Color Picker or could have separate state if needed, but shared is fine for simplicity */}
            <div className="flex gap-2 mb-3">
                <input 
                    type="text" 
                    placeholder="Nueva categoría de ingreso..." 
                    value={newIncomeCat}
                    onChange={(e) => setNewIncomeCat(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddIncome()}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none placeholder-gray-600"
                />
                <button 
                    onClick={handleAddIncome}
                    disabled={!newIncomeCat.trim()}
                    className="hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: selectedColor }}
                >
                    <Plus size={20} />
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {incomeCategories.map(cat => (
                    <CategoryChip 
                        key={cat.name} 
                        category={cat} 
                        type="income" 
                        onDeleteRequest={(c, t) => setCategoryToDelete({ cat: c, type: t })} 
                    />
                ))}
            </div>
        </div>
      </GlassCard>

      <div className="text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">VioletWallet v1.3</p>
      </div>

      <ConfirmModal 
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => {
            if (categoryToDelete) {
                onRemoveCategory(categoryToDelete.type, categoryToDelete.cat.name);
            }
        }}
        title="Eliminar Categoría"
        message={`¿Estás seguro de que deseas eliminar la categoría "${categoryToDelete?.cat.name}"?`}
        isDanger={true}
      />

    </div>
  );
};