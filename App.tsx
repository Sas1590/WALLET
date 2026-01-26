import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  Trash2, 
  Database, 
  Download, 
  Upload, 
  Home, 
  PlusCircle, 
  CreditCard, 
  Wallet,
  TrendingUp,
  TrendingDown, 
  Briefcase,
  Edit3,
  CheckCircle2,
  X
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, TooltipProps } from 'recharts';

// --- Types ---

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  description: string;
}

interface Debt {
  id: number;
  name: string;
  amount: number;
  creditor: string;
  date: string;
}

interface PaidDebt extends Debt {
  paidDate: string;
}

interface FormData {
  type: 'income' | 'expense';
  amount: string;
  category: string;
  description: string;
}

interface DebtForm {
  name: string;
  amount: string;
  creditor: string;
}

interface PayDebtForm {
  debtId: string;
  amount: string;
}

// --- Components ---

const GlassCard = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-[#13131f]/80 border border-white/5 shadow-xl rounded-3xl ${className}`}>
    {children}
  </div>
);

const SectionTitle = ({ children }: { children?: React.ReactNode }) => (
  <h3 className="text-violet-200/80 text-xs font-bold uppercase tracking-wider mb-3 px-1">{children}</h3>
);

const ActionButton = ({ onClick, children, variant = 'primary', className = '' }: { onClick: () => void; children?: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'success'; className?: string }) => {
  const variants = {
    primary: "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40",
    secondary: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
    danger: "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30",
    success: "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/40"
  };
  
  return (
    <button onClick={onClick} className={`py-3 px-4 rounded-xl font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// --- Main App ---

export default function FinanceApp() {
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [showDatabase, setShowDatabase] = useState(false);
  
  // -- State Initialization --
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('violet_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [debts, setDebts] = useState<Debt[]>(() => {
    const saved = localStorage.getItem('violet_debts');
    return saved ? JSON.parse(saved) : [];
  });

  const [paidDebts, setPaidDebts] = useState<PaidDebt[]>(() => {
    const saved = localStorage.getItem('violet_paidDebts');
    return saved ? JSON.parse(saved) : [];
  });

  const [incomeBag, setIncomeBag] = useState<number>(() => {
    const saved = localStorage.getItem('violet_incomeBag');
    return saved ? parseFloat(saved) : 0;
  });

  // -- Persistence --
  useEffect(() => { localStorage.setItem('violet_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('violet_debts', JSON.stringify(debts)); }, [debts]);
  useEffect(() => { localStorage.setItem('violet_paidDebts', JSON.stringify(paidDebts)); }, [paidDebts]);
  useEffect(() => { localStorage.setItem('violet_incomeBag', incomeBag.toString()); }, [incomeBag]);

  // -- Forms --
  const [formData, setFormData] = useState<FormData>({ type: 'expense', amount: '', category: 'Comida', description: '' });
  const [debtForm, setDebtForm] = useState<DebtForm>({ name: '', amount: '', creditor: '' });
  const [payDebtForm, setPayDebtForm] = useState<PayDebtForm>({ debtId: '', amount: '' });
  
  const [editingDebtId, setEditingDebtId] = useState<number | null>(null);
  const [editDebtForm, setEditDebtForm] = useState<DebtForm>({ name: '', amount: '', creditor: '' });

  // -- Calculations --
  const totalDebts = debts.reduce((acc, d) => acc + d.amount, 0);
  const balance = transactions.reduce((acc, t) => {
    if (t.type === 'income') return acc + t.amount;
    if (t.type === 'expense') return acc - t.amount;
    return acc;
  }, 0);

  const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const netWorth = balance - totalDebts;

  const chartData = transactions.filter(t => t.type === 'expense').reduce((acc: any[], t) => {
    const existing = acc.find(item => item.name === t.category);
    if (existing) {
      existing.value += t.amount;
    } else {
      acc.push({ name: t.category, value: t.amount });
    }
    return acc;
  }, []);

  // Violet Theme Colors
  const COLORS = ['#8b5cf6', '#d946ef', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b'];

  // -- Handlers --

  const handleAddTransaction = () => {
    if (!formData.amount) return;
    const newTx: Transaction = {
      id: Date.now(),
      type: formData.type,
      amount: parseFloat(formData.amount),
      category: formData.category,
      date: new Date().toISOString().split('T')[0],
      description: formData.description || 'Sin descripción',
    };
    setTransactions([newTx, ...transactions]);
    if (formData.type === 'income') {
      setIncomeBag(incomeBag + parseFloat(formData.amount));
    }
    setFormData({ type: 'expense', amount: '', category: 'Comida', description: '' });
    setActiveTab('home');
  };

  const handlePayDebt = () => {
    if (!payDebtForm.debtId || !payDebtForm.amount) return;
    const paymentAmount = parseFloat(payDebtForm.amount);
    
    if (paymentAmount > incomeBag) {
      alert('⚠️ Fondos insuficientes en la bolsa.');
      return;
    }

    const debtIdx = debts.findIndex(d => d.id === parseInt(payDebtForm.debtId));
    if (debtIdx === -1) return;

    setIncomeBag(incomeBag - paymentAmount);
    const debt = debts[debtIdx];
    const newAmount = Math.max(0, debt.amount - paymentAmount);

    if (newAmount === 0) {
      const paidDebt: PaidDebt = { ...debt, amount: paymentAmount, paidDate: new Date().toISOString().split('T')[0] };
      setPaidDebts([paidDebt, ...paidDebts]);
      setDebts(debts.filter(d => d.id !== debt.id));
    } else {
      const updatedDebts = [...debts];
      updatedDebts[debtIdx].amount = newAmount;
      setDebts(updatedDebts);
    }

    const newTx: Transaction = {
      id: Date.now(),
      type: 'expense',
      amount: paymentAmount,
      category: 'Pago de Deuda',
      date: new Date().toISOString().split('T')[0],
      description: `Pago a ${debt.name}`,
    };
    setTransactions([newTx, ...transactions]);
    setPayDebtForm({ debtId: '', amount: '' });
    setActiveTab('home');
  };

  const handleAddDebt = () => {
    if (!debtForm.name || !debtForm.amount) return;
    const newDebt: Debt = {
      id: Date.now(),
      name: debtForm.name,
      amount: parseFloat(debtForm.amount),
      creditor: debtForm.creditor || 'Desconocido',
      date: new Date().toISOString().split('T')[0]
    };
    setDebts([...debts, newDebt]);
    setDebtForm({ name: '', amount: '', creditor: '' });
  };

  const startEditDebt = (debt: Debt) => {
    setEditingDebtId(debt.id);
    setEditDebtForm({ name: debt.name, amount: debt.amount.toString(), creditor: debt.creditor });
  };

  const saveEditDebt = () => {
    if (!editDebtForm.name || !editDebtForm.amount) return;
    const updatedDebts = debts.map(d => 
      d.id === editingDebtId 
        ? { ...d, name: editDebtForm.name, amount: parseFloat(editDebtForm.amount), creditor: editDebtForm.creditor }
        : d
    );
    setDebts(updatedDebts);
    setEditingDebtId(null);
  };

  const exportDatabase = () => {
    const data = { transactions, debts, incomeBag, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `violet_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const importDatabase = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if(imported.transactions) setTransactions(imported.transactions);
        if(imported.debts) setDebts(imported.debts);
        if(imported.incomeBag !== undefined) setIncomeBag(imported.incomeBag);
        alert('✅ Base de datos restaurada');
        setShowDatabase(false);
      } catch (error) {
        alert('❌ Error al importar archivo');
      }
    };
    reader.readAsText(file);
  };

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-violet-500/30 p-2 rounded-lg shadow-xl">
          <p className="text-violet-200 text-sm font-bold">{`${payload[0].name} : €${payload[0].value?.toFixed(2)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-900/30 via-[#050508] to-[#050508] pb-24 relative overflow-hidden font-sans">
      
      {/* Background Ambience */}
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 px-6 py-4 bg-[#050508]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-2 rounded-xl shadow-lg shadow-violet-500/20">
              <Wallet className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-violet-200">
              VioletWallet
            </h1>
          </div>
          <button 
            onClick={() => setShowDatabase(!showDatabase)} 
            className={`p-2 rounded-xl transition-all ${showDatabase ? 'bg-violet-500/20 text-violet-300' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Database size={20} />
          </button>
        </div>
      </header>

      {/* Database Panel */}
      {showDatabase && (
        <div className="max-w-2xl mx-auto px-6 py-4 animate-in slide-in-from-top-4 fade-in duration-300">
          <GlassCard className="p-4 border-violet-500/20">
            <div className="bg-black/40 rounded-xl p-3 mb-4 font-mono text-xs text-violet-300/80 border border-white/5">
              <div className="flex justify-between mb-1"><span>TRANSACCIONES:</span> <span className="text-white">{transactions.length}</span></div>
              <div className="flex justify-between mb-1"><span>DEUDAS:</span> <span className="text-white">{debts.length}</span></div>
              <div className="flex justify-between"><span>BOLSA:</span> <span className="text-white">€{incomeBag.toFixed(2)}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={exportDatabase} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-colors">
                <Download size={16} /> Backup
              </button>
              <label className="flex-1 bg-violet-600 hover:bg-violet-500 text-white p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer transition-colors shadow-lg shadow-violet-900/20">
                <Upload size={16} /> Restore
                <input type="file" accept=".json" onChange={importDatabase} className="hidden" />
              </label>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Main Content Area */}
      <main className="px-6 pt-6 max-w-2xl mx-auto space-y-6">
        
        {/* --- HOME TAB --- */}
        {activeTab === 'home' && (
          <>
            {/* Total Balance Card */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-[26px] opacity-75 blur group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-[#0a0a10] rounded-3xl p-6 border border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-gray-400 text-sm font-medium tracking-wide uppercase">Balance Total</p>
                  <button onClick={() => setShowBalance(!showBalance)} className="text-gray-500 hover:text-white transition-colors">
                    {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                <div className="flex items-baseline gap-1">
                  <h2 className={`text-4xl font-bold text-white tracking-tight ${!showBalance && 'blur-md select-none'}`}>
                     €{balance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                </div>
                
                <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                  <div>
                     <p className="text-xs text-emerald-400 mb-1 flex items-center gap-1"><TrendingUp size={12}/> Ingresos</p>
                     <p className="text-lg font-semibold text-white">€{income.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-xs text-rose-400 mb-1 flex items-center justify-end gap-1"><TrendingDown size={12}/> Gastos</p>
                     <p className="text-lg font-semibold text-white">€{expenses.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Income Bag & Net Worth */}
            <div className="grid grid-cols-2 gap-4">
              <GlassCard className="p-4 bg-gradient-to-br from-[#13131f] to-violet-900/10">
                <div className="flex items-center gap-2 mb-2">
                   <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400"><Briefcase size={16}/></div>
                   <span className="text-xs font-bold text-gray-300">BOLSA</span>
                </div>
                <p className="text-xl font-bold text-emerald-300">€{incomeBag.toFixed(2)}</p>
              </GlassCard>
              
              <GlassCard className="p-4 bg-gradient-to-br from-[#13131f] to-rose-900/10">
                <div className="flex items-center gap-2 mb-2">
                   <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400"><CreditCard size={16}/></div>
                   <span className="text-xs font-bold text-gray-300">DEUDAS</span>
                </div>
                <p className="text-xl font-bold text-rose-300">€{totalDebts.toFixed(2)}</p>
              </GlassCard>
            </div>

            {/* Net Worth Strip */}
            <div className={`rounded-xl p-4 flex justify-between items-center border ${netWorth >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
              <span className="text-sm text-gray-400 font-medium">Patrimonio Neto</span>
              <span className={`text-xl font-bold ${netWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netWorth >= 0 ? '+' : ''}€{netWorth.toFixed(2)}
              </span>
            </div>

            {/* Recent Transactions */}
            <div>
              <SectionTitle>Últimas Transacciones</SectionTitle>
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="text-center py-10 text-gray-600 text-sm">No hay movimientos recientes</div>
                ) : (
                  transactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="group relative overflow-hidden bg-[#13131f] hover:bg-[#1a1a2a] border border-white/5 rounded-2xl p-4 transition-all duration-300">
                      <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-full ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{tx.description}</p>
                            <p className="text-gray-500 text-xs">{tx.category} • {tx.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                            {tx.type === 'income' ? '+' : '-'}€{tx.amount.toFixed(2)}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setTransactions(transactions.filter(t => t.id !== tx.id)); }} 
                            className="text-gray-600 hover:text-rose-500 transition-colors p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="pb-4">
                <SectionTitle>Distribución de Gastos</SectionTitle>
                <GlassCard className="p-6 flex flex-col items-center">
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={chartData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={60} 
                          outerRadius={80} 
                          paddingAngle={5} 
                          dataKey="value"
                          stroke="none"
                        >
                          {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    {chartData.map((entry: any, index: number) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-xs text-gray-400">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            )}
          </>
        )}

        {/* --- ADD TAB --- */}
        {activeTab === 'add' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Transaction Form */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Nueva Transacción</h2>
              
              <div className="grid grid-cols-2 gap-1 p-1 bg-black/40 rounded-xl mb-6">
                <button 
                  onClick={() => setFormData({ ...formData, type: 'expense' })} 
                  className={`py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'expense' ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/20' : 'text-gray-400 hover:text-white'}`}
                >
                  Gasto
                </button>
                <button 
                  onClick={() => setFormData({ ...formData, type: 'income' })} 
                  className={`py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'income' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/20' : 'text-gray-400 hover:text-white'}`}
                >
                  Ingreso
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 ml-1">Monto (€)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={formData.amount} 
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
                    className="w-full bg-[#0a0a10] border border-white/10 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder-gray-700" 
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1 ml-1">Categoría</label>
                  <div className="relative">
                    <select 
                      value={formData.category} 
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                      className="w-full bg-[#0a0a10] border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-violet-500 transition-all"
                    >
                      {formData.type === 'income' ? (
                        <>
                          <option value="Salario">Salario</option>
                          <option value="B365">B365</option>
                          <option value="Freelance">Freelance</option>
                          <option value="Regalo">Regalo</option>
                          <option value="Otros">Otros Ingresos</option>
                        </>
                      ) : (
                        <>
                          <option value="Comida">Comida</option>
                          <option value="Transporte">Transporte</option>
                          <option value="Casa">Casa</option>
                          <option value="Entretenimiento">Entretenimiento</option>
                          <option value="Servicios">Servicios</option>
                          <option value="Ropa">Ropa</option>
                          <option value="Salud">Salud</option>
                          <option value="B365">B365</option>
                        </>
                      )}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
                  </div>
                </div>

                <div>
                   <label className="block text-xs text-gray-500 mb-1 ml-1">Descripción</label>
                   <input 
                    type="text" 
                    placeholder="Ej. Cena con amigos" 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    className="w-full bg-[#0a0a10] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder-gray-700" 
                  />
                </div>

                <ActionButton onClick={handleAddTransaction} variant={formData.type === 'income' ? 'success' : 'primary'} className="w-full mt-2">
                  {formData.type === 'income' ? 'Agregar Ingreso' : 'Registrar Gasto'}
                </ActionButton>
              </div>
            </GlassCard>

            {/* Pay Debt Section */}
            {debts.length > 0 && (
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-rose-600 rounded-[26px] opacity-50 blur group-hover:opacity-75 transition duration-500"></div>
                <div className="relative bg-[#0a0a10] rounded-3xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-white font-bold text-lg">Pagar Deuda</h3>
                     <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                       Bolsa: €{incomeBag.toFixed(2)}
                     </span>
                  </div>
                  
                  <div className="space-y-4">
                    <select 
                      value={payDebtForm.debtId} 
                      onChange={(e) => setPayDebtForm({ ...payDebtForm, debtId: e.target.value })} 
                      className="w-full bg-[#151520] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-all"
                    >
                      <option value="">Selecciona una deuda...</option>
                      {debts.map(d => <option key={d.id} value={d.id}>{d.name} (Restante: €{d.amount.toFixed(2)})</option>)}
                    </select>
                    
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="Cantidad a pagar" 
                      value={payDebtForm.amount} 
                      onChange={(e) => setPayDebtForm({ ...payDebtForm, amount: e.target.value })} 
                      className="w-full bg-[#151520] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-all" 
                    />
                    
                    <button 
                      onClick={handlePayDebt} 
                      className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white shadow-lg shadow-orange-900/20 transition-all"
                    >
                      Realizar Pago
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- DEBTS TAB --- */}
        {activeTab === 'debts' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            
            {/* Add New Debt */}
            <GlassCard className="p-5 border-violet-500/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-violet-600/20 p-2 rounded-lg text-violet-400"><PlusCircle size={20}/></div>
                <h3 className="font-bold text-white">Nueva Deuda</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <input type="text" placeholder="Concepto (ej. Préstamo Juan)" value={debtForm.name} onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })} className="bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-violet-500 outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Monto" value={debtForm.amount} onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })} className="bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-violet-500 outline-none" />
                  <input type="text" placeholder="Acreedor" value={debtForm.creditor} onChange={(e) => setDebtForm({ ...debtForm, creditor: e.target.value })} className="bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-violet-500 outline-none" />
                </div>
                <button onClick={handleAddDebt} className="bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg text-sm font-bold mt-1">Registrar Deuda</button>
              </div>
            </GlassCard>

            {/* Active Debts List */}
            <div>
              <SectionTitle>Pendientes ({debts.length})</SectionTitle>
              <div className="space-y-3">
                {debts.length === 0 ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 text-center">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                    <p className="text-emerald-300 font-medium">¡Estás libre de deudas!</p>
                  </div>
                ) : (
                  debts.map(debt => (
                    <div key={debt.id} className="relative group">
                      {editingDebtId === debt.id ? (
                        <div className="bg-[#1a1a2e] border border-blue-500/50 rounded-2xl p-4 shadow-xl">
                          <div className="space-y-2 mb-3">
                            <input className="w-full bg-black/40 border border-white/10 p-2 rounded text-white" value={editDebtForm.name} onChange={(e) => setEditDebtForm({ ...editDebtForm, name: e.target.value })} />
                            <div className="flex gap-2">
                              <input className="w-1/2 bg-black/40 border border-white/10 p-2 rounded text-white" type="number" value={editDebtForm.amount} onChange={(e) => setEditDebtForm({ ...editDebtForm, amount: e.target.value })} />
                              <input className="w-1/2 bg-black/40 border border-white/10 p-2 rounded text-white" value={editDebtForm.creditor} onChange={(e) => setEditDebtForm({ ...editDebtForm, creditor: e.target.value })} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={saveEditDebt} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-lg text-sm font-bold">Guardar</button>
                            <button onClick={() => setEditingDebtId(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1.5 rounded-lg text-sm">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#13131f] hover:bg-[#1a1a29] border border-white/5 border-l-4 border-l-rose-500 rounded-r-2xl rounded-l-md p-4 flex justify-between items-center transition-all">
                          <div>
                            <h4 className="font-bold text-gray-200">{debt.name}</h4>
                            <p className="text-xs text-rose-400/80 uppercase tracking-wide font-semibold mt-0.5">{debt.creditor}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xl font-bold text-white">€{debt.amount.toFixed(2)}</span>
                            <div className="flex gap-1">
                              <button onClick={() => startEditDebt(debt)} className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Edit3 size={16}/></button>
                              <button onClick={() => setDebts(debts.filter(d => d.id !== debt.id))} className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 size={16}/></button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Paid Debts History */}
            {paidDebts.length > 0 && (
              <div className="opacity-75">
                <SectionTitle>Historial de Pagos</SectionTitle>
                <div className="space-y-2">
                  {paidDebts.map(debt => (
                    <div key={debt.id} className="bg-[#13131f]/50 border border-emerald-500/10 rounded-xl p-3 flex justify-between items-center grayscale hover:grayscale-0 transition-all">
                      <div>
                        <p className="text-gray-400 text-sm line-through decoration-emerald-500/50">{debt.name}</p>
                        <p className="text-xs text-gray-600">Pagado: {debt.paidDate}</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-emerald-500/80 font-bold">€{debt.amount.toFixed(2)}</span>
                         <button onClick={() => setPaidDebts(paidDebts.filter(d => d.id !== debt.id))} className="text-gray-700 hover:text-rose-500 p-1"><X size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 px-6 pb-6 pt-2 bg-gradient-to-t from-[#050508] via-[#050508] to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-[#13131f]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black flex justify-around items-center">
            
            <button 
              onClick={() => setActiveTab('home')} 
              className={`relative p-3 rounded-xl transition-all duration-300 flex flex-col items-center gap-1 w-20 ${activeTab === 'home' ? 'text-violet-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <div className={`absolute inset-0 bg-violet-500/10 rounded-xl transition-all duration-300 ${activeTab === 'home' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}></div>
              <Home size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
              {activeTab === 'home' && <span className="text-[10px] font-bold">Inicio</span>}
            </button>

            <button 
              onClick={() => setActiveTab('add')} 
              className="relative -top-6 bg-violet-600 hover:bg-violet-500 text-white p-4 rounded-full shadow-lg shadow-violet-600/40 transition-transform active:scale-95 border-4 border-[#050508]"
            >
              <PlusCircle size={32} />
            </button>

            <button 
              onClick={() => setActiveTab('debts')} 
              className={`relative p-3 rounded-xl transition-all duration-300 flex flex-col items-center gap-1 w-20 ${activeTab === 'debts' ? 'text-violet-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <div className={`absolute inset-0 bg-violet-500/10 rounded-xl transition-all duration-300 ${activeTab === 'debts' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}></div>
              <CreditCard size={24} strokeWidth={activeTab === 'debts' ? 2.5 : 2} />
              {activeTab === 'debts' && <span className="text-[10px] font-bold">Deudas</span>}
            </button>

          </div>
        </div>
      </nav>

    </div>
  );
}