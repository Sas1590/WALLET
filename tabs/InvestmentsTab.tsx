import React, { useState, useEffect } from 'react';
import { 
  CandlestickChart, Wifi, WifiOff, RefreshCw, ArrowUpRight, ArrowDownRight, 
  PlusCircle, Wallet2, DollarSign, AlertCircle, Bitcoin, Building2, Trash2, Loader2, X, Globe, TrendingUp, Layers, Check,
  Receipt, ScanLine, ArrowRightLeft, Calculator
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { GlassCard, SectionTitle } from '../components/UI';
import { Investment, InvestmentForm, StockCandles, CompanyProfile } from '../types';

interface InvestmentsTabProps {
  investments: Investment[];
  totalInvestmentsValue: number;
  totalInvestedCapital: number;
  investmentForm: InvestmentForm;
  setInvestmentForm: React.Dispatch<React.SetStateAction<InvestmentForm>>;
  investMode: 'qty' | 'amount';
  setInvestMode: React.Dispatch<React.SetStateAction<'qty' | 'amount'>>;
  investTotalEUR: string;
  setInvestTotalEUR: React.Dispatch<React.SetStateAction<string>>;
  incomeBag: number;
  isUpdatingPrices: boolean;
  isSubmitting: boolean;
  formError: string | null;
  refreshPrices: () => void;
  handleFetchCurrentPriceForForm: () => void;
  handleAddInvestment: () => void;
  deleteInvestment: (id: string) => void;
  finnhubKey: string;
}

// --- Helper: Generate Simulated Data ---
const generateSimulatedData = (lastPrice: number) => {
    const data = [];
    const now = new Date();
    // Start from current price and walk backwards
    let currentPrice = lastPrice;
    
    // Generate 30 points (last 30 days) reversed
    const points = [];
    for (let i = 0; i < 30; i++) {
        points.unshift(currentPrice);
        // Random volatility between -3% and +3%
        const change = currentPrice * (Math.random() * 0.06 - 0.03); 
        currentPrice -= change;
    }

    // Map to chart format
    for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (29 - i));
        data.push({
            date: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
            price: points[i]
        });
    }
    return data;
};

// --- SUBCOMPONENT: Asset Detail Modal ---
const AssetDetailModal = ({ investment, onClose, apiKey }: { investment: Investment; onClose: () => void; apiKey: string }) => {
    const [chartData, setChartData] = useState<any[]>([]);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSimulated, setIsSimulated] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            // Determine reference price for fallback
            const referencePrice = investment.currentPrice || investment.avgBuyPrice || 100;

            if (investment.type === 'crypto') {
                 // For now, simulate crypto history or use CoinGecko simple chart in future
                 setChartData(generateSimulatedData(referencePrice));
                 setIsSimulated(true);
                 setIsLoading(false);
                 return;
            }

            if (!apiKey || apiKey === "TU_API_KEY_DE_FINNHUB_AQUI") {
                // No API key: Simulate immediately
                setChartData(generateSimulatedData(referencePrice));
                setIsSimulated(true);
                setIsLoading(false);
                return;
            }

            try {
                // 1. Fetch Candles (Last 30 days)
                const to = Math.floor(Date.now() / 1000);
                const from = to - (30 * 24 * 60 * 60); // 30 days ago
                const symbol = investment.symbol;
                
                const candlesRes = await fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${apiKey}`);
                const candles: StockCandles = await candlesRes.json();

                if (candles.s === "ok" && candles.c && candles.t) {
                    const formattedData = candles.t.map((timestamp, index) => ({
                        date: new Date(timestamp * 1000).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                        price: candles.c[index]
                    }));
                    setChartData(formattedData);
                    setIsSimulated(false);
                } else {
                    // API returned 'no_data' or error status -> Use Simulation
                    console.warn(`Finnhub: No data for ${symbol}, using simulation.`);
                    setChartData(generateSimulatedData(referencePrice));
                    setIsSimulated(true);
                }

                // 2. Fetch Profile (Optional - fail silently)
                try {
                    const profileRes = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`);
                    const profileData = await profileRes.json();
                    if (profileData && profileData.name) {
                        setProfile(profileData);
                    }
                } catch (e) {
                    console.warn("Profile fetch failed", e);
                }

            } catch (err) {
                console.error("Network/API Error", err);
                // On any crash/network error -> Use Simulation
                setChartData(generateSimulatedData(referencePrice));
                setIsSimulated(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [investment, apiKey]);

    // Calculation updates for Fees
    const currentValue = investment.quantity * (investment.currentPrice || 0);
    // Initial Value (Raw Cost)
    const rawCost = investment.quantity * investment.avgBuyPrice;
    // Fees paid
    const feesPaid = investment.fees || 0;
    // Total Invested (Cost Basis)
    const totalInvested = rawCost + feesPaid;
    
    // Profit = Current Value - Total Invested (including fees)
    const profit = currentValue - totalInvested;
    const profitPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <GlassCard className="w-full max-w-[95vw] md:max-w-2xl p-0 overflow-hidden border-blue-500/30">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-blue-900/40 to-[#0d1017] p-6 border-b border-white/5 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                        <X size={24} />
                    </button>
                    
                    <div className="flex items-center gap-4">
                        {profile?.logo ? (
                            <img src={profile.logo} alt={investment.symbol} className="w-12 h-12 rounded-full bg-white/10" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xl">
                                {investment.symbol.substring(0, 2)}
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                                {profile?.name || investment.name || investment.symbol}
                                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">{investment.symbol}</span>
                            </h2>
                            <div className="flex flex-col">
                                {investment.platform && investment.platform !== 'N/A' && (
                                    <div className="flex items-center gap-1 mb-1">
                                        <Layers size={12} className="text-gray-400"/>
                                        <span className="text-xs font-bold text-gray-300 bg-white/5 px-1.5 rounded">{investment.platform}</span>
                                    </div>
                                )}
                                <div className="mt-1">
                                    {isSimulated ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                                            <WifiOff size={10} /> {investment.type === 'crypto' ? 'PRECIO COINGECKO' : 'PROYECCIÓN SIMULADA'}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                            <Wifi size={10} /> MERCADO REAL
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6 bg-[#0d1017]">
                    {/* Key Stats Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Precio Actual</p>
                            <p className="text-2xl font-bold text-white">€{investment.currentPrice?.toFixed(2)}</p>
                        </div>
                        <div className={`bg-white/5 rounded-xl p-4 border border-white/5 ${profit >= 0 ? 'border-b-emerald-500/50' : 'border-b-rose-500/50'} border-b-2`}>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Rendimiento (Post-comisiones)</p>
                            <div className="flex items-baseline gap-2">
                                <p className={`text-2xl font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {profit >= 0 ? '+' : ''}€{profit.toFixed(2)}
                                </p>
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${profit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {profitPercent.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Chart Section */}
                    <div className="h-64 w-full bg-[#0a0a10] rounded-xl border border-white/5 p-2 relative">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-blue-400">
                                <Loader2 className="animate-spin mb-2" size={32} />
                                <span className="text-xs animate-pulse">Cargando datos de mercado...</span>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#6b7280', fontSize: 10}} 
                                        minTickGap={30}
                                    />
                                    <YAxis 
                                        domain={['auto', 'auto']} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#6b7280', fontSize: 10}}
                                        width={40}
                                    />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff'}}
                                        itemStyle={{color: '#60a5fa'}}
                                        labelStyle={{color: '#94a3b8', marginBottom: '4px'}}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="price" 
                                        stroke="#3b82f6" 
                                        strokeWidth={2}
                                        fillOpacity={1} 
                                        fill="url(#colorPrice)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-500">Cantidad</span>
                            <span className="text-white font-mono">{investment.quantity.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-500">Precio Compra</span>
                            <span className="text-white font-mono">€{investment.avgBuyPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-500">Coste Activo</span>
                            <span className="text-white font-mono">€{rawCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-500">Comisiones</span>
                            <span className="text-rose-400 font-mono">-€{feesPaid.toFixed(2)}</span>
                        </div>
                         <div className="flex justify-between border-b border-white/5 pb-2 bg-white/[0.02] p-1 rounded">
                            <span className="text-gray-300 font-bold">Total Invertido</span>
                            <span className="text-white font-mono font-bold">€{totalInvested.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-500">Valor Actual</span>
                            <span className="text-white font-mono">€{currentValue.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    {profile?.weburl && (
                        <div className="pt-2 text-center">
                            <a 
                                href={profile.weburl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-2 rounded-lg"
                            >
                                <Globe size={12} /> Visitar Sitio Web Oficial
                            </a>
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
};

export const InvestmentsTab: React.FC<InvestmentsTabProps> = ({
  investments,
  totalInvestmentsValue,
  totalInvestedCapital,
  investmentForm,
  setInvestmentForm,
  investMode,
  setInvestMode,
  investTotalEUR,
  setInvestTotalEUR,
  incomeBag,
  isUpdatingPrices,
  isSubmitting,
  formError,
  refreshPrices,
  handleFetchCurrentPriceForForm,
  handleAddInvestment,
  deleteInvestment,
  finnhubKey
}) => {
  const [selectedAsset, setSelectedAsset] = useState<Investment | null>(null);
  const [viewFilter, setViewFilter] = useState<'all' | 'stock' | 'crypto'>('all');
  const [showApiModal, setShowApiModal] = useState(false);
  const [cmcKey, setCmcKey] = useState('');
  
  // NEW: Input Mode (Standard vs Receipt)
  const [inputMethod, setInputMethod] = useState<'standard' | 'receipt'>('standard');

  const PLATFORM_OPTIONS = [
    "Binance", "Coinbase", "Kraken", "Metamask", "Ledger", "Revolut", 
    "MyInvestor", "Degiro", "Interactive Brokers", "Trade Republic", "MoonPay", "Ramp", "Otro"
  ];

  // Auto-set type when switching tabs
  useEffect(() => {
    if (viewFilter === 'stock') setInvestmentForm(prev => ({ ...prev, type: 'stock' }));
    if (viewFilter === 'crypto') setInvestmentForm(prev => ({ ...prev, type: 'crypto' }));
  }, [viewFilter, setInvestmentForm]);

  // Simulate Scanning the Ticket provided
  const simulateTicketScan = () => {
      // Data extracted from the user's screenshot
      setInvestmentForm({
          ...investmentForm,
          symbol: 'USDT',
          quantity: '43.0200215',
          price: (50.00 / 43.0200215).toString(), // Auto-calc price
          fees: '0.25',
          platform: 'MoonPay', // Guessing based on common fiat onramps style
          type: 'crypto',
          deductFromWallet: true
      });
      setInvestTotalEUR('50.00'); // Total Spent
      setInputMethod('receipt'); // Switch to receipt mode
      setInvestMode('amount'); // Force Amount mode to sync logic
  };

  const filteredInvestments = investments.filter(inv => {
      if (viewFilter === 'all') return true;
      if (viewFilter === 'crypto') return inv.type === 'crypto';
      if (viewFilter === 'stock') return inv.type !== 'crypto';
      return true;
  });

  const cryptoTotalValue = investments.filter(i => i.type === 'crypto').reduce((acc, inv) => acc + (inv.quantity * (inv.currentPrice || 0)), 0);
  const stockTotalValue = investments.filter(i => i.type !== 'crypto').reduce((acc, inv) => acc + (inv.quantity * (inv.currentPrice || 0)), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      
      {/* --- FILTER TABS --- */}
      <div className="flex p-1 bg-black/30 rounded-xl border border-white/5 relative">
           <div 
             className={`absolute top-1 bottom-1 w-[calc(33.33%-6px)] bg-white/10 rounded-lg shadow-sm transition-all duration-300 ease-spring`}
             style={{ 
                 left: viewFilter === 'all' ? '4px' : viewFilter === 'stock' ? 'calc(33.33% + 2px)' : 'calc(66.66%)'
             }}
           />
           <button onClick={() => setViewFilter('all')} className={`flex-1 relative z-10 py-2 text-xs font-bold text-center transition-colors ${viewFilter === 'all' ? 'text-white' : 'text-gray-500'}`}>General</button>
           <button onClick={() => setViewFilter('stock')} className={`flex-1 relative z-10 py-2 text-xs font-bold text-center transition-colors ${viewFilter === 'stock' ? 'text-white' : 'text-gray-500'}`}>Bolsa</button>
           <button onClick={() => setViewFilter('crypto')} className={`flex-1 relative z-10 py-2 text-xs font-bold text-center transition-colors ${viewFilter === 'crypto' ? 'text-white' : 'text-gray-500'}`}>Cripto</button>
      </div>

      {/* --- DYNAMIC HEADER CARD --- */}
      <div className="relative group">
          <div className={`absolute -inset-0.5 bg-gradient-to-r ${viewFilter === 'crypto' ? 'from-orange-600 to-amber-600' : 'from-blue-600 to-cyan-500'} rounded-[26px] opacity-20 blur group-hover:opacity-50 transition duration-1000`}></div>
          <div className="relative bg-[#0d1017] rounded-3xl p-6 border border-white/10">
              <div className="flex justify-between items-start mb-2">
                  <p className={`${viewFilter === 'crypto' ? 'text-orange-200' : 'text-cyan-200'} text-sm font-medium tracking-wide uppercase flex items-center gap-2`}>
                     {viewFilter === 'crypto' ? <Bitcoin size={16}/> : <CandlestickChart size={16}/>} 
                     {viewFilter === 'crypto' ? 'Portfolio Cripto' : viewFilter === 'stock' ? 'Portfolio Bolsa' : 'Cartera Global'}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase font-bold text-gray-600 bg-black/40 px-2 py-1 rounded-full border border-white/5 flex items-center gap-1">
                      {finnhubKey && finnhubKey !== "TU_API_KEY_DE_FINNHUB_AQUI" ? <><Wifi size={10} className="text-emerald-500"/> ONLINE</> : <><WifiOff size={10} className="text-gray-500"/> SIMULADO</>}
                    </span>
                    <button onClick={refreshPrices} className={`${viewFilter === 'crypto' ? 'text-orange-400' : 'text-cyan-400'} hover:text-white p-2 hover:bg-white/10 rounded-full transition-all`} title="Actualizar Precios">
                        <RefreshCw size={18} className={isUpdatingPrices ? "animate-spin" : ""} />
                    </button>
                  </div>
              </div>
              <div className="flex items-baseline gap-1">
                  <h2 className="text-4xl font-black text-white tracking-tighter">
                      €{
                          viewFilter === 'crypto' ? cryptoTotalValue.toLocaleString('es-ES', { minimumFractionDigits: 2 }) :
                          viewFilter === 'stock' ? stockTotalValue.toLocaleString('es-ES', { minimumFractionDigits: 2 }) :
                          totalInvestmentsValue.toLocaleString('es-ES', { minimumFractionDigits: 2 })
                      }
                  </h2>
              </div>
              
              <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
                  <div>
                      <p className="text-xs text-gray-400 mb-1">Capital Invertido (inc. comisiones)</p>
                      <p className="text-white font-semibold">€{totalInvestedCapital.toFixed(2)}</p>
                  </div>
                  {viewFilter === 'crypto' && (
                       <button onClick={() => setShowApiModal(true)} className="text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-3 py-1 text-gray-400 flex items-center gap-1">
                           <Globe size={10}/> Sincronizar CoinMarketCap
                       </button>
                  )}
                  {viewFilter !== 'crypto' && (
                    <div className="text-right">
                         <p className="text-xs text-gray-400 mb-1">Rentabilidad</p>
                         <div className={`flex items-center gap-1 font-bold ${totalInvestmentsValue >= totalInvestedCapital ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {totalInvestmentsValue >= totalInvestedCapital ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}
                            <span>
                                {totalInvestedCapital > 0 
                                  ? (((totalInvestmentsValue - totalInvestedCapital) / totalInvestedCapital) * 100).toFixed(2) 
                                  : '0.00'}%
                            </span>
                         </div>
                    </div>
                  )}
              </div>
          </div>
      </div>

      {/* --- ADD INVESTMENT FORM --- */}
      <GlassCard className="p-5 border-blue-500/20">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-blue-200 uppercase flex items-center gap-2"><PlusCircle size={14}/> Añadir {viewFilter === 'crypto' ? 'Criptomoneda' : 'Activo'}</h3>
              <button 
                  onClick={simulateTicketScan}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-emerald-900/40 hover:scale-105 transition-transform"
              >
                  <ScanLine size={12}/> Simular Datos Ticket
              </button>
          </div>
          
          <div className="space-y-4">
              {/* Symbol & Type */}
              <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                      <input 
                          type="text" 
                          placeholder="Ticker (ej. BTC)" 
                          value={investmentForm.symbol} 
                          onBlur={handleFetchCurrentPriceForForm} 
                          onChange={(e) => setInvestmentForm({ ...investmentForm, symbol: e.target.value.toUpperCase() })} 
                          className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none uppercase" 
                      />
                      <button onClick={handleFetchCurrentPriceForForm} className="absolute right-2 top-2.5 text-blue-400 hover:text-white" title="Buscar Precio Actual">
                          <RefreshCw size={14} />
                      </button>
                  </div>
                  <select value={investmentForm.type} onChange={(e: any) => setInvestmentForm({ ...investmentForm, type: e.target.value })} className="bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none">
                      <option value="stock">Acción</option>
                      <option value="crypto">Cripto</option>
                      <option value="etf">ETF</option>
                  </select>
              </div>

              {/* Input Mode Toggle (Standard vs Receipt) */}
              <div className="flex bg-black/30 p-1 rounded-lg border border-white/5">
                   <button 
                       onClick={() => { setInputMethod('standard'); setInvestMode('qty'); }}
                       className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${inputMethod === 'standard' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                   >
                       <Calculator size={12}/> Manual (Cant + Precio)
                   </button>
                   <button 
                       onClick={() => { setInputMethod('receipt'); setInvestMode('amount'); }}
                       className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${inputMethod === 'receipt' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                   >
                       <Receipt size={12}/> Modo Ticket
                   </button>
              </div>

              {/* Form Fields based on Mode */}
              <div className="grid grid-cols-2 gap-2 items-start">
                  
                  {/* LEFT COLUMN: QUANTITY / RECEIVED */}
                  <div>
                      <label className="text-[10px] text-gray-500 ml-1">
                          {inputMethod === 'receipt' ? "Lo que recibí (Crypto)" : "Cantidad (Ud.)"}
                      </label>
                      <input 
                          type="number" 
                          placeholder="0.0000" 
                          value={investmentForm.quantity} 
                          onChange={(e) => setInvestmentForm({ ...investmentForm, quantity: e.target.value })} 
                          className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none" 
                      />
                  </div>

                  {/* RIGHT COLUMN: PRICE / SPENT */}
                  {inputMethod === 'standard' ? (
                      <div>
                           <label className="text-[10px] text-gray-500 ml-1">Precio Unitario (€)</label>
                           <input 
                              type="number" 
                              placeholder="Precio (€)" 
                              value={investmentForm.price} 
                              onChange={(e) => setInvestmentForm({ ...investmentForm, price: e.target.value })} 
                              className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none" 
                          />
                      </div>
                  ) : (
                      <div>
                          <label className="text-[10px] text-orange-400 ml-1 font-bold">Total Gastado (Fiat)</label>
                          <input 
                              type="number" 
                              placeholder="Ej. 50.00" 
                              value={investTotalEUR} 
                              onChange={(e) => {
                                  setInvestTotalEUR(e.target.value);
                                  // Auto-calculate implied price per unit for the backend logic
                                  // Price = Total Spent / Quantity
                                  if (investmentForm.quantity && parseFloat(investmentForm.quantity) > 0) {
                                      const impliedPrice = parseFloat(e.target.value) / parseFloat(investmentForm.quantity);
                                      setInvestmentForm(prev => ({ ...prev, price: impliedPrice.toString() }));
                                  }
                              }} 
                              className="w-full bg-orange-900/20 border border-orange-500/30 rounded-lg p-3 text-white text-sm focus:border-orange-500 outline-none font-bold" 
                          />
                          {investTotalEUR && investmentForm.quantity && (
                              <p className="text-[9px] text-gray-400 mt-1 ml-1 text-right">
                                  Precio Real: €{((parseFloat(investTotalEUR)/parseFloat(investmentForm.quantity)) || 0).toFixed(4)} / ud.
                              </p>
                          )}
                      </div>
                  )}
              </div>

              {/* Platform and Fees */}
              <div className="grid grid-cols-2 gap-2 items-start">
                   <div>
                       <label className="text-[10px] text-gray-500 ml-1">Plataforma</label>
                       <select 
                           value={investmentForm.platform} 
                           onChange={(e) => setInvestmentForm({ ...investmentForm, platform: e.target.value })} 
                           className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none"
                       >
                           <option value="" disabled>Seleccionar...</option>
                           {PLATFORM_OPTIONS.map(p => (
                               <option key={p} value={p} className="bg-gray-900">{p}</option>
                           ))}
                       </select>
                   </div>
                   <div>
                       <label className="text-[10px] text-gray-500 ml-1">Comisiones (Fees)</label>
                       <input 
                          type="number" 
                          placeholder="0.00" 
                          value={investmentForm.fees} 
                          onChange={(e) => setInvestmentForm({ ...investmentForm, fees: e.target.value })} 
                          className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none" 
                       />
                   </div>
              </div>
              
              {/* Wallet Deduction VISIBLE SWITCH */}
              <div className="bg-black/30 rounded-lg p-2 flex flex-col gap-2 mt-2">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1 ml-1">Origen de Fondos</p>
                  <div className="grid grid-cols-2 gap-2">
                      <button 
                          onClick={() => setInvestmentForm({ ...investmentForm, deductFromWallet: true })}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${investmentForm.deductFromWallet ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-[#0a0a10] border-white/5 text-gray-500 hover:border-white/20'}`}
                      >
                          <div className="flex items-center gap-1.5 mb-1">
                              <Wallet2 size={16} />
                              <span className="text-xs font-bold">Mi Bolsa</span>
                          </div>
                          <span className="text-[10px] font-mono">€{incomeBag.toFixed(2)}</span>
                      </button>

                      <button 
                          onClick={() => setInvestmentForm({ ...investmentForm, deductFromWallet: false })}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${!investmentForm.deductFromWallet ? 'bg-gray-600/20 border-gray-400 text-gray-200' : 'bg-[#0a0a10] border-white/5 text-gray-500 hover:border-white/20'}`}
                      >
                          <div className="flex items-center gap-1.5 mb-1">
                              <DollarSign size={16} />
                              <span className="text-xs font-bold">Externo</span>
                          </div>
                          <span className="text-[10px]">Otro Origen</span>
                      </button>
                  </div>
              </div>

              {/* Summary Preview */}
              {investmentForm.deductFromWallet && (
                  <div className="text-[10px] text-blue-200/70 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20 flex gap-2 items-center">
                      <AlertCircle size={14} className="shrink-0"/>
                      {inputMethod === 'receipt' ? (
                          <p>Se descontarán <span className="font-bold text-white">€{parseFloat(investTotalEUR || '0').toFixed(2)}</span> de tu bolsa. (Comisión incluida)</p>
                      ) : (
                          <p>Coste Total: <span className="font-bold text-white">€{((parseFloat(investmentForm.quantity || '0') * parseFloat(investmentForm.price || '0')) + (parseFloat(investmentForm.fees || '0'))).toFixed(2)}</span> (se descontará de tu bolsa).</p>
                      )}
                  </div>
              )}

              {/* Error Message Area */}
              {formError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-start gap-2">
                       <AlertCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                       <p className="text-xs text-rose-200">{formError}</p>
                  </div>
              )}

              <button 
                onClick={handleAddInvestment}
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-bold mt-1 flex justify-center items-center disabled:opacity-70"
              >
                 {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : "Registrar Inversión"}
              </button>
          </div>
      </GlassCard>

      {/* --- ASSETS LIST (FILTERED) --- */}
      <div>
        <SectionTitle>Mis Activos ({filteredInvestments.length})</SectionTitle>
        <div className="space-y-3">
            {filteredInvestments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                    No tienes activos en esta categoría.
                </div>
            ) : (
                filteredInvestments.map(inv => {
                    const currentValue = inv.quantity * (inv.currentPrice || inv.avgBuyPrice);
                    // Cost Basis includes fees
                    const costBasis = (inv.quantity * inv.avgBuyPrice) + (inv.fees || 0);
                    const isProfit = currentValue >= costBasis;
                    const percentChange = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;

                    return (
                        <div 
                          key={inv.id} 
                          onClick={() => setSelectedAsset(inv)}
                          className="relative group cursor-pointer"
                        >
                            {/* Glow Effect */}
                            <div className={`absolute -inset-0.5 bg-gradient-to-r ${inv.type === 'crypto' ? 'from-orange-600 to-amber-600' : 'from-blue-600 to-indigo-600'} rounded-2xl opacity-10 blur group-hover:opacity-40 transition duration-500`}></div>
                            
                            <div className="relative bg-[#0d1017] backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-3 transition-all shadow-lg">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${inv.type === 'crypto' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {inv.type === 'crypto' ? <Bitcoin size={20}/> : <Building2 size={20}/>}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white tracking-wide">{inv.symbol}</h4>
                                            {inv.platform && inv.platform !== 'N/A' ? (
                                                <p className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded w-fit mt-0.5 border border-white/5">{inv.platform}</p>
                                            ) : (
                                                <p className="text-xs text-gray-500">{inv.name}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-black text-lg tracking-tight">€{currentValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                        <p className={`text-xs font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isProfit ? '+' : ''}{percentChange.toFixed(2)}%
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center border-t border-white/5 pt-3">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                                        {inv.quantity.toFixed(4)} ud. • €{inv.avgBuyPrice.toFixed(2)}
                                    </p>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); deleteInvestment(inv.id); }} 
                                      className="text-gray-600 hover:text-rose-500 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"
                                    >
                                      <Trash2 size={14}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>

      {/* --- MODAL: CMC API Key --- */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
             <GlassCard className="w-full max-w-sm p-6 border-orange-500/20">
                 <div className="flex justify-between items-start mb-4">
                     <div>
                         <h3 className="text-lg font-bold text-white flex items-center gap-2">
                             <Globe size={18} className="text-blue-400"/> CoinMarketCap
                         </h3>
                         <p className="text-xs text-gray-400 mt-1">Sincroniza tu portfolio</p>
                     </div>
                     <button onClick={() => setShowApiModal(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                 </div>
                 <div className="space-y-4">
                     <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
                         <p className="text-[10px] text-orange-200 leading-relaxed">
                            <AlertCircle size={12} className="inline mr-1 mb-0.5"/>
                            La integración completa con la API de CoinMarketCap requiere un servidor dedicado. 
                            Por ahora, puedes introducir tu clave para funciones beta o usar el rastreo manual con precios de CoinGecko (ya activo).
                         </p>
                     </div>
                     <div>
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">CMC API Key</label>
                         <input 
                            type="text" 
                            placeholder="x-x-x-x" 
                            value={cmcKey} 
                            onChange={(e) => setCmcKey(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none"
                         />
                     </div>
                     <button onClick={() => setShowApiModal(false)} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-sm font-bold">
                         Guardar Configuración
                     </button>
                 </div>
             </GlassCard>
        </div>
      )}

      {/* Asset Details Modal */}
      {selectedAsset && (
          <AssetDetailModal 
              investment={selectedAsset} 
              onClose={() => setSelectedAsset(null)} 
              apiKey={finnhubKey}
          />
      )}
    </div>
  );
};