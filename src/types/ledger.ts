export type CurrencyType = string;

export type TransactionType = 'CREDIT' | 'DEBET'; // CREDIT = Masuk/Beli/Saving, DEBET = Keluar/Expense/Tarik

export type InstrumentType =
  | 'CASH_VALAS'
  | 'LOGAM_MULIA'
  | 'REKSADANA'
  | 'SAHAM_ETF'
  | 'SINKING_FUND'
  | 'ASET_FISIK';

export interface AssetPocket {
  id: string;                  // Unique UUID/id (e.g. "pocket-cimb-chf" or "pocket-bca-idr-123")
  name: string;                // e.g. "Swiss Frank", "CIMB Niaga Valas (EUR)", "Emas Fisik Logam Mulia"
  currencyCode: string;        // e.g. "CHF", "USD", "EUR", "JPY", "CNY", "SGD", "XAU", "IDR"
  currency?: string;           // Compatibility with Google Sheets schema
  instrumentType: InstrumentType;
  category?: string;           // Compatibility with Google Sheets schema
  symbol: string;              // e.g. "CHF", "$", "€", "¥", "gr", "Unit", "Rp"
  flag: string;                // e.g. "🇨🇭", "🇺🇸", "🇯🇵", "🪙", "📈", "🇮🇩"
  defaultCustodian: string;    // e.g. "CIMB Niaga", "IBKR", "Bank Jago", "BCA", "Brankas", "Bibit"
  custodian?: string;          // Compatibility with Google Sheets schema
  accentColor: string;         // e.g. "teal", "blue", "emerald", "amber", "purple", "rose", "indigo"
  manualMarketPrice?: number;  // Used for Gold (XAU), Reksadana NAV, or manual overrides
  manualMarketRate?: number;   // Harga pasar / NAB manual per unit dalam IDR
  marketValue?: number;        // Total nilai pasar manual; menjadi override hingga user memperbaruinya
  marketValueNative?: number;  // Total nilai pasar dalam denominasi asli (mis. USD)
  marketValueCurrency?: string;// Mata uang marketValueNative
  lastPriceUpdatedAt?: string; // ISO timestamp pembaruan harga manual terakhir
  isDefault?: boolean;
  sortOrder?: number;          // Google Sheets sortOrder
  userEmail?: string;          // Google Sheets userEmail
  updatedAt?: string;          // Google Sheets updatedAt
  createdAt?: string;
}

// User-friendly interface alias
export type Pocket = AssetPocket;

export type CategoryType = 'ASSET_SAVING' | 'EXPENSE';

export interface BudgetCategory {
  id: string;
  name: string;
  type: CategoryType;          // ASSET_SAVING = Sinking Fund / Ekuitas, EXPENSE = Pengeluaran Riil
  description?: string;
  color?: string;
  isSystem?: boolean;
}

export type PosCategory = string;

export interface LedgerTransaction {
  id: string;
  pocketId: string;          // KUNCI UTAMA (FOREIGN KEY): Wajib menyimpan ID kantong tempat mutasi terjadi
  date: string;              // Format YYYY-MM-DD
  currency: CurrencyType;    // Currency code (e.g. "CHF", "USD", "JPY", "IDR", "XAU")
  posCategory: PosCategory;  // Category name / Pos
  description: string;       // Keterangan transaksi
  location: string;          // Kustodian / Bank / Tempat akun
  type: TransactionType;     // CREDIT (Masuk/In) | DEBET (Keluar/Out)
  nativeAmount: number;      // Nominal mata uang / unit
  exchangeRate: number;      // Kurs konversi (IDR per unit)
  costIdr: number;           // Nilai IDR = nativeAmount * exchangeRate
  amount?: number;           // Alias for nativeAmount
  rate?: number;             // Alias for exchangeRate
  totalIdr?: number;         // Alias for costIdr
  note?: string;             // Alias for notes / description
  notes?: string;
}

// User-friendly interface alias
export type Transaction = LedgerTransaction;

export interface CurrencyPocketSummary {
  pocketId: string;            // Unique pocket ID (Foreign Key matching AssetPocket.id)
  currency: CurrencyType;
  currencyName: string;
  name: string;                // Display name of the pocket (e.g. "Pendidikan Anak", "CIMB Niaga Valas (CHF)")
  symbol: string;
  flag: string;
  defaultCustodian?: string;
  instrumentType?: InstrumentType;
  accentColor?: string;
  totalCreditNative: number;
  totalDebetNative: number;
  balanceNative: number;       // Running saldo sisa native
  totalCostBasisIdr: number;   // Akumulasi modal beli bersih (IDR)
  averageBuyRate: number;      // Kurs rata-rata = totalCostBasisIdr / balanceNative
  currentMarketRate: number;   // Kurs pasar terkini
  manualMarketRate?: number;   // Harga pasar / NAB manual per unit dalam IDR
  manualMarketValue?: number;  // Total nilai pasar manual tersimpan
  manualMarketValueNative?: number;
  marketValueCurrency?: string;
  lastPriceUpdatedAt?: string; // ISO timestamp pembaruan harga manual terakhir
  marketValueIdr: number;      // balanceNative * currentMarketRate
  unrealizedPnlIdr: number;    // marketValueIdr - totalCostBasisIdr
  unrealizedPnlPercent: number;// (unrealizedPnlIdr / totalCostBasisIdr) * 100
}

export interface GlobalWealthSummary {
  totalNetWorthIdr: number;
  totalCostBasisIdr: number;
  totalUnrealizedPnlIdr: number;
  totalUnrealizedPnlPercent: number;
}

export interface DiscrepancyDetail {
  pocketId?: string;
  pocketName: string;
  currencyCode: string;
  symbol: string;
  flag: string;
  balanceNative: number;
  issueDescription: string;
}

export interface ReconciliationStatus {
  isSynced: boolean;
  discrepancyCount: number;
  discrepantPockets: string[];
  discrepancies: DiscrepancyDetail[];
}
