import React, { useState, useMemo } from 'react';
import { 
  Eye, EyeOff, TrendingUp, TrendingDown, Briefcase, CandlestickChart, 
  CreditCard, LineChart, PieChart as PieChartIcon, BarChart3, ChevronRight, 
  Dices, Edit3, Trash2, Info, Landmark, FileSpreadsheet, ChevronDown, ChevronUp, Wallet, Download, Filter, Calendar, Check,
  ChevronLeft, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, TooltipProps,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area, ReferenceLine
} from 'recharts';
import { GlassCard, SectionTitle, ConfirmModal } from '../components/UI';
import { Transaction, Category } from '../types';

interface HomeTabProps {
  netWorth: number;
  showBalance: boolean;
  setShowBalance: React.Dispatch<React.SetStateAction<boolean>>;
  incomeBag: number;
  totalInvestmentsValue: number;
  totalInvestedCapital: number;
  totalDebts: number;
  heroChartMode: 'networth' | 'investments' | 'debt';
  setHeroChartMode: React.Dispatch<React.SetStateAction<'networth' | 'investments' | 'debt'>>;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  chartView: 'daily' | 'monthly' | 'yearly';
  setChartView: React.Dispatch<React.SetStateAction<'daily' | 'monthly' | 'yearly'>>;
  netWorthHistoryData: any[];
  investmentPieData: any[];
  debtBarData: any[];
  gradientOffset: number;
  COLORS: string[];
  transactions: Transaction[];
  openEditTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string, type: 'income' | 'expense', amount: number) => void;
  chartData: any[];
  expenseCategories: Category[];
  incomeCategories: Category[];
}

export const HomeTab: React.FC<HomeTabProps> = ({
  netWorth,
  showBalance,
  setShowBalance,
  incomeBag,
  totalInvestmentsValue,
  totalInvestedCapital,
  totalDebts,
  heroChartMode,
  setHeroChartMode,
  setActiveTab,
  chartView,
  setChartView,
  netWorthHistoryData,
  investmentPieData,
  debtBarData,
  gradientOffset,
  COLORS,
  transactions,
  openEditTransaction,
  deleteTransaction,
  chartData,
  expenseCategories,
  incomeCategories
}) => {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  // --- ANALYSIS STATE ---
  const [analysisType, setAnalysisType] = useState<'expense' | 'income'>('expense');
  // Replaced 'analysisTime' logic with a robust Date Cursor
  const [dateCursor, setDateCursor] = useState(new Date()); 
  const [analysisPeriod, setAnalysisPeriod] = useState<'monthly' | 'yearly' | 'all'>('monthly');
  
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);

  const typeOptions: { value: 'expense' | 'income'; label: string; icon: React.ElementType; colorClass: string }[] = [
    { value: 'expense', label: 'Gastos', icon: TrendingDown, colorClass: 'text-rose-400' },
    { value: 'income', label: 'Ingresos', icon: TrendingUp, colorClass: 'text-emerald-400' },
  ];

  // --- DATE NAVIGATION LOGIC ---
  const handlePrevPeriod = () => {
      const newDate = new Date(dateCursor);
      if (analysisPeriod === 'monthly') {
          newDate.setMonth(newDate.getMonth() - 1);
      } else if (analysisPeriod === 'yearly') {
          newDate.setFullYear(newDate.getFullYear() - 1);
      }
      setDateCursor(newDate);
  };

  const handleNextPeriod = () => {
      const newDate = new Date(dateCursor);
      if (analysisPeriod === 'monthly') {
          newDate.setMonth(newDate.getMonth() + 1);
      } else if (analysisPeriod === 'yearly') {
          newDate.setFullYear(newDate.getFullYear() + 1);
      }
      setDateCursor(newDate);
  };

  const currentPeriodLabel = useMemo(() => {
      if (analysisPeriod === 'all') return "Todo el Historial";
      if (analysisPeriod === 'yearly') return dateCursor.getFullYear().toString();
      
      // Monthly: e.g., "Marzo 2025"
      const monthName = dateCursor.toLocaleString('es-ES', { month: 'long' });
      const year = dateCursor.getFullYear();
      return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
  }, [dateCursor, analysisPeriod]);

  // --- CASH FLOW STATS (NEW) ---
  const cashFlowStats = useMemo(() => {
      const targetMonth = dateCursor.getMonth();
      const targetYear = dateCursor.getFullYear();
      let income = 0;
      let expense = 0;

      transactions.forEach(tx => {
          const txDate = new Date(tx.date);
          let match = false;
          
          if (analysisPeriod === 'all') {
              match = true;
          } else if (analysisPeriod === 'monthly') {
              match = txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
          } else if (analysisPeriod === 'yearly') {
              match = txDate.getFullYear() === targetYear;
          }

          if (match) {
              if (tx.type === 'income') income += tx.amount;
              else if (tx.type === 'expense') expense += tx.amount;
          }
      });

      return { income, expense, balance: income - expense };
  }, [transactions, analysisPeriod, dateCursor]);

  // --- ANALYSIS DATA FILTERING ---
  const categoryAnalysisData = useMemo(() => {
      const targetMonth = dateCursor.getMonth();
      const targetYear = dateCursor.getFullYear();

      // 1. Filter Transactions
      const filteredTx = transactions.filter(tx => {
          if (tx.type !== analysisType) return false;
          
          // 'All' time logic
          if (analysisPeriod === 'all') return true;

          const txDate = new Date(tx.date);
          
          if (analysisPeriod === 'monthly') {
              // Note: tx.date is usually YYYY-MM-DD string, new Date(string) works
              // Just to be safe with timezones on strings, we often split, but new Date() usually suffices for local if ISO formatted
              // However, simpler: match month/year indices
              return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
          } else if (analysisPeriod === 'yearly') {
              return txDate.getFullYear() === targetYear;
          }
          return true;
      });

      // 2. Group by Category
      const grouped: Record<string, number> = {};
      let total = 0;

      filteredTx.forEach(tx => {
          grouped[tx.category] = (grouped[tx.category] || 0) + tx.amount;
          total += tx.amount;
      });

      // 3. Convert to Array & Add Colors
      const result = Object.keys(grouped).map(catName => {
          const amount = grouped[catName];
          // Get color
          const catList = analysisType === 'income' ? incomeCategories : expenseCategories;
          const foundCat = catList.find(c => c.name === catName);
          let color = foundCat ? foundCat.color : '#6b7280';
          
          // Generate hash color if missing
          if (!foundCat) {
              let hash = 0;
              for (let i = 0; i < catName.length; i++) hash = catName.charCodeAt(i) + ((hash << 5) - hash);
              const h = Math.abs(hash) % 360;
              color = `hsl(${h}, 70%, 60%)`;
          }

          return {
              name: catName,
              value: amount,
              percentage: total > 0 ? (amount / total) * 100 : 0,
              color: color
          };
      });

      // 4. Sort Descending
      return result.sort((a, b) => b.value - a.value);
  }, [transactions, analysisType, analysisPeriod, dateCursor, incomeCategories, expenseCategories]);

  // --- DYNAMIC HEIGHT CALCULATION ---
  const dynamicChartHeight = useMemo(() => {
    const itemCount = categoryAnalysisData.length;
    if (itemCount === 0) return 200; // Fixed height for "No Data" state
    return Math.max(120, itemCount * 50);
  }, [categoryAnalysisData.length]);


  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ["Fecha", "Descripción", "Categoría", "Tipo", "Monto (€)"];
    const rows = transactions.map(tx => [
      tx.date, `"${tx.description.replace(/"/g, '""')}"`, tx.category, tx.type === 'income' ? 'Ingreso' : 'Gasto', tx.amount.toFixed(2)
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transacciones_violetwallet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a24]/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl z-50">
          <p className="text-white text-xs font-bold mb-1 opacity-70 uppercase tracking-wider">{payload[0].payload.name}</p>
          {/* Tooltip big bold text */}
          <p className="text-white text-xl font-black tracking-tight">€{payload[0].value?.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</p>
        </div>
      );
    }
    return null;
  };

  const getCategoryColor = (catName: string, type: 'income' | 'expense') => {
    const list = type === 'income' ? incomeCategories : expenseCategories;
    const found = list.find(c => c.name === catName);
    if (found) return found.color;
    let hash = 0;
    for (let i = 0; i < catName.length; i++) hash = catName.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 60%)`; 
  };

  // Profit/Loss Calculations for Widget
  const investmentProfit = totalInvestmentsValue - totalInvestedCapital;
  const investmentYield = totalInvestedCapital > 0 ? (investmentProfit / totalInvestedCapital) * 100 : 0;

  const visibleTransactions = isHistoryExpanded ? transactions : transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 1. Main Balance Hero */}
      <div className="flex flex-col items-center justify-center py-4 text-center animate-in fade-in zoom-in-95 duration-500">
        <p className="text-gray-400 text-xs font-bold tracking-[0.2em] uppercase mb-2">Patrimonio Neto</p>
        <div className="flex items-center gap-3">
          <h2 className={`text-6xl font-black text-white tracking-tighter transition-all duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] ${!showBalance && 'blur-lg opacity-50 select-none'}`}>
             €{netWorth.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </h2>
          <button onClick={() => setShowBalance(!showBalance)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
            {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {/* 2. Bento Grid Widgets for Sections - ILLUMINATED STYLE */}
      <div className="grid grid-cols-3 gap-4 h-36 animate-in slide-in-from-bottom-4 duration-500 delay-100">
        
        {/* Widget 1: Bolsa (Wallet) */}
        <div 
          onClick={() => setHeroChartMode('networth')}
          className="relative group cursor-pointer"
        >
           <div className={`absolute -inset-0.5 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-[26px] opacity-20 blur group-hover:opacity-60 transition duration-500 ${heroChartMode === 'networth' ? 'opacity-60' : ''}`} />
           <div className="relative bg-[#0d1017] backdrop-blur-xl border border-white/10 rounded-[24px] p-4 flex flex-col justify-between h-full overflow-hidden shadow-2xl">
               <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-500/20 rounded-full blur-2xl"></div>
               <div className="relative z-10">
                  <div className="p-2 bg-emerald-500/10 w-fit rounded-xl border border-emerald-500/20 mb-2">
                    <Wallet size={18} className="text-emerald-400"/>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bolsa</p>
               </div>
               <p className="text-lg font-black text-white tracking-tighter relative z-10">€{incomeBag.toFixed(0)}</p>
           </div>
        </div>

        {/* Widget 2: Investments (UPDATED TO SHOW PROFIT) */}
        <div 
          onClick={() => setHeroChartMode('investments')}
          className="relative group cursor-pointer"
        >
           <div className={`absolute -inset-0.5 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-[26px] opacity-20 blur group-hover:opacity-60 transition duration-500 ${heroChartMode === 'investments' ? 'opacity-60' : ''}`} />
           <div className="relative bg-[#0d1017] backdrop-blur-xl border border-white/10 rounded-[24px] p-4 flex flex-col justify-between h-full overflow-hidden shadow-2xl">
               <div className="absolute -right-6 -top-6 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl"></div>
               <div className="relative z-10">
                  <div className="p-2 bg-blue-500/10 w-fit rounded-xl border border-blue-500/20 mb-2">
                    <CandlestickChart size={18} className="text-blue-400"/>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inversión</p>
               </div>
               <div className="flex items-end gap-2 relative z-10">
                   <p className="text-lg font-black text-white tracking-tighter">€{totalInvestmentsValue.toFixed(0)}</p>
                   {totalInvestedCapital > 0 && (
                       <div className={`text-[10px] font-bold mb-1 ${investmentProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {investmentProfit >= 0 ? '+' : ''}{investmentYield.toFixed(1)}%
                       </div>
                   )}
               </div>
           </div>
        </div>

        {/* Widget 3: Debt */}
        <div 
          onClick={() => setHeroChartMode('debt')}
          className="relative group cursor-pointer"
        >
           <div className={`absolute -inset-0.5 bg-gradient-to-br from-rose-600 to-fuchsia-600 rounded-[26px] opacity-20 blur group-hover:opacity-60 transition duration-500 ${heroChartMode === 'debt' ? 'opacity-60' : ''}`} />
           <div className="relative bg-[#0d1017] backdrop-blur-xl border border-white/10 rounded-[24px] p-4 flex flex-col justify-between h-full overflow-hidden shadow-2xl">
               <div className="absolute -right-6 -top-6 w-20 h-20 bg-rose-500/20 rounded-full blur-2xl"></div>
               <div className="relative z-10">
                  <div className="p-2 bg-rose-500/10 w-fit rounded-xl border border-rose-500/20 mb-2">
                    <CreditCard size={18} className="text-rose-400"/>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Deuda</p>
               </div>
               <p className="text-lg font-black text-white tracking-tighter relative z-10">€{totalDebts.toFixed(0)}</p>
           </div>
        </div>
      </div>

       {/* MAIN CHART */}
      <GlassCard className="p-6 h-[300px] flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-200 border-white/10 shadow-[0_0_40px_-10px_rgba(124,58,237,0.1)] bg-[#0d1017]/50 backdrop-blur-2xl">
          {/* Subtle Glow Background in Card */}
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div className="flex items-center gap-2">
              <SectionTitle>
                  {heroChartMode === 'networth' && "Evolución"}
                  {heroChartMode === 'investments' && "Portafolio"}
                  {heroChartMode === 'debt' && "Pasivos"}
              </SectionTitle>
            </div>
            
            {heroChartMode === 'investments' && (
               <button 
                  onClick={() => setActiveTab('investments')}
                  className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1"
               >
                  Ver Todo <ChevronRight size={12} />
               </button>
            )}

            {heroChartMode === 'networth' && (
              <div className="flex bg-[#000000]/40 rounded-lg p-0.5 border border-white/5">
                  {['daily', 'monthly', 'yearly'].map((v) => (
                    <button 
                      key={v}
                      onClick={() => setChartView(v as any)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${chartView === v ? 'bg-violet-600 text-white shadow-md' : 'text-gray-500 hover:text-white'}`}
                    >
                      {v === 'daily' ? '1M' : v === 'monthly' ? '1A' : 'MAX'}
                    </button>
                  ))}
              </div>
            )}
          </div>
          
          <div className="flex-1 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              {heroChartMode === 'networth' && netWorthHistoryData.length > 0 ? (
                  <AreaChart data={netWorthHistoryData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                      <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={gradientOffset} stopColor="#10b981" stopOpacity={0.4} /> 
                      <stop offset={gradientOffset} stopColor="#f43f5e" stopOpacity={0.4} />
                      </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} dy={10} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 1 }} />
                  <ReferenceLine y={0} stroke="#ffffff10" />
                  <Area type="monotone" dataKey="value" stroke={netWorth >= 0 ? "#10b981" : "#f43f5e"} strokeWidth={3} fillOpacity={1} fill="url(#splitColor)" />
                  </AreaChart>
              ) : heroChartMode === 'investments' ? (
                  investmentPieData.length > 0 ? (
                      <PieChart>
                          <Pie 
                          data={investmentPieData} 
                          cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none"
                          >
                          {investmentPieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" iconSize={6} wrapperStyle={{fontSize: '10px', color: '#9ca3af'}} />
                      </PieChart>
                  ) : <div className="flex h-full items-center justify-center text-gray-500 text-sm">Sin datos</div>
              ) : (
                  debtBarData.length > 0 ? (
                      <BarChart data={debtBarData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={110} tick={{fill: '#e5e7eb', fontSize: 11, fontWeight: 500}} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                          <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                  ) : <div className="flex h-full items-center justify-center text-gray-500 text-sm">Sin deudas</div>
              )}
            </ResponsiveContainer>
          </div>
      </GlassCard>

      {/* --- SECTION: ANALYSIS & SUMMARY --- */}
      <GlassCard className="p-6 animate-in slide-in-from-bottom-4 duration-500 delay-300 overflow-visible relative z-30 bg-[#0d1017]/50">
          <div className="flex flex-col gap-6 mb-6">
              
              {/* Header Row 1: Title */}
              <div className="flex items-center gap-3">
                  <div className="bg-violet-500/10 p-2.5 rounded-xl text-violet-400 border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                      <BarChart3 size={20} />
                  </div>
                  <div>
                      <h3 className="text-white font-bold text-sm tracking-wide">Análisis del Periodo</h3>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mt-0.5">
                        Balance y Desglose de {analysisType === 'income' ? 'Ingresos' : 'Gastos'}
                      </p>
                  </div>
              </div>

              {/* Header Row 2: Controls (Type & Date Navigator) */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 w-full relative z-50">
                   
                   {/* Type Switcher */}
                   <div className="relative w-full sm:w-auto">
                        <button
                            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                            className="w-full sm:w-auto flex items-center gap-2 bg-[#1a1a24]/80 backdrop-blur-xl border border-violet-500/20 hover:bg-white/5 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all justify-between shadow-lg shadow-violet-900/10"
                        >
                            <span className="flex items-center gap-2">
                                {(() => {
                                    const active = typeOptions.find(o => o.value === analysisType);
                                    if(active) {
                                        const Icon = active.icon;
                                        return <><Icon size={14} className={active.colorClass} /> {active.label}</>;
                                    }
                                    return "Tipo";
                                })()}
                            </span>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${isTypeDropdownOpen ? 'rotate-180' : ''}`}/>
                        </button>

                        {isTypeDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsTypeDropdownOpen(false)} />
                                <div className="absolute left-0 top-full mt-2 w-40 bg-[#1a1a24]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden py-1 animate-in zoom-in-95 duration-100 origin-top-left ring-1 ring-white/5">
                                    {typeOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => { setAnalysisType(opt.value); setIsTypeDropdownOpen(false); }}
                                            className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors flex items-center justify-between group hover:bg-white/5 ${analysisType === opt.value ? 'bg-violet-500/10 text-white' : 'text-gray-400'}`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <opt.icon size={14} className={opt.colorClass} /> {opt.label}
                                            </span>
                                            {analysisType === opt.value && <Check size={12} className="text-violet-400"/>}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                   </div>

                   {/* Date Navigator (REWRITTEN) */}
                   <div className="flex items-center gap-1 bg-[#1a1a24]/80 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-lg w-full sm:w-auto justify-center min-w-[200px]">
                        
                        {/* Prev Button */}
                        <button 
                            onClick={handlePrevPeriod} 
                            disabled={analysisPeriod === 'all'}
                            className={`p-2 rounded-lg transition-colors ${analysisPeriod === 'all' ? 'text-gray-700 cursor-not-allowed' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        
                        {/* Center Label with Dropdown */}
                        <div className="relative flex-1 flex justify-center">
                            <button 
                                onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                                className="flex flex-col items-center px-2 py-1 rounded-lg hover:bg-white/5 transition-all w-full"
                            >
                                <span className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-2">
                                    {currentPeriodLabel}
                                </span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-violet-400 font-bold uppercase tracking-wider scale-90">
                                        {analysisPeriod === 'monthly' ? 'Mensual' : analysisPeriod === 'yearly' ? 'Anual' : 'Global'}
                                    </span>
                                    <ChevronDown size={10} className={`text-gray-500 transition-transform ${isPeriodDropdownOpen ? 'rotate-180' : ''}`}/>
                                </div>
                            </button>

                            {isPeriodDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-20" onClick={() => setIsPeriodDropdownOpen(false)} />
                                    <div className="absolute top-full mt-2 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden py-1 animate-in zoom-in-95 duration-100 flex flex-col items-center">
                                        {[
                                            { id: 'monthly', label: 'Vista Mensual' },
                                            { id: 'yearly', label: 'Vista Anual' },
                                            { id: 'all', label: 'Histórico Global' }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => { setAnalysisPeriod(opt.id as any); setIsPeriodDropdownOpen(false); }}
                                                className={`w-full text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider hover:bg-white/5 transition-colors ${analysisPeriod === opt.id ? 'text-violet-400 bg-violet-500/10' : 'text-gray-400'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Next Button */}
                        <button 
                            onClick={handleNextPeriod} 
                            disabled={analysisPeriod === 'all'}
                            className={`p-2 rounded-lg transition-colors ${analysisPeriod === 'all' ? 'text-gray-700 cursor-not-allowed' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                        >
                            <ChevronRight size={16} />
                        </button>
                   </div>
              </div>

               {/* NEW: CASH FLOW SUMMARY METRICS */}
              <div className="grid grid-cols-3 gap-3 animate-in fade-in duration-500">
                  <div className="bg-[#0a0a10] border border-emerald-500/20 rounded-2xl p-3 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-10"><TrendingUp className="text-emerald-500" size={24}/></div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Ingresos</p>
                      <p className="text-lg font-black text-emerald-400 tracking-tight">€{cashFlowStats.income.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</p>
                  </div>
                   <div className="bg-[#0a0a10] border border-rose-500/20 rounded-2xl p-3 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-10"><TrendingDown className="text-rose-500" size={24}/></div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Gastos</p>
                      <p className="text-lg font-black text-rose-400 tracking-tight">€{cashFlowStats.expense.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</p>
                  </div>
                   <div className="bg-[#0a0a10] border border-blue-500/20 rounded-2xl p-3 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-10"><Wallet className="text-blue-500" size={24}/></div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Balance</p>
                      <p className={`text-lg font-black tracking-tight ${cashFlowStats.balance >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                          {cashFlowStats.balance > 0 ? '+' : ''}€{cashFlowStats.balance.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                      </p>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-20 transition-all duration-500">
              {/* Chart */}
              <div style={{ height: dynamicChartHeight }} className="w-full transition-all duration-500 ease-out">
                  {categoryAnalysisData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={categoryAnalysisData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" width={100} tick={{fill: '#9ca3af', fontSize: 11, fontWeight: 600}} axisLine={false} tickLine={false} />
                              <Tooltip 
                                  cursor={{fill: 'transparent'}} 
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-[#1a1a24]/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl z-50">
                                          <p className="text-white text-xs font-bold mb-1 opacity-70 uppercase tracking-wider">{payload[0].payload.name}</p>
                                          <p className="text-white text-xl font-black tracking-tight">€{payload[0].value?.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }} 
                              />
                              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18} animationDuration={1000}>
                                  {categoryAnalysisData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                              </Bar>
                          </BarChart>
                      </ResponsiveContainer>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                          <div className="p-3 bg-white/5 rounded-full">
                            <Filter size={20} />
                          </div>
                          <span className="text-xs font-medium">Sin datos para {currentPeriodLabel}</span>
                      </div>
                  )}
              </div>

              {/* Legend / List */}
              <div 
                  className="space-y-4 overflow-y-auto pr-2 custom-scrollbar transition-all duration-500 ease-out"
                  style={{ maxHeight: dynamicChartHeight }}
              >
                  {categoryAnalysisData.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center group p-2 hover:bg-white/[0.03] rounded-xl transition-colors">
                          <div className="flex items-center gap-3.5">
                              <div className="w-1.5 h-10 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}40` }} />
                              <div>
                                  <p className="text-white text-sm font-bold group-hover:text-violet-200 transition-colors tracking-tight">{item.name}</p>
                                  <div className="w-28 h-1.5 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                                      <div 
                                          className="h-full rounded-full transition-all duration-1000 ease-out" 
                                          style={{ width: `${item.percentage}%`, backgroundColor: item.color }} 
                                      />
                                  </div>
                              </div>
                          </div>
                          <div className="text-right">
                              <p className="text-white text-xl font-black tracking-tight leading-none">
                                  €{item.value.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                              </p>
                              <div className="flex justify-end mt-1">
                                <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5">
                                    {item.percentage.toFixed(1)}%
                                </span>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </GlassCard>

      {/* Transaction History List - ILLUMINATED LIST ITEMS */}
      <div className="animate-in slide-in-from-bottom-4 duration-500 delay-400">
        <div className="flex justify-between items-center mb-4 px-2">
          <SectionTitle>Movimientos Recientes</SectionTitle>
          <button 
            onClick={handleExportCSV} 
            className="text-[10px] font-bold text-violet-300 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 border border-violet-500/20"
          >
            <Download size={12} /> CSV
          </button>
        </div>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-[24px] border border-white/5">
                <p className="text-gray-500 text-sm">No hay actividad reciente.</p>
            </div>
          ) : (
            <>
              {visibleTransactions.map(tx => {
                const isInvestment = tx.category === 'Inversión';
                const isBankDebt = tx.category === 'Deuda Bancaria' || tx.category.includes('Cuota');
                const customColor = getCategoryColor(tx.category, tx.type);
                const isIncome = tx.type === 'income';
                
                return (
                  <div key={tx.id} className="relative group cursor-default">
                    {/* Background Glow */}
                    <div className={`absolute -inset-0.5 bg-gradient-to-r ${isIncome ? 'from-emerald-600 to-teal-600' : 'from-rose-600 to-red-600'} rounded-2xl opacity-10 blur group-hover:opacity-40 transition duration-500`}></div>
                    
                    {/* Content Card */}
                    <div className={`relative bg-white/[0.04] backdrop-blur-xl hover:bg-white/[0.08] border border-white/10 ${isIncome ? 'border-l-emerald-500' : 'border-l-rose-500'} border-l-4 rounded-r-2xl rounded-l-md p-5 flex justify-between items-center transition-all shadow-lg`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                {isInvestment ? <CandlestickChart size={20} /> :
                                tx.category === 'B365' ? <Dices size={20} /> :
                                isBankDebt ? <Landmark size={20} /> :
                                isIncome ? <TrendingUp size={20} /> : <TrendingDown size={20} />
                                }
                            </div>
                            <div>
                                <p className="text-white font-bold text-base tracking-wide">{tx.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase tracking-wider ${isIncome ? 'text-emerald-300' : 'text-rose-300'}`}>
                                        {tx.category}
                                    </span>
                                    <span className="text-gray-500 text-[10px]">{tx.date}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className={`block font-black text-lg tracking-tight ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isIncome ? '+' : '-'}€{tx.amount.toFixed(2)}
                            </span>
                             {/* Hidden Actions that appear on Hover */}
                            <div className="flex justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 bottom-2 translate-y-full group-hover:translate-y-0 bg-[#000000]/80 backdrop-blur-md p-1 rounded-lg border border-white/10 z-10">
                                <button onClick={(e) => { e.stopPropagation(); openEditTransaction(tx); }} className="p-1.5 hover:bg-white/10 rounded-md text-gray-300 hover:text-white"><Edit3 size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setTransactionToDelete(tx); }} className="p-1.5 hover:bg-rose-500/20 rounded-md text-gray-300 hover:text-rose-400"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    </div>
                  </div>
                );
              })}

              {transactions.length > 5 && (
                <button 
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  className="w-full py-4 text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-1 uppercase tracking-widest"
                >
                  {isHistoryExpanded ? "Ver Menos" : "Ver Historial Completo"} <ChevronDown size={14} className={`transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`}/>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={() => {
            if (transactionToDelete) {
                deleteTransaction(transactionToDelete.id, transactionToDelete.type, transactionToDelete.amount);
            }
        }}
        title="Eliminar Transacción"
        message={`¿Estás seguro de que deseas eliminar este movimiento (${transactionToDelete?.description})?`}
        isDanger={true}
      />
    </div>
  );
};