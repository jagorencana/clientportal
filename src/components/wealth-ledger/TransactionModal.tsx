import React, { useState, useEffect, useMemo } from 'react';
import {
  AssetPocket,
  CurrencyType,
  LedgerTransaction,
  TransactionType,
} from '../../types/ledger';
import { AssetAvatar } from './AssetAvatar';
import { formatIdr, getPocketTypeLabel } from '../../utils/formatters';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  AlertCircle,
  Wallet,
} from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: LedgerTransaction) => void;
  editTransaction?: LedgerTransaction | null;
  defaultPocketId?: string;
  defaultCurrency?: CurrencyType;
  defaultType?: TransactionType;
  currentRates: Record<string, number>;
  pockets: AssetPocket[];
  transactions?: LedgerTransaction[];
  isScopedToPocket?: boolean;
}

/**
 * Format angka ke standar Indonesia (titik ribuan, koma desimal)
 * Contoh: 21636 -> "21.636" | 113.41 -> "113,41" | 13.08 -> "13,08"
 */
export function formatIdNumber(
  num: number,
  minDec: number = 0,
  maxDec: number = 4
): string {
  if (num === null || num === undefined || isNaN(num) || num === 0) return '';
  if (Number.isInteger(num)) {
    return num.toLocaleString('id-ID');
  }
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec,
  });
}

/**
 * Parse input string format Indonesia (atau standar) ke number murni
 * Membersihkan karakter pemisah ribuan dan karakter non-numerik lainnya secara aman
 */
export function parseIdNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) ? 0 : val;
  }
  const clean = String(val).trim();
  if (!clean) return 0;

  // Kasus 1: Mengandung titik ribuan dan koma desimal (contoh: "21.636,50" atau "1.520.000,25")
  if (clean.includes('.') && clean.includes(',')) {
    const sanitized = clean.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(sanitized.replace(/[^0-9.-]+/g, ''));
    return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  }

  // Kasus 2: Mengandung koma saja sebagai desimal (contoh: "113,41" atau "13,08")
  if (clean.includes(',')) {
    const sanitized = clean.replace(',', '.');
    const parsed = parseFloat(sanitized.replace(/[^0-9.-]+/g, ''));
    return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  }

  // Kasus 3: Mengandung titik ribuan tanpa koma desimal (contoh: "21.636" atau "1.520.000")
  if (/^\d{1,3}(\.\d{3})+$/.test(clean) || /^\d+\.\d{3}$/.test(clean)) {
    const parsed = parseFloat(clean.replace(/\./g, ''));
    return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  }

  // Kasus 4: Format desimal standar dengan titik (.) atau angka polos (contoh: "150000" atau "12.5")
  const parsed = parseFloat(clean.replace(/[^0-9.-]+/g, ''));
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
}

export function cleanNumericInput(input: any): number {
  if (typeof input === 'number') {
    return isNaN(input) || !isFinite(input) ? 0 : input;
  }
  return parseIdNumber(input);
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editTransaction,
  defaultPocketId,
  defaultCurrency = 'CHF',
  defaultType = 'CREDIT',
  currentRates,
  pockets,
  transactions = [],
}) => {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [date, setDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [nativeAmountStr, setNativeAmountStr] = useState<string>('');
  const [exchangeRateStr, setExchangeRateStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Identifikasi kantong aktif target transaksi (Pocket-Centric)
  const activePocket: AssetPocket =
    (editTransaction?.pocketId && pockets.find((p) => p.id === editTransaction.pocketId)) ||
    (defaultPocketId && pockets.find((p) => p.id === defaultPocketId)) ||
    (defaultCurrency &&
      pockets.find(
        (p) =>
          p.id === defaultCurrency ||
          (p.currencyCode || '').toUpperCase() === (defaultCurrency || '').toUpperCase()
      )) ||
    pockets[0];

  // Dynamic labels based on active pocket
  const isIdr = (activePocket?.currencyCode || '').toUpperCase() === 'IDR';
  const isGold =
    activePocket?.instrumentType === 'LOGAM_MULIA' ||
    (activePocket?.currencyCode || '').toUpperCase() === 'XAU';
  const isReksadanaOrCustom =
    activePocket?.instrumentType === 'REKSADANA' ||
    (activePocket?.currencyCode || '').toUpperCase() === 'CUSTOM';
  const isStockOrEtf = activePocket?.instrumentType === 'SAHAM_ETF';

  let unitLabel = `Nominal Aset (${activePocket?.currencyCode || 'VALAS'})`;
  let unitHelper = `Jumlah nominal transaksi ${activePocket?.name || ''}`;
  let rateLabel = `Nilai Kurs / Harga Akuisisi (Rp / unit)`;
  let rateHelper = `Kurs konversi per unit (spot live saat ini, dapat disesuaikan)`;

  if (isIdr) {
    unitLabel = 'Nominal Rupiah (Rp / IDR)';
    unitHelper = 'Jumlah mutasi dana dalam Rupiah';
    rateLabel = 'Nilai Kurs';
    rateHelper = 'Mata uang basis (tetap 1.0)';
  } else if (isGold) {
    unitLabel = 'Berat Emas (Gram)';
    unitHelper = 'Bobot gram emas batangan / logam mulia';
    rateLabel = 'Harga Akuisisi per Gram (Rp / gram)';
    rateHelper = 'Harga perolehan emas fisik per gram';
  } else if (isReksadanaOrCustom) {
    unitLabel = 'Jumlah Unit Penyertaan (NAB)';
    unitHelper = 'Jumlah unit kepemilikan reksadana / aset';
    rateLabel = 'Nilai per Unit (Rp / NAB)';
    rateHelper = 'Nilai Aktiva Bersih per unit saat transaksi';
  } else if (isStockOrEtf) {
    unitLabel = 'Jumlah Lembar Saham / ETF';
    unitHelper = 'Jumlah share kepemilikan instrumen';
    rateLabel = 'Harga Akuisisi per Lembar (IDR)';
    rateHelper = 'Harga acuan perolehan per lembar saham';
  }

  // Pre-fill form when editing or opening
  useEffect(() => {
    if (!isOpen) return;

    if (editTransaction) {
      setType(editTransaction.type);
      setDate(editTransaction.date);
      setDescription(editTransaction.description);
      setNativeAmountStr(formatIdNumber(editTransaction.nativeAmount, 0, 4));

      const r = editTransaction.exchangeRate;
      const dec = r < 1000 && !Number.isInteger(r) ? 2 : 0;
      setExchangeRateStr(formatIdNumber(r, dec, 4));
      setNotes(editTransaction.notes || '');
      setErrorMsg('');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setType(defaultType || 'CREDIT');
      setDescription('');
      setNativeAmountStr('');
      setNotes('');
      setErrorMsg('');

      if (activePocket) {
        const rawCode = (activePocket.currencyCode || 'IDR').toUpperCase();
        const rawRate =
          rawCode === 'IDR'
            ? 1
            : currentRates[rawCode] ||
              activePocket.manualMarketPrice ||
              1;
        const dec = rawRate < 1000 && !Number.isInteger(rawRate) ? 2 : 0;
        setExchangeRateStr(formatIdNumber(rawRate, dec, 4));
      }
    }
  }, [editTransaction, isOpen, defaultPocketId, defaultCurrency, defaultType, currentRates, activePocket]);

  // Hitung saldo terkini kantong aktif untuk proteksi overdraft
  const currentAvailableBalance = useMemo(() => {
    if (!activePocket) return 0;
    return transactions
      .filter(
        (t) =>
          (t.pocketId === activePocket.id ||
            (!t.pocketId && t.currency === activePocket.currencyCode)) &&
          (editTransaction ? t.id !== editTransaction.id : true)
      )
      .reduce(
        (acc, t) => (t.type === 'CREDIT' ? acc + t.nativeAmount : acc - t.nativeAmount),
        0
      );
  }, [transactions, activePocket, editTransaction]);

  // Auto-calculated preview IDR
  const cleanAmount = typeof nativeAmountStr === 'string'
    ? parseIdNumber(nativeAmountStr)
    : cleanNumericInput(nativeAmountStr);
  const cleanRate = isIdr
    ? 1
    : typeof exchangeRateStr === 'string'
    ? parseIdNumber(exchangeRateStr)
    : cleanNumericInput(exchangeRateStr);
  const cleanTotalIdr = Math.round(cleanAmount * cleanRate);
  const previewCostIdr = type === 'CREDIT' ? cleanTotalIdr : -cleanTotalIdr;

  // Validasi ketat overdraft (blokir penarikan jika nominal > saldo)
  const isOverdraft = type === 'DEBET' && cleanAmount > currentAvailableBalance;
  const overdraftError = isOverdraft
    ? `Penarikan melebihi saldo! Saldo tersedia: ${currentAvailableBalance.toLocaleString('id-ID')} ${activePocket?.currencyCode}`
    : '';

  // Status validasi form reaktif
  const isFormValid =
    Boolean(date) &&
    Boolean(description.trim()) &&
    cleanAmount > 0 &&
    (isIdr || cleanRate > 0) &&
    !isOverdraft;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!date) {
      setErrorMsg('Tanggal transaksi wajib diisi.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Keterangan / memo transaksi wajib diisi.');
      return;
    }

    const finalAmount = typeof nativeAmountStr === 'string'
      ? parseIdNumber(nativeAmountStr)
      : cleanNumericInput(nativeAmountStr);
    const finalRate = isIdr
      ? 1
      : typeof exchangeRateStr === 'string'
      ? parseIdNumber(exchangeRateStr)
      : cleanNumericInput(exchangeRateStr);

    if (isNaN(finalAmount) || finalAmount <= 0) {
      setErrorMsg(`${unitLabel} harus lebih besar dari 0.`);
      return;
    }
    if (!isIdr && (isNaN(finalRate) || finalRate <= 0)) {
      setErrorMsg('Nilai kurs / harga perolehan harus lebih besar dari 0.');
      return;
    }

    // Integritas Buku Besar: Blokir transaksi overdraft
    if (type === 'DEBET' && finalAmount > currentAvailableBalance) {
      setErrorMsg(
        `Penarikan melebihi saldo! Saldo tersedia: ${currentAvailableBalance.toLocaleString('id-ID')} ${activePocket?.currencyCode}`
      );
      return;
    }

    const finalTotalIdr = Math.round(finalAmount * finalRate);
    const finalCostIdr = type === 'CREDIT' ? finalTotalIdr : -finalTotalIdr;

    const custodian =
      activePocket?.defaultCustodian ||
      (isIdr ? 'BCA / Jago / Cash' : 'CIMB Niaga');

    const tx: LedgerTransaction = {
      id: editTransaction ? editTransaction.id : `tx-${Date.now()}`,
      pocketId: activePocket.id, // Mandatory Foreign Key to active pocket
      date,
      currency: activePocket.currencyCode,
      posCategory: activePocket.name,
      description: description.trim(),
      location: custodian,
      type,
      nativeAmount: finalAmount,
      exchangeRate: finalRate,
      costIdr: finalCostIdr,
      amount: finalAmount,
      rate: finalRate,
      totalIdr: finalCostIdr,
      note: description.trim(),
      notes: notes.trim() || undefined,
    };

    onSave(tx);
    onClose();
  };

  if (!isOpen) return null;

  const custodianDisplay =
    activePocket?.defaultCustodian ||
    (isIdr ? 'BCA / Jago / Cash' : 'CIMB Niaga');
  const categoryDisplay = getPocketTypeLabel(
    activePocket?.currencyCode,
    activePocket?.instrumentType
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8">
        {/* Header Modal Bersih & Kontekstual */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {editTransaction ? 'Ubah Transaksi' : 'Catat Mutasi Kantong'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Buku besar pencatatan perpetual &middot; Moving average cost
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Info Kantong Aktif (Otomatis & Terkunci - Pocket-Centric) */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AssetAvatar
              currency={activePocket?.currencyCode || 'IDR'}
              category={activePocket?.instrumentType}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-slate-900 truncate">
                  {activePocket?.name}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-800 font-sans text-[11px] font-bold">
                  {activePocket?.currencyCode}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                <span className="font-medium text-slate-700">{custodianDisplay}</span>
                <span>&middot;</span>
                <span>{categoryDisplay}</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-[10px] text-slate-400 font-medium">Saldo Buku Besar:</div>
            <div className="text-xs font-bold font-sans tabular-nums text-slate-800">
              {currentAvailableBalance.toLocaleString('id-ID')} {activePocket?.currencyCode}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 1. Jenis Mutasi (Masuk vs Keluar) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Jenis Mutasi
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setType('CREDIT');
                  setErrorMsg('');
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  type === 'CREDIT'
                    ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>Masuk / Top Up (Credit)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('DEBET');
                  setErrorMsg('');
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  type === 'DEBET'
                    ? 'bg-white text-rose-700 shadow-xs border border-rose-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Keluar / Tarik (Debet)</span>
              </button>
            </div>
          </div>

          {/* 2. Tanggal Transaksi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Transaksi
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#32A89C]"
            />
          </div>

          {/* 3. Keterangan / Memo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan / Memo
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Misal: Beli valas bulanan, Tabungan rutin, Dividen, Belanja online..."
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#32A89C]"
            />
          </div>

          {/* 4. Nominal Aset & Nilai Kurs / Harga Akuisisi (2 Kolom Bersih) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {unitLabel}
                </label>
                {type === 'DEBET' && (
                  <span className="text-[10px] text-slate-500 font-sans tabular-nums">
                    Maks: {currentAvailableBalance.toLocaleString('id-ID')}
                  </span>
                )}
              </div>
              <input
                type="text"
                inputMode="decimal"
                min="0.000001"
                value={nativeAmountStr}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  setNativeAmountStr(e.target.value);
                  setErrorMsg('');
                }}
                onBlur={() => {
                  if (nativeAmountStr) {
                    const parsed = parseIdNumber(nativeAmountStr);
                    if (parsed > 0) {
                      setNativeAmountStr(formatIdNumber(parsed, 0, 4));
                    }
                  }
                }}
                placeholder="0,00"
                required
                className={`w-full px-3 py-2 text-xs font-sans font-bold tabular-nums border rounded-lg text-slate-900 focus:bg-white focus:outline-hidden ${
                  isOverdraft
                    ? 'bg-rose-50 border-rose-300 text-rose-900 focus:border-rose-500'
                    : 'bg-slate-50 border-slate-200 focus:border-[#32A89C]'
                }`}
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {unitHelper}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {rateLabel}
              </label>
              <input
                type="text"
                inputMode="decimal"
                min="0.000001"
                disabled={isIdr}
                value={isIdr ? '1' : exchangeRateStr}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => setExchangeRateStr(e.target.value)}
                onBlur={() => {
                  if (!isIdr && exchangeRateStr) {
                    const parsed = parseIdNumber(exchangeRateStr);
                    if (parsed > 0) {
                      const dec = parsed < 1000 && !Number.isInteger(parsed) ? 2 : 0;
                      setExchangeRateStr(formatIdNumber(parsed, dec, 4));
                    }
                  }
                }}
                placeholder="0"
                required
                className={`w-full px-3 py-2 text-xs font-sans font-bold tabular-nums border rounded-lg text-slate-900 focus:outline-hidden ${
                  isIdr
                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-[#32A89C]'
                }`}
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {rateHelper}
              </span>
            </div>
          </div>

          {/* Peringatan Overdraft Inline Merah */}
          {isOverdraft && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{overdraftError}</span>
            </div>
          )}

          {/* 5. Ekuivalen Total IDR (Kalkulasi Otomatis) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#32A89C]" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">
                  Total Nilai Ekuivalen Rupiah (IDR):
                </div>
                <div className="text-sm font-black text-slate-900 font-sans tabular-nums">
                  {formatIdr(cleanTotalIdr)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`text-xs px-2.5 py-1 rounded-md font-bold font-sans ${
                  type === 'CREDIT'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {type === 'CREDIT' ? '+ Masuk' : '- Keluar'}
              </span>
            </div>
          </div>

          {/* 6. Catatan Tambahan (Opsional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: No referensi transfer, fee bank, catatan belanja..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#32A89C]"
            />
          </div>

          {/* Pesan Error Validasi Tambahan */}
          {errorMsg && !isOverdraft && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="px-5 py-2 text-xs font-bold text-white bg-[#32A89C] hover:bg-[#288a80] rounded-xl shadow-xs transition cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editTransaction ? 'Simpan Perubahan' : 'Catat ke Jurnal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
