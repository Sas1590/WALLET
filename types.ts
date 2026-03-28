export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  description: string;
}

export interface Debt {
  id: string;
  name: string;
  amount: number;
  creditor: string;
  date: string;
  type?: 'personal' | 'bank'; 
  installmentAmount?: number;
  nextPaymentDate?: string;
  isRecurring?: boolean;
}

export interface PaidDebt extends Debt {
  paidDate: string;
}

export interface Investment {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice?: number;
  type: 'stock' | 'crypto' | 'etf';
  platform?: string;
  fees?: number;
}

export interface Category {
  name: string;
  color: string;
}

export interface FormData {
  type: 'income' | 'expense';
  amount: string;
  category: string;
  description: string;
}

export interface DebtForm {
  name: string;
  amount: string;
  creditor: string;
  type: 'personal' | 'bank';
  installmentAmount?: string;
  nextPaymentDate?: string;
  isRecurring: boolean;
}

export interface InvestmentForm {
  symbol: string;
  name: string;
  quantity: string;
  price: string;
  type: 'stock' | 'crypto' | 'etf';
  deductFromWallet: boolean;
  platform: string;
  fees: string;
}

// NEW TYPES FOR ASSET DETAILS
export interface StockCandles {
  c: number[]; // close prices
  t: number[]; // timestamps
  s: string;   // status
}

export interface CompanyProfile {
  name: string;
  logo: string;
  finnhubIndustry: string;
  currency: string;
  weburl: string;
}