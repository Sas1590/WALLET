import React, { useState, useEffect, useMemo } from 'react';
import { 
  Cloud, Loader2, Home, TrendingUp, PlusCircle, CreditCard, 
  BarChart3, X, Edit3, Save, CalendarClock, CreditCard as CreditCardIcon, Repeat, AlertCircle, Trash2, Settings, Wallet
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps 
} from 'recharts';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, setDoc, getDoc, writeBatch, onSnapshot
} from "firebase/firestore";

// NEW IMPORTS
import { Transaction, Debt, PaidDebt, Investment, FormData, DebtForm, InvestmentForm, Category } from './types';
import { GlassCard, ConfirmModal, ActionButton } from './components/UI';

import { HomeTab } from './tabs/HomeTab';
import { InvestmentsTab } from './tabs/InvestmentsTab';
import { AddTab } from './tabs/AddTab';
import { DebtsTab } from './tabs/DebtsTab';
import { SettingsTab } from './tabs/SettingsTab';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCiwsBdFeIW9i5J7XACxMkxc3ujDLd-bzY",
  authDomain: "wallet-a40f3.firebaseapp.com",
  projectId: "wallet-a40f3",
  storageBucket: "wallet-a40f3.firebasestorage.app",
  messagingSenderId: "1039790146326",
  appId: "1:1039790146326:web:64d11bee61718494c28637"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FINNHUB_API_KEY: string = "d5rt1c1r01qj5oilvnl0d5rt1c1r01qj5oilvnlg"; 

// --- Constants: Default Categories ---
const DEFAULT_INCOME_CATS: Category[] = [
  { name: 'Salario', color: '#10b981' }, 
  { name: 'Freelance', color: '#3b82f6' }, 
  { name: 'Regalo', color: '#ec4899' }, 
  { name: 'B365', color: '#84cc16' }, 
  { name: 'Otros', color: '#9ca3af' }
];

const DEFAULT_EXPENSE_CATS: Category[] = [
  { name: 'Comida', color: '#f43f5e' }, 
  { name: 'Transporte', color: '#f97316' }, 
  { name: 'Casa', color: '#6366f1' }, 
  { name: 'Entretenimiento', color: '#8b5cf6' }, 
  { name: 'Servicios', color: '#06b6d4' }, 
  { name: 'Ropa', color: '#d946ef' }, 
  { name: 'Salud', color: '#ef4444' }, 
  { name: 'B365', color: '#84cc16' },
  { name: 'Deuda Bancaria', color: '#f43f5e' }, 
  { name: 'Suscripción/Fijo', color: '#f43f5e' }
];

// --- Price Service ---
const fetchStockPrice = async (symbol: string): Promise<number> => {
  const cleanSymbol = symbol.toUpperCase().trim();
  
  // 1. Check for Crypto using CoinGecko (Free, no key needed for simple prices)
  const cryptoMap: Record<string, string> = {
      'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'XRP': 'ripple', 
      'ADA': 'cardano', 'DOGE': 'dogecoin', 'DOT': 'polkadot', 'MATIC': 'matic-network',
      'LINK': 'chainlink', 'SHIB': 'shiba-inu', 'LTC': 'litecoin', 'AVAX': 'avalanche-2',
      'USDT': 'tether'
  };

  if (cryptoMap[cleanSymbol]) {
      try {
          const coinId = cryptoMap[cleanSymbol];
          const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur`);
          const data = await response.json();
          if (data[coinId] && data[coinId].eur) {
              return data[coinId].eur;
          }
      } catch (error) {
          console.warn(`Error fetching crypto price for ${cleanSymbol}, using fallback.`);
      }
  }

  // 2. Stocks via Finnhub
  if (FINNHUB_API_KEY && FINNHUB_API_KEY !== "TU_API_KEY_DE_FINNHUB_AQUI") {
      try {
          const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${cleanSymbol}&token=${FINNHUB_API_KEY}`);
          const data = await response.json();
          if (data.c && data.c > 0) return data.c;
      } catch (error) {
          console.warn(`Error fetching real price for ${cleanSymbol}, using fallback.`);
      }
  }

  // 3. Fallbacks
  const basePrices: Record<string, number> = {
    'AAPL': 175.50, 'TSLA': 180.20, 'MSFT': 405.00, 'GOOGL': 140.30, 'AMZN': 178.10,
    'NVDA': 850.00, 'BTC': 65400.00, 'ETH': 3450.00, 'SOL': 145.00, 'VUAA': 92.50,
    'VWCE': 115.20, 'TTWO': 155.00
  };
  const base = basePrices[cleanSymbol] || 100.00; 
  const variation = base * (Math.random() * 0.04 - 0.02);
  return base + variation;
};

export default function FinanceApp() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [chartView, setChartView] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [showCashFlow, setShowCashFlow] = useState(false); 
  const [formError, setFormError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Success Modal State
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 'networth' = Bolsa | 'investments' = Inversión | 'debt' = Deuda
  const [heroChartMode, setHeroChartMode] = useState<'networth' | 'investments' | 'debt'>('networth');
  
  // -- Data State --
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [paidDebts, setPaidDebts] = useState<PaidDebt[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [incomeBag, setIncomeBag] = useState<number>(0);

  // -- Category State with Colors --
  const [incomeCategories, setIncomeCategories] = useState<Category[]>(DEFAULT_INCOME_CATS);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>(DEFAULT_EXPENSE_CATS);

  // -- Edit Transaction State --
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editTxForm, setEditTxForm] = useState<FormData>({ type: 'expense', amount: '', category: '', description: '' });

  // -- Delete Debt State --
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);

  // -- Forms --
  const [formData, setFormData] = useState<FormData>({ type: 'expense', amount: '', category: 'Comida', description: '' });
  const [debtForm, setDebtForm] = useState<DebtForm>({ name: '', amount: '', creditor: '', type: 'personal', installmentAmount: '', nextPaymentDate: '', isRecurring: false });
  
  // -- INVESTMENT STATE --
  const [investmentForm, setInvestmentForm] = useState<InvestmentForm>({ 
    symbol: '', name: '', quantity: '', price: '', type: 'stock', deductFromWallet: true, platform: '', fees: '' 
  });
  const [investMode, setInvestMode] = useState<'qty' | 'amount'>('qty'); 
  const [investTotalEUR, setInvestTotalEUR] = useState<string>('');
  
  // Payment Modal State
  const [activePaymentDebt, setActivePaymentDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [editDebtForm, setEditDebtForm] = useState<DebtForm>({ name: '', amount: '', creditor: '', type: 'personal', installmentAmount: '', nextPaymentDate: '', isRecurring: false });

  // -- CATEGORY HANDLERS (PERSISTENT) --
  const handleAddCategory = async (type: 'income' | 'expense', name: string, color: string) => {
    const cleanName = name.trim();
    const newCat = { name: cleanName, color };
    let newCatsList: Category[] = [];

    if (type === 'income') {
      if (!incomeCategories.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) {
        newCatsList = [...incomeCategories, newCat];
        setIncomeCategories(newCatsList);
        // Persist to DB
        try {
           await setDoc(doc(db, "settings", "categories"), { income: newCatsList }, { merge: true });
        } catch (e) { console.error("Error saving category", e); }
      }
    } else {
      if (!expenseCategories.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) {
        newCatsList = [...expenseCategories, newCat];
        setExpenseCategories(newCatsList);
        // Persist to DB
        try {
           await setDoc(doc(db, "settings", "categories"), { expense: newCatsList }, { merge: true });
        } catch (e) { console.error("Error saving category", e); }
      }
    }
  };

  const handleRemoveCategory = async (type: 'income' | 'expense', name: string) => {
     let newCatsList: Category[] = [];
     if (type === 'income') {
       newCatsList = incomeCategories.filter(c => c.name !== name);
       setIncomeCategories(newCatsList);
       try {
           await setDoc(doc(db, "settings", "categories"), { income: newCatsList }, { merge: true });
        } catch (e) { console.error("Error removing category", e); }
     } else {
       newCatsList = expenseCategories.filter(c => c.name !== name);
       setExpenseCategories(newCatsList);
       try {
           await setDoc(doc(db, "settings", "categories"), { expense: newCatsList }, { merge: true });
        } catch (e) { console.error("Error removing category", e); }
     }
  };

  const handleMigrateLocalData = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      
      const localTransactions = JSON.parse(localStorage.getItem('violet_transactions') || '[]');
      const localDebts = JSON.parse(localStorage.getItem('violet_debts') || '[]');
      const localPaidDebts = JSON.parse(localStorage.getItem('violet_paidDebts') || '[]');
      const localIncomeBag = JSON.parse(localStorage.getItem('violet_incomeBag') || '0');
      
      const batch = writeBatch(db);
      
      // Migrate transactions
      localTransactions.forEach((tx: any) => {
        const { id, ...txData } = tx;
        const docRef = id ? doc(db, 'transactions', String(id)) : doc(collection(db, 'transactions'));
        batch.set(docRef, { ...txData, createdAt: txData.createdAt || new Date().toISOString() });
      });
      
      // Migrate debts
      localDebts.forEach((debt: any) => {
        const { id, ...debtData } = debt;
        const docRef = id ? doc(db, 'debts', String(id)) : doc(collection(db, 'debts'));
        batch.set(docRef, { ...debtData, createdAt: debtData.createdAt || new Date().toISOString() });
      });
      
      // Migrate paid debts
      localPaidDebts.forEach((debt: any) => {
        const { id, ...debtData } = debt;
        const docRef = id ? doc(db, 'paidDebts', String(id)) : doc(collection(db, 'paidDebts'));
        batch.set(docRef, { ...debtData, createdAt: debtData.createdAt || new Date().toISOString() });
      });
      
      // Update income bag
      const summaryRef = doc(db, 'wallet', 'summary');
      batch.set(summaryRef, { incomeBag: Number(localIncomeBag) }, { merge: true });
      
      await batch.commit();
      
      // Clear local storage after successful migration
      localStorage.removeItem('violet_transactions');
      localStorage.removeItem('violet_debts');
      localStorage.removeItem('violet_paidDebts');
      localStorage.removeItem('violet_incomeBag');
      
      // Refresh data
      window.location.reload();
      
    } catch (error: any) {
      console.error("Error migrating data:", error);
      if (error.message?.includes("Missing or insufficient permissions") || error.message?.includes("permissions")) {
        setFetchError("Error de Permisos al migrar: Ve a Firebase Console -> Firestore Database -> Reglas, y cambia a 'allow read, write: if true;'");
      } else {
        setFetchError(`Error al migrar datos: ${error.message || 'Error desconocido'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Ensure default category in forms is valid when categories change
  useEffect(() => {
    if (formData.type === 'income' && !incomeCategories.some(c => c.name === formData.category)) {
      setFormData(prev => ({ ...prev, category: incomeCategories[0]?.name || '' }));
    }
    if (formData.type === 'expense' && !expenseCategories.some(c => c.name === formData.category)) {
      setFormData(prev => ({ ...prev, category: expenseCategories[0]?.name || '' }));
    }
  }, [incomeCategories, expenseCategories, formData.type]);

  // -- AUTOMATIC PAYMENT LOGIC --
  const checkAndProcessAutoPayments = async (fetchedDebts: Debt[], currentBag: number, fetchedTransactions: Transaction[]) => {
      // ... (Existing logic) ...
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const batch = writeBatch(db);
      let updatesMade = false;
      let newBag = currentBag;
      let newTransactions = [...fetchedTransactions];
      let newDebts = [...fetchedDebts];

      for (let i = 0; i < newDebts.length; i++) {
          const debt = newDebts[i];
          if (debt.type === 'bank' && debt.nextPaymentDate && debt.installmentAmount) {
              let paymentDate = new Date(debt.nextPaymentDate);
              paymentDate.setHours(0, 0, 0, 0);
              const isDue = paymentDate <= today;
              const hasFunds = newBag >= debt.installmentAmount;
              const isFiniteAndRemaining = !debt.isRecurring && debt.amount > 0;
              const isRecurring = !!debt.isRecurring;

              if (isDue && hasFunds && (isFiniteAndRemaining || isRecurring)) {
                  updatesMade = true;
                  const payAmt = debt.installmentAmount;
                  newBag -= payAmt;
                  const nextMonthDate = new Date(paymentDate);
                  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
                  const nextMonthString = nextMonthDate.toISOString().split('T')[0];

                  const newTxRef = doc(collection(db, "transactions"));
                  const newTxData: any = {
                      type: 'expense',
                      amount: payAmt,
                      category: debt.isRecurring ? 'Suscripción/Fijo' : 'Deuda Bancaria',
                      date: new Date().toISOString().split('T')[0],
                      description: debt.isRecurring ? `Cuota Mensual: ${debt.name}` : `Pago Deuda: ${debt.name}`
                  };
                  batch.set(newTxRef, newTxData);
                  newTransactions.unshift({ id: newTxRef.id, ...newTxData });

                  const debtRef = doc(db, "debts", debt.id);
                  if (debt.isRecurring) {
                      batch.update(debtRef, { nextPaymentDate: nextMonthString });
                      newDebts[i] = { ...debt, nextPaymentDate: nextMonthString };
                  } else {
                      const newDebtAmount = debt.amount - payAmt;
                      if (newDebtAmount <= 0) {
                          const paidRef = doc(collection(db, "paidDebts"));
                          batch.set(paidRef, { ...debt, amount: debt.amount, paidDate: new Date().toISOString().split('T')[0] });
                          batch.delete(debtRef);
                          newDebts[i] = { ...debt, amount: 0 };
                      } else {
                          batch.update(debtRef, { amount: newDebtAmount, nextPaymentDate: nextMonthString });
                          newDebts[i] = { ...debt, amount: newDebtAmount, nextPaymentDate: nextMonthString };
                      }
                  }
              }
          }
      }

      if (updatesMade) {
          const walletRef = doc(db, "wallet", "summary");
          batch.set(walletRef, { incomeBag: newBag }, { merge: true });
          await batch.commit();
          setIncomeBag(newBag);
          setTransactions(newTransactions);
          setDebts(newDebts.filter(d => d.isRecurring || d.amount > 0));
      }
  };

  // -- Firebase Fetching with Safety Timeout --
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // --- TIMEOUT SAFETY: If data takes > 8s, stop loading ---
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 8000)
        );

        const dataPromise = (async () => {
            try {
                const catDoc = await getDoc(doc(db, "settings", "categories"));
                if (catDoc.exists()) {
                    const data = catDoc.data();
                    if (data.income) setIncomeCategories(data.income);
                    if (data.expense) setExpenseCategories(data.expense);
                } else {
                    await setDoc(doc(db, "settings", "categories"), { 
                        income: DEFAULT_INCOME_CATS,
                        expense: DEFAULT_EXPENSE_CATS
                    });
                }
            } catch (e) {
                console.warn("Could not fetch/set categories:", e);
            }

            let currentBag = 0;
            try {
                const walletDoc = await getDoc(doc(db, "wallet", "summary"));
                if (walletDoc.exists()) {
                  currentBag = walletDoc.data().incomeBag || 0;
                  setIncomeBag(currentBag);
                } else {
                  await setDoc(doc(db, "wallet", "summary"), { incomeBag: 0 });
                }
            } catch (e) {
                console.warn("Could not fetch/set wallet summary:", e);
            }
            
            try {
                const txQuery = query(collection(db, "transactions"));
                const txSnapshot = await getDocs(txQuery);
                const fetchedTxList = txSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
                
                // Sort in memory to avoid hiding docs without a date field
                fetchedTxList.sort((a, b) => {
                    const dateA = a.date ? new Date(a.date).getTime() : 0;
                    const dateB = b.date ? new Date(b.date).getTime() : 0;
                    return dateB - dateA;
                });
                
                setTransactions(fetchedTxList);
                
                const debtsSnapshot = await getDocs(collection(db, "debts"));
                const debtsList = debtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt));
                setDebts(debtsList);
                
                const paidDebtsSnapshot = await getDocs(collection(db, "paidDebts"));
                const paidDebtsList = paidDebtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaidDebt));
                setPaidDebts(paidDebtsList);
                
                const investmentsSnapshot = await getDocs(collection(db, "investments"));
                const invPromises = investmentsSnapshot.docs.map(async (doc) => {
                    const data = doc.data();
                    const price = await fetchStockPrice(data.symbol || 'USD');
                    return { id: doc.id, ...data, currentPrice: price } as Investment;
                });
                const invList = await Promise.all(invPromises);
                setInvestments(invList);
                
                await checkAndProcessAutoPayments(debtsList, currentBag, fetchedTxList);
            } catch (e: any) {
                console.error("Error fetching main data:", e);
                throw e; // Re-throw to be caught by the outer catch
            }
        })();

        // Race between data fetch and timeout
        await Promise.race([dataPromise, timeoutPromise]);

      } catch (error: any) {
        console.error("Error fetching data (or timeout):", error);
        if (error.message?.includes("Missing or insufficient permissions") || error.message?.includes("permissions")) {
          setFetchError("Error de Permisos: Ve a Firebase Console -> Firestore Database -> Reglas, y cambia a 'allow read, write: if true;'");
        } else {
          setFetchError(error.message || "Error fetching data");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const refreshPrices = async () => {
    setIsUpdatingPrices(true);
    try {
        const updatedInvestments = await Promise.all(investments.map(async (inv) => {
            const newPrice = await fetchStockPrice(inv.symbol);
            return { ...inv, currentPrice: newPrice };
        }));
        setInvestments(updatedInvestments);
    } catch (e) {
        console.error("Error refreshing prices", e);
    } finally {
        setIsUpdatingPrices(false);
    }
  };

  const updateIncomeBagInDb = async (newAmount: number) => {
    setIncomeBag(newAmount);
    try {
      await setDoc(doc(db, "wallet", "summary"), { incomeBag: newAmount }, { merge: true });
    } catch (e) {
      console.error("Error updating wallet", e);
    }
  };

  // -- Calculations --
  const totalDebts = debts.reduce((acc, d) => (d.isRecurring ? acc : acc + d.amount), 0);
  const totalInvestmentsValue = investments.reduce((acc, inv) => acc + (inv.quantity * (inv.currentPrice || inv.avgBuyPrice)), 0);
  // Adjusted: Include fees in total capital calculation to reflect true cost basis
  const totalInvestedCapital = investments.reduce((acc, inv) => acc + (inv.quantity * inv.avgBuyPrice) + (inv.fees || 0), 0);
  const netWorth = (incomeBag + totalInvestmentsValue) - totalDebts;

  const chartData = transactions.filter(t => t.type === 'expense').reduce((acc: any[], t) => {
    // ... same as before
    const existing = acc.find(item => item.name === t.category);
    if (existing) {
      existing.value += t.amount;
    } else {
      const catObj = expenseCategories.find(c => c.name === t.category);
      let color = '#6b7280';
      if (catObj) {
          color = catObj.color;
      } else {
          let hash = 0;
          for (let i = 0; i < t.category.length; i++) {
            hash = t.category.charCodeAt(i) + ((hash << 5) - hash);
          }
          const h = Math.abs(hash) % 360;
          color = `hsl(${h}, 70%, 60%)`;
      }
      acc.push({ name: t.category, value: t.amount, color: color });
    }
    return acc;
  }, []);

  const bankDebts = debts.filter(d => d.type === 'bank');
  const personalDebts = debts.filter(d => d.type !== 'bank');
  const COLORS = ['#8b5cf6', '#d946ef', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b'];

  const investmentPieData = useMemo(() => {
    return investments.map(inv => ({
        name: inv.symbol,
        value: inv.quantity * (inv.currentPrice || inv.avgBuyPrice)
    })).sort((a,b) => b.value - a.value);
  }, [investments]);

  const debtBarData = useMemo(() => {
    return debts.filter(d => !d.isRecurring).map(d => ({
        name: d.name,
        value: d.amount,
        color: '#f43f5e'
    })).sort((a,b) => b.value - a.value);
  }, [debts]);

  const netWorthHistoryData = useMemo(() => {
    interface Event { date: string; type: 'tx' | 'debtStart' | 'debtEnd'; amount: number; kind?: 'income' | 'expense'; }
    let events: Event[] = [];
    transactions.forEach(t => events.push({ date: t.date, type: 'tx', amount: t.amount, kind: t.type }));
    debts.forEach(d => !d.isRecurring && events.push({ date: d.date, type: 'debtStart', amount: d.amount }));
    paidDebts.forEach(d => !d.isRecurring && (events.push({ date: d.date, type: 'debtStart', amount: d.amount }), events.push({ date: d.paidDate, type: 'debtEnd', amount: d.amount })));
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (events.length === 0) return [];

    const dailyMap = new Map<string, number>();
    let wallet = 0, liability = 0;
    events.forEach(e => {
       if (e.type === 'tx') wallet += (e.kind === 'income' ? e.amount : -e.amount);
       else if (e.type === 'debtStart') liability += e.amount;
       else if (e.type === 'debtEnd') liability -= e.amount;
       dailyMap.set(e.date, wallet - liability);
    });

    const dates = Array.from(dailyMap.keys()).sort();
    const today = new Date();
    const result: any[] = [];
    const getBalanceAt = (targetDateStr: string) => {
        for (let i = dates.length - 1; i >= 0; i--) if (dates[i] <= targetDateStr) return dailyMap.get(dates[i]) || 0;
        return 0; 
    };
    // Chart View Logic
    if (chartView === 'daily') {
       for (let i = 29; i >= 0; i--) {
          const d = new Date(); d.setDate(today.getDate() - i);
          result.push({ name: d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit' }), value: getBalanceAt(d.toISOString().split('T')[0]) });
       }
    } else if (chartView === 'monthly') {
       for (let i = 0; i < 12; i++) {
          const d = new Date(today.getFullYear(), i + 1, 0);
          if (d > today && i > today.getMonth()) break; 
          result.push({ name: new Date(today.getFullYear(), i, 1).toLocaleString('es-ES', { month: 'short' }).toUpperCase(), value: getBalanceAt(d.toISOString().split('T')[0]) });
       }
    } else if (chartView === 'yearly') {
       const years = new Set<number>();
       events.forEach(e => years.add(new Date(e.date).getFullYear()));
       Array.from(years).sort().forEach(year => result.push({ name: year.toString(), value: getBalanceAt(`${year}-12-31`) }));
    }
    return result;
  }, [transactions, debts, paidDebts, chartView]);

  const gradientOffset = useMemo(() => {
    const dataMax = Math.max(...netWorthHistoryData.map((i) => i.value));
    const dataMin = Math.min(...netWorthHistoryData.map((i) => i.value));
    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;
    return dataMax / (dataMax - dataMin);
  }, [netWorthHistoryData]);

  // -- Handlers --
  
  const handleAddTransaction = async () => {
    // ... existing ...
    if (!formData.amount) return;
    setIsSubmitting(true);
    const amountVal = parseFloat(formData.amount);
    const newTxData = {
      type: formData.type, amount: amountVal, category: formData.category,
      date: new Date().toISOString().split('T')[0], description: formData.description || 'Sin descripción',
    };
    try {
      const docRef = await addDoc(collection(db, "transactions"), newTxData);
      const newTx: Transaction = { id: docRef.id, ...newTxData };
      setTransactions([newTx, ...transactions]);
      if (formData.type === 'income') await updateIncomeBagInDb(incomeBag + amountVal);
      setFormData({ type: 'expense', amount: '', category: expenseCategories[0]?.name || '', description: '' });
      setActiveTab('home');
    } catch (e) { console.error("Error adding transaction", e); } finally { setIsSubmitting(false); }
  };
  
  // ... other existing handlers (openEditTransaction, handleSaveEditTransaction, deleteTransaction, etc) ...
  // Re-declare for completeness of context in this file block if needed, but assuming standard replace.
  // Copying necessary ones to ensure file integrity.
  const openEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setEditTxForm({ type: tx.type, amount: tx.amount.toString(), category: tx.category, description: tx.description });
  };
  const handleSaveEditTransaction = async () => {
    if (!editingTx || !editTxForm.amount) return;
    setIsSubmitting(true);
    try {
      const newAmount = parseFloat(editTxForm.amount);
      const updates = { type: editTxForm.type, amount: newAmount, category: editTxForm.category, description: editTxForm.description, date: editingTx.date };
      let newBag = incomeBag;
      if (editingTx.type === 'income') newBag -= editingTx.amount; else newBag += editingTx.amount;
      if (editTxForm.type === 'income') newBag += newAmount; else newBag -= newAmount; 
      await updateDoc(doc(db, "transactions", editingTx.id), updates);
      if (newBag !== incomeBag) await updateIncomeBagInDb(newBag);
      setTransactions(transactions.map(t => t.id === editingTx.id ? { ...t, ...updates } : t));
      setEditingTx(null);
      setSuccessMessage("¡Transacción actualizada correctamente!");
    } catch (e) { console.error(e); setFormError("Error al guardar cambios"); } finally { setIsSubmitting(false); }
  };
  const deleteTransaction = async (id: string, type: 'income' | 'expense', amount: number) => {
    try {
      await deleteDoc(doc(db, "transactions", id));
      setTransactions(transactions.filter(t => t.id !== id));
      if (type === 'income') await updateIncomeBagInDb(incomeBag - amount); else await updateIncomeBagInDb(incomeBag + amount); 
    } catch (e) { console.error(e); }
  };
  const handlePaymentSubmit = async () => {
     if (!activePaymentDebt || !paymentAmount) return;
    setIsSubmitting(true);
    setFormError(null);
    const amountVal = parseFloat(paymentAmount);
    if (amountVal > incomeBag) { setFormError('⚠️ No tienes suficiente saldo.'); setIsSubmitting(false); return; }
    const newAmount = Math.max(0, activePaymentDebt.amount - amountVal);
    try {
      await updateIncomeBagInDb(incomeBag - amountVal);
      if (newAmount === 0 && !activePaymentDebt.isRecurring) {
        const paidDebtData = { ...activePaymentDebt, paidDate: new Date().toISOString().split('T')[0] };
        const paidDocRef = await addDoc(collection(db, "paidDebts"), paidDebtData);
        setPaidDebts([{ id: paidDocRef.id, ...paidDebtData } as PaidDebt, ...paidDebts]);
        await deleteDoc(doc(db, "debts", activePaymentDebt.id));
        setDebts(debts.filter(d => d.id !== activePaymentDebt.id));
      } else {
        await updateDoc(doc(db, "debts", activePaymentDebt.id), { amount: newAmount });
        setDebts(debts.map(d => d.id === activePaymentDebt.id ? { ...d, amount: newAmount } : d));
      }
      const newTxData = { type: 'expense' as const, amount: amountVal, category: activePaymentDebt.isRecurring ? 'Suscripción/Fijo' : 'Deuda Bancaria', date: new Date().toISOString().split('T')[0], description: `Pago Manual: ${activePaymentDebt.name}` };
      const txRef = await addDoc(collection(db, "transactions"), newTxData);
      setTransactions([{ id: txRef.id, ...newTxData }, ...transactions]);
      
      // NEW SUCCESS MESSAGE
      setSuccessMessage(`Pago realizado con éxito. Tu saldo y tu deuda se han reducido en €${amountVal.toFixed(2)}.`);
      
      setActivePaymentDebt(null); setPaymentAmount('');
    } catch (e) { console.error("Error paying debt", e); } finally { setIsSubmitting(false); }
  };
  const handleFetchCurrentPriceForForm = async () => {
     if (!investmentForm.symbol) return;
     const price = await fetchStockPrice(investmentForm.symbol);
     if (price > 0) setInvestmentForm(prev => ({ ...prev, price: price.toString() }));
  };
  // (Dependencies for effect)
  useEffect(() => {
    if (investMode === 'amount' && investTotalEUR && investmentForm.price) {
        const total = parseFloat(investTotalEUR);
        const price = parseFloat(investmentForm.price);
        if (total > 0 && price > 0) setInvestmentForm(prev => ({ ...prev, quantity: (total / price).toFixed(6) }));
    }
  }, [investTotalEUR, investmentForm.price, investMode]);

  const handleAddInvestment = async () => {
    setFormError(null);
    if (!investmentForm.symbol || !investmentForm.quantity || !investmentForm.price) { 
        setFormError("Completa símbolo, cantidad y precio."); return; 
    }
    setIsSubmitting(true);
    
    let quantityVal = parseFloat(investmentForm.quantity);
    let priceVal = parseFloat(investmentForm.price);
    let feesVal = parseFloat(investmentForm.fees) || 0; // Capture fees
    
    let buyCost = quantityVal * priceVal;
    let totalCost = buyCost + feesVal; // Total cost includes fees

    // IMPORTANT: If user used "Amount Mode" (or Receipt Mode), we trust the total EUR spent
    if (investMode === 'amount' && investTotalEUR) {
        const exactTotal = parseFloat(investTotalEUR);
        if (exactTotal > 0) { 
            // In receipt mode, exactTotal IS the money spent.
            // Fees are usually inclusive in total spent in exchange tickets (e.g. You spend 50, fee is 0.25 taken from that)
            // But we treat them as additive for cost basis unless specified otherwise.
            // For simplicity in this logic: Cost Basis = Total Spent.
            
            buyCost = exactTotal; // The total money gone
            totalCost = buyCost; // Total cost is what was spent

            // Recalculate quantity based on price if needed, OR recalculate Price based on Quantity (which is what happens in receipt mode)
            // In receipt mode, price is already implied.
        }
    }
    
    const cleanSymbol = investmentForm.symbol.toUpperCase().trim();
    
    if (investmentForm.deductFromWallet && totalCost > incomeBag) { 
        setFormError(`Fondos insuficientes (€${incomeBag.toFixed(2)}). Total Req: €${totalCost.toFixed(2)}`); 
        setIsSubmitting(false); 
        return; 
    }

    const newInvData = { 
        symbol: cleanSymbol, 
        name: investmentForm.name || cleanSymbol, 
        quantity: quantityVal, 
        avgBuyPrice: priceVal, 
        type: investmentForm.type,
        platform: investmentForm.platform || 'N/A', // Store platform
        fees: feesVal // Store fees
    };

    try {
        const batch = writeBatch(db);
        const invRef = doc(collection(db, "investments"));
        batch.set(invRef, newInvData);
        
        if (investmentForm.deductFromWallet) {
            batch.set(doc(db, "wallet", "summary"), { incomeBag: incomeBag - totalCost }, { merge: true });
            const txRef = doc(collection(db, "transactions"));
            // Description includes fees info
            const desc = feesVal > 0 
                ? `Compra ${newInvData.symbol} (Comisión: €${feesVal.toFixed(2)})`
                : `Compra ${newInvData.symbol}`;
                
            const newTx = { 
                type: 'expense' as const, 
                amount: totalCost, 
                category: 'Inversión', 
                date: new Date().toISOString().split('T')[0], 
                description: desc 
            };
            
            batch.set(txRef, newTx);
            setTransactions(prev => [{id: txRef.id, ...newTx} as Transaction, ...prev]);
            setIncomeBag(prev => prev - totalCost);
        }
        await batch.commit();
        
        const realPrice = await fetchStockPrice(cleanSymbol);
        setInvestments(prev => [...prev, { id: invRef.id, ...newInvData, currentPrice: realPrice } as Investment]);
        
        // Reset Form
        setInvestmentForm({ 
            symbol: '', name: '', quantity: '', price: '', type: 'stock', 
            deductFromWallet: true, platform: '', fees: '' 
        });
        setInvestTotalEUR(''); 
        setActiveTab('investments');
        
    } catch (e) { 
        console.error("Error adding investment", e); 
        setFormError("Error al guardar."); 
    } finally { 
        setIsSubmitting(false); 
    }
  };
  const deleteInvestment = async (id: string) => { try { await deleteDoc(doc(db, "investments", id)); setInvestments(prev => prev.filter(i => i.id !== id)); } catch (e) { console.error(e); } };
  const handleAddDebt = async () => {
    if (!debtForm.name) return;
    setIsSubmitting(true);
    const newDebtData = { name: debtForm.name, amount: debtForm.isRecurring ? 0 : parseFloat(debtForm.amount), creditor: debtForm.creditor || 'Desconocido', type: debtForm.type, installmentAmount: debtForm.type === 'bank' && debtForm.installmentAmount ? parseFloat(debtForm.installmentAmount) : null, nextPaymentDate: debtForm.type === 'bank' ? debtForm.nextPaymentDate : null, isRecurring: debtForm.isRecurring, date: new Date().toISOString().split('T')[0] };
    try { const docRef = await addDoc(collection(db, "debts"), newDebtData); setDebts([...debts, { id: docRef.id, ...newDebtData } as Debt]); setDebtForm({ name: '', amount: '', creditor: '', type: 'personal', installmentAmount: '', nextPaymentDate: '', isRecurring: false }); } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };
  const startEditDebt = (debt: Debt) => { setEditingDebtId(debt.id); setEditDebtForm({ name: debt.name, amount: debt.amount.toString(), creditor: debt.creditor, type: debt.type || 'personal', installmentAmount: debt.installmentAmount ? debt.installmentAmount.toString() : '', nextPaymentDate: debt.nextPaymentDate || '', isRecurring: !!debt.isRecurring }); };
  const saveEditDebt = async () => {
    if (!editDebtForm.name || !editingDebtId) return;
    const updates = { name: editDebtForm.name, amount: editDebtForm.isRecurring ? 0 : parseFloat(editDebtForm.amount), creditor: editDebtForm.creditor, type: editDebtForm.type, installmentAmount: editDebtForm.type === 'bank' && editDebtForm.installmentAmount ? parseFloat(editDebtForm.installmentAmount) : null, nextPaymentDate: editDebtForm.type === 'bank' ? editDebtForm.nextPaymentDate : null, isRecurring: editDebtForm.isRecurring };
    try { await updateDoc(doc(db, "debts", editingDebtId), updates); setDebts(debts.map(d => d.id === editingDebtId ? { ...d, ...updates } : d)); setEditingDebtId(null); } catch (e) { console.error(e); }
  };
  const confirmDeleteDebt = async () => { if (!debtToDelete) return; setIsSubmitting(true); try { await deleteDoc(doc(db, "debts", debtToDelete.id)); setDebts(debts.filter(d => d.id !== debtToDelete.id)); setDebtToDelete(null); } catch (e) { console.error(e); } finally { setIsSubmitting(false); } };
  const deletePaidDebt = async (id: string) => { try { await deleteDoc(doc(db, "paidDebts", id)); setPaidDebts(paidDebts.filter(d => d.id !== id)); } catch (e) { console.error(e); } };

  // ... (Loader) ...
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-violet-500">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="text-sm font-medium animate-pulse tracking-widest uppercase">Iniciando</p>
      </div>
    );
  }

  // Styles
  const inputClass = "w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-violet-500 focus:bg-white/[0.08] outline-none transition-all placeholder:text-gray-600";
  const labelClass = "text-[11px] text-gray-400 font-bold uppercase tracking-wider ml-1 mb-1.5 block";

  return (
    <div className="min-h-screen bg-[#000000] text-gray-100 font-sans selection:bg-violet-500/30 selection:text-white pb-28 relative overflow-hidden">
      
      {fetchError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md border border-red-400/50 flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-bold">{fetchError}</p>
          <button onClick={() => setFetchError(null)} className="p-1 hover:bg-white/20 rounded-md transition-colors"><X size={16} /></button>
        </div>
      )}

      {/* Removed VoiceAssistant */}

      {/* --- MESH GRADIENT BACKGROUND --- */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-900/30 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{animationDuration: '4s'}}/>
         <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-900/20 rounded-full blur-[100px] mix-blend-screen"/>
         <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-indigo-900/20 rounded-full blur-[80px] mix-blend-screen"/>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 px-6 py-4">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tighter text-white">
              Violet<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Wallet</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="px-5 pt-2 max-w-2xl mx-auto space-y-8 relative z-10">
        
        {activeTab === 'home' && (
          <HomeTab 
            netWorth={netWorth}
            showBalance={showBalance}
            setShowBalance={setShowBalance}
            incomeBag={incomeBag}
            totalInvestmentsValue={totalInvestmentsValue}
            totalInvestedCapital={totalInvestedCapital}
            totalDebts={totalDebts}
            heroChartMode={heroChartMode}
            setHeroChartMode={setHeroChartMode}
            setActiveTab={setActiveTab}
            chartView={chartView}
            setChartView={setChartView}
            netWorthHistoryData={netWorthHistoryData}
            investmentPieData={investmentPieData}
            debtBarData={debtBarData}
            gradientOffset={gradientOffset}
            COLORS={COLORS}
            transactions={transactions}
            openEditTransaction={openEditTransaction}
            deleteTransaction={deleteTransaction}
            chartData={chartData}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
          />
        )}

        {/* ... (Other Tabs Rendering: Investments, Add, Debts, Settings) ... */}
        {activeTab === 'investments' && (
          <InvestmentsTab 
            investments={investments}
            totalInvestmentsValue={totalInvestmentsValue}
            totalInvestedCapital={totalInvestedCapital}
            investmentForm={investmentForm}
            setInvestmentForm={setInvestmentForm}
            investMode={investMode}
            setInvestMode={setInvestMode}
            investTotalEUR={investTotalEUR}
            setInvestTotalEUR={setInvestTotalEUR}
            incomeBag={incomeBag}
            isUpdatingPrices={isUpdatingPrices}
            isSubmitting={isSubmitting}
            formError={formError}
            refreshPrices={refreshPrices}
            handleFetchCurrentPriceForForm={handleFetchCurrentPriceForForm}
            handleAddInvestment={handleAddInvestment}
            deleteInvestment={deleteInvestment}
            finnhubKey={FINNHUB_API_KEY}
          />
        )}

        {activeTab === 'add' && (
          <AddTab 
            formData={formData}
            setFormData={setFormData}
            handleAddTransaction={handleAddTransaction}
            isSubmitting={isSubmitting}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
          />
        )}

        {activeTab === 'debts' && (
          <DebtsTab 
            debts={debts}
            bankDebts={bankDebts}
            personalDebts={personalDebts}
            paidDebts={paidDebts}
            debtForm={debtForm}
            setDebtForm={setDebtForm}
            isSubmitting={isSubmitting}
            handleAddDebt={handleAddDebt}
            startEditDebt={startEditDebt}
            setDebtToDelete={setDebtToDelete}
            setActivePaymentDebt={setActivePaymentDebt}
            setFormError={setFormError}
            deletePaidDebt={deletePaidDebt}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab 
             incomeCategories={incomeCategories}
             expenseCategories={expenseCategories}
             onAddCategory={handleAddCategory}
             onRemoveCategory={handleRemoveCategory}
             onMigrateLocalData={handleMigrateLocalData}
          />
        )}

      </main>

      {/* --- MODALS (Edit Debt, Payment, Delete, CashFlow, Edit Tx) --- */}
      {/* (All existing modals follow, no changes needed for logic, just kept in structure) */}
      
      {editingDebtId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
           <GlassCard className="w-full max-w-[90vw] md:max-w-sm p-6 animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                   <Edit3 size={18} className="text-violet-400"/> Editar Deuda
                 </h3>
                 <button onClick={() => setEditingDebtId(null)} className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                   <X size={20} />
                 </button>
               </div>
               <div className="space-y-4">
                  <div>
                      <label className={labelClass}>Concepto</label>
                      <input className={inputClass} value={editDebtForm.name} onChange={(e) => setEditDebtForm({ ...editDebtForm, name: e.target.value })} />
                  </div>
                  {editDebtForm.type === 'bank' && (
                    <div className="flex items-center justify-between bg-fuchsia-500/10 p-3 rounded-xl border border-fuchsia-500/20">
                        <span className="text-xs text-fuchsia-200 font-bold flex items-center gap-2">{editDebtForm.isRecurring ? <Repeat size={14}/> : <CreditCardIcon size={14}/>}{editDebtForm.isRecurring ? 'Pago Recurrente' : 'Préstamo Finito'}</span>
                        <button onClick={() => setEditDebtForm({ ...editDebtForm, isRecurring: !editDebtForm.isRecurring })} className={`w-11 h-6 rounded-full relative transition-colors ${editDebtForm.isRecurring ? 'bg-fuchsia-500' : 'bg-white/10'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${editDebtForm.isRecurring ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                      {!editDebtForm.isRecurring && (<div><label className={labelClass}>Monto Total (€)</label><input type="number" className={inputClass} value={editDebtForm.amount} onChange={(e) => setEditDebtForm({ ...editDebtForm, amount: e.target.value })} /></div>)}
                      <div className={editDebtForm.isRecurring ? 'col-span-2' : ''}><label className={labelClass}>Acreedor</label><input className={inputClass} value={editDebtForm.creditor} onChange={(e) => setEditDebtForm({ ...editDebtForm, creditor: e.target.value })} /></div>
                  </div>
                  {editDebtForm.type === 'bank' && (
                      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 space-y-3">
                          <div className="flex items-center gap-2 mb-1"><CalendarClock size={16} className="text-fuchsia-400"/><p className="text-[10px] font-bold text-fuchsia-200 uppercase tracking-wider">Automático</p></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelClass}>Próxima Fecha</label><input type="date" className={inputClass} value={editDebtForm.nextPaymentDate} onChange={(e) => setEditDebtForm({ ...editDebtForm, nextPaymentDate: e.target.value })} /></div>
                            <div><label className={labelClass}>Cuota (€)</label><input type="number" className={inputClass} value={editDebtForm.installmentAmount} onChange={(e) => setEditDebtForm({ ...editDebtForm, installmentAmount: e.target.value })} /></div>
                          </div>
                      </div>
                  )}
                  <div className="pt-2"><ActionButton onClick={saveEditDebt} className="w-full">Guardar Cambios</ActionButton></div>
               </div>
           </GlassCard>
        </div>
      )}

      {activePaymentDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
           <GlassCard className="w-full max-w-[90vw] md:max-w-sm p-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-6">
                <div><h3 className="text-lg font-bold text-white">{activePaymentDebt.isRecurring ? "Adelantar Pago" : "Aportar Capital"}</h3><p className="text-gray-400 text-sm mt-0.5">Para: <span className="text-violet-300 font-semibold">{activePaymentDebt.name}</span></p></div>
                <button onClick={() => { setActivePaymentDebt(null); setPaymentAmount(''); setFormError(null); }} className="p-1 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-5 mb-6 border border-white/5 text-center">
                 <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{activePaymentDebt.isRecurring ? "Tipo de Gasto" : "Deuda Restante"}</p>
                 <p className="text-3xl font-black text-white flex items-center justify-center gap-2 tracking-tight">{activePaymentDebt.isRecurring ? <><Repeat size={24}/> Recurrente</> : `€${activePaymentDebt.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}</p>
              </div>
              <div className="space-y-4">
                 <div>
                    <label className={labelClass}>Cantidad a pagar (€)</label>
                    <div className="relative">
                        <input type="number" step="0.01" autoFocus value={paymentAmount} onChange={(e) => { setPaymentAmount(e.target.value); if(formError) setFormError(null); }} placeholder={activePaymentDebt.installmentAmount ? `${activePaymentDebt.installmentAmount}` : "0.00"} className={`${inputClass} text-lg font-semibold pl-8`} />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 text-right">Disponible: <span className={incomeBag >= parseFloat(paymentAmount || '0') ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>€{incomeBag.toFixed(2)}</span></p>
                 </div>
                 {formError && (<div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-1"><AlertCircle size={16} className="text-rose-500 mt-0.5 shrink-0" /><p className="text-xs text-rose-200">{formError}</p></div>)}
                 <ActionButton onClick={handlePaymentSubmit} disabled={isSubmitting || !paymentAmount} variant="success" className="w-full shadow-emerald-900/20">{isSubmitting ? <Loader2 className="animate-spin w-5 h-5"/> : "Confirmar Pago"}</ActionButton>
              </div>
           </GlassCard>
        </div>
      )}

      {debtToDelete && (
        <ConfirmModal 
            isOpen={!!debtToDelete}
            onClose={() => setDebtToDelete(null)}
            onConfirm={confirmDeleteDebt}
            title={`¿Eliminar ${debtToDelete.isRecurring ? "Suscripción" : "Deuda"}?`}
            message={`¿Estás seguro de que deseas eliminar "${debtToDelete.name}"? Esta acción no se puede deshacer.`}
            isDanger={true}
            confirmText="Sí, Eliminar"
        />
      )}

      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <GlassCard className="w-full max-w-[90vw] md:max-w-sm p-6 animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-white flex items-center gap-2"><Edit3 size={18} className="text-violet-400"/> Editar Transacción</h3><button onClick={() => setEditingTx(null)} className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><X size={20} /></button></div>
             <div className="space-y-4">
               <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
                <button onClick={() => setEditTxForm({ ...editTxForm, type: 'expense' })} className={`py-2 rounded-lg text-sm font-bold transition-all ${editTxForm.type === 'expense' ? 'bg-rose-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Gasto</button>
                <button onClick={() => setEditTxForm({ ...editTxForm, type: 'income' })} className={`py-2 rounded-lg text-sm font-bold transition-all ${editTxForm.type === 'income' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Ingreso</button>
              </div>
               <div><label className={labelClass}>Monto</label><input type="number" step="0.01" value={editTxForm.amount} onChange={(e) => setEditTxForm({ ...editTxForm, amount: e.target.value })} className={inputClass} /></div>
               <div><label className={labelClass}>Descripción</label><input type="text" value={editTxForm.description} onChange={(e) => setEditTxForm({ ...editTxForm, description: e.target.value })} className={inputClass} /></div>
               <div>
                  <label className={labelClass}>Categoría</label>
                  <div className="relative">
                    <select value={editTxForm.category} onChange={(e) => setEditTxForm({ ...editTxForm, category: e.target.value })} className={`${inputClass} appearance-none`}>
                      {editTxForm.type === 'income' ? (
                         incomeCategories.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)
                      ) : (
                         expenseCategories.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)
                      )}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
                  </div>
               </div>
               <div className="pt-2"><ActionButton onClick={handleSaveEditTransaction} disabled={isSubmitting} className="w-full">{isSubmitting ? <Loader2 className="animate-spin w-4 h-4"/> : <><Save size={18}/> Guardar Cambios</>}</ActionButton></div>
             </div>
          </GlassCard>
        </div>
      )}

      {/* iOS Style Floating Dock Navigation */}
      <nav className="fixed bottom-6 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
        <div className="pointer-events-auto bg-[#1a1a24]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-2 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)] flex items-center gap-1">
            
            {[
              { id: 'home', icon: Home, label: 'Inicio', activeColor: 'text-violet-400' },
              { id: 'investments', icon: TrendingUp, label: 'Inversión', activeColor: 'text-blue-400' },
              { id: 'add', icon: PlusCircle, label: '', isAction: true },
              { id: 'debts', icon: CreditCard, label: 'Deudas', activeColor: 'text-fuchsia-400' },
              { id: 'settings', icon: Settings, label: 'Ajustes', activeColor: 'text-white' }
            ].map((item) => {
              if (item.isAction) {
                return (
                  <button 
                    key={item.id}
                    onClick={() => setActiveTab(item.id)} 
                    className="mx-2 bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white p-3.5 rounded-full shadow-lg shadow-violet-500/40 hover:scale-105 active:scale-95 transition-transform"
                  >
                    <item.icon size={26} strokeWidth={2.5} />
                  </button>
                )
              }
              const isActive = activeTab === item.id;
              return (
                <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id)} 
                  className={`
                    relative px-4 py-2 rounded-2xl transition-all duration-300 flex flex-col items-center gap-1 group
                  `}
                >
                   {/* Spotlight Effect behind icon */}
                   {isActive && <div className="absolute inset-0 bg-white/[0.08] rounded-2xl -z-10" />}
                   
                   <item.icon 
                      size={24} 
                      strokeWidth={isActive ? 2.5 : 2} 
                      className={`transition-colors ${isActive ? item.activeColor : 'text-gray-500 group-hover:text-gray-400'}`} 
                   />
                </button>
              )
            })}
        </div>
      </nav>

      <ConfirmModal 
        isOpen={!!successMessage}
        onClose={() => setSuccessMessage(null)}
        title="¡Éxito!"
        message={successMessage || ""}
        isSuccess={true}
        showCancel={false}
        confirmText="Entendido"
      />
    </div>
  );
}