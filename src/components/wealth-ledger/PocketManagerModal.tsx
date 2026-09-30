import React, { useState, useEffect } from 'react';
import { AssetPocket, InstrumentType, LedgerTransaction } from '../../types/ledger';
import { getIsoCurrencyMeta } from '../../utils/ratesApi';
import { getPocketTypeLabel } from '../../utils/formatters';
import { AssetAvatar } from './AssetAvatar';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Building,
  Info,
  Layers,
  Coins,
  TrendingUp,
  Landmark,
  Scale,
  Building2,
} from 'lucide-react';

interface PocketManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pockets: AssetPocket[];
  transactions: LedgerTransaction[];
  onSavePocket: (pocket: AssetPocket) => void;
  onDeletePocket: (pocketId: string) => Promise<boolean>;
  isDeletingPocket?: boolean;
}

type MainCategoryTab = 'CASH_VALAS' | 'INVESTMENT' | 'SINKING_FUND' | 'LOGAM_MULIA' | 'ASET_FISIK';

const POPULAR_VALAS = [
  { code: 'IDR', name: 'Rupiah', flag: '🇮🇩' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'KRW', name: 'Korean Won', flag: '🇰🇷' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
];

export const PocketManagerModal: React.FC<PocketManagerModalProps> = ({
  isOpen,
  onClose,
  pockets,
  transactions,
  onSavePocket,
  onDeletePocket,
  isDeletingPocket = false,
}) => {
  const [editingPocketId, setEditingPocketId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pocketToDelete, setPocketToDelete] = useState<{ pocket: AssetPocket; txCount: number } | null>(null);
  const [isConfirmDeleting, setIsConfirmDeleting] = useState(false);
  const deleteInProgress = isDeletingPocket || isConfirmDeleting;

  // Form states - Defaults to empty string
  const [mainCategory, setMainCategory] = useState<MainCategoryTab>('CASH_VALAS');
  const [name, setName] = useState('');
  const [valasCurrency, setValasCurrency] = useState('USD');
  const [investCurrencyBasis, setInvestCurrencyBasis] = useState<'IDR' | 'USD'>('IDR');
  const [investFormat, setInvestFormat] = useState<'IDR' | 'UNIT'>('IDR');
  const [custodian, setCustodian] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Helper untuk membersihkan dan mereset form ke kondisi awal kosong
  const resetForm = () => {
    setEditingPocketId(null);
    setMainCategory('CASH_VALAS');
    setValasCurrency('USD');
    setName('');
    setInvestCurrencyBasis('IDR');
    setInvestFormat('IDR');
    setCustodian('');
    setFormError(null);
  };

  // Reset form saat modal dibuka atau ditutup
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setIsFormOpen(false);
    }
  }, [isOpen]);

  const handleOpenAddForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    resetForm();
    setIsFormOpen(false);
  };

  const handleCloseModal = () => {
    resetForm();
    setIsFormOpen(false);
    onClose();
  };

  const handleOpenEditForm = (pocket: AssetPocket) => {
    setEditingPocketId(pocket.id);
    setName(pocket.name);
    setCustodian(pocket.defaultCustodian || '');
    setFormError(null);

    if (pocket.instrumentType === 'ASET_FISIK') {
      setMainCategory('ASET_FISIK');
    } else if (pocket.instrumentType === 'LOGAM_MULIA' || pocket.currencyCode === 'XAU') {
      setMainCategory('LOGAM_MULIA');
    } else if (pocket.instrumentType === 'SINKING_FUND') {
      setMainCategory('SINKING_FUND');
    } else if (
      pocket.instrumentType === 'REKSADANA' ||
      pocket.instrumentType === 'SAHAM_ETF' ||
      pocket.currencyCode === 'CUSTOM'
    ) {
      setMainCategory('INVESTMENT');
      setInvestCurrencyBasis(pocket.currencyCode.toUpperCase() === 'USD' ? 'USD' : 'IDR');
      setInvestFormat(pocket.symbol?.toLowerCase() === 'unit' ? 'UNIT' : 'IDR');
    } else {
      setMainCategory('CASH_VALAS');
      setValasCurrency(pocket.currencyCode.toUpperCase());
    }

    setIsFormOpen(true);
  };

  // Switch category handler - kosongkan jika sedang buat baru
  const handleSelectCategory = (cat: MainCategoryTab) => {
    setMainCategory(cat);
    setFormError(null);
    if (!editingPocketId) {
      setName('');
      setCustodian('');
    }
  };

  const handleSelectValas = (code: string) => {
    setValasCurrency(code);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Nama kantong aset wajib diisi.');
      return;
    }
    if (!custodian.trim()) {
      setFormError('Kustodian / Bank / Platform wajib diisi.');
      return;
    }

    let finalCurrencyCode = 'IDR';
    let finalInstrumentType: InstrumentType = 'CASH_VALAS';
    let finalSymbol = 'Rp';
    let finalFlag = '🇮🇩';

    if (mainCategory === 'CASH_VALAS') {
      finalCurrencyCode = valasCurrency.toUpperCase();
      finalInstrumentType = 'CASH_VALAS';
      const meta = getIsoCurrencyMeta(finalCurrencyCode);
      finalSymbol = meta.symbol;
      finalFlag = meta.flag;
    } else if (mainCategory === 'INVESTMENT') {
      finalCurrencyCode = investCurrencyBasis;
      finalInstrumentType = 'REKSADANA';
      finalFlag = '📈';
      finalSymbol = investFormat === 'UNIT' ? 'Unit' : (investCurrencyBasis === 'USD' ? '$' : 'Rp');
    } else if (mainCategory === 'SINKING_FUND') {
      finalCurrencyCode = 'IDR';
      finalInstrumentType = 'SINKING_FUND';
      finalSymbol = 'Rp';
      finalFlag = '🎯';
    } else if (mainCategory === 'LOGAM_MULIA') {
      finalCurrencyCode = 'XAU';
      finalInstrumentType = 'LOGAM_MULIA';
      finalSymbol = 'gr';
      finalFlag = '🪙';
    } else if (mainCategory === 'ASET_FISIK') {
      finalCurrencyCode = 'IDR';
      finalInstrumentType = 'ASET_FISIK';
      finalSymbol = 'Rp';
      finalFlag = '🏢';
    }

    const existingPocket = editingPocketId
      ? pockets.find((p) => p.id === editingPocketId)
      : undefined;
    const pocketData: AssetPocket = {
      id: editingPocketId || `pocket-${finalCurrencyCode.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      currencyCode: finalCurrencyCode,
      instrumentType: finalInstrumentType,
      category: ({
        CASH_VALAS: finalCurrencyCode === 'IDR' ? 'Kas & Tabungan Rupiah' : 'Kas Valas',
        LOGAM_MULIA: 'Logam Mulia',
        REKSADANA: 'Reksa Dana',
        SAHAM_ETF: 'Saham & ETF',
        SINKING_FUND: 'Sinking Fund',
        ASET_FISIK: 'Aset Fisik & Operasional',
      } as Record<InstrumentType, string>)[finalInstrumentType],
      symbol: finalSymbol,
      flag: finalFlag,
      defaultCustodian: custodian.trim(),
      accentColor: editingPocketId ? (pockets.find((p) => p.id === editingPocketId)?.accentColor || 'teal') : 'teal',
      // Nilai pasar diisi terpisah dari halaman detail sebagai total portofolio.
      manualMarketPrice: undefined,
      manualMarketRate: existingPocket?.manualMarketRate,
      marketValue: existingPocket?.marketValue,
      lastPriceUpdatedAt: existingPocket?.lastPriceUpdatedAt,
      isDefault: editingPocketId ? pockets.find((p) => p.id === editingPocketId)?.isDefault : false,
    };

    onSavePocket(pocketData);
    resetForm();
    setIsFormOpen(false);
  };

  const handleDelete = (pocket: AssetPocket) => {
    const txCount = transactions.filter((t) => t.pocketId === pocket.id).length;
    setPocketToDelete({ pocket, txCount });
  };

  const handleConfirmDelete = async () => {
    if (!pocketToDelete || deleteInProgress) return;
    const pocketId = pocketToDelete.pocket.id;
    setIsConfirmDeleting(true);
    try {
      await onDeletePocket(pocketId);
    } catch (error) {
      // Parent menampilkan toast; modal tetap harus dilepas oleh finally.
      console.warn('Penghapusan kantong gagal:', error);
    } finally {
      // Dialog harus selalu dapat ditutup, termasuk ketika request timeout/error.
      setIsConfirmDeleting(false);
      setPocketToDelete(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/80 text-[#32A89C] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Kelola Kantong Aset
              </h2>
              <p className="text-xs text-slate-500">
                Atur urutan, nama, dan parameter kantong portofolio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Action Toolbar */}
          {!isFormOpen && (
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-600">
                Total Terdaftar: <span className="font-bold text-slate-900">{pockets.length} Kantong</span>
              </div>
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#32A89C] hover:bg-[#288a80] rounded-xl shadow-xs transition cursor-pointer active:scale-[0.99]"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Kantong Aset Baru</span>
              </button>
            </div>
          )}

          {/* Form Card */}
          {isFormOpen ? (
            <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#32A89C]" />
                  <span>{editingPocketId ? 'Edit Konfigurasi Kantong' : 'Buat Kantong Aset Baru'}</span>
                </h3>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Tutup Form
                </button>
              </div>

              {formError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg flex items-center gap-1.5">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Peringatan Kunci Identitas Kantong Jika Ada Transaksi */}
              {editingPocketId && transactions.some((t) => t.pocketId === editingPocketId) && (
                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2">
                  <span className="text-base">🔒</span>
                  <span className="font-medium">
                    Mata uang dan jenis instrumen dikunci karena kantong telah memiliki riwayat transaksi.
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmitForm} className="space-y-5">
                {/* Langkah 1: Pilih Jenis Kantong (Radio Selector Terstruktur) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Langkah 1: Pilih Jenis Kantong
                    </label>
                    {editingPocketId && transactions.some((t) => t.pocketId === editingPocketId) && (
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                        Terkunci
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
                    {/* 1. Kas & Valas */}
                    <button
                      type="button"
                      disabled={Boolean(editingPocketId && transactions.some((t) => t.pocketId === editingPocketId))}
                      onClick={() => handleSelectCategory('CASH_VALAS')}
                      className={`text-left p-3 rounded-xl border transition ${
                        editingPocketId && transactions.some((t) => t.pocketId === editingPocketId)
                          ? 'opacity-60 cursor-not-allowed'
                          : 'cursor-pointer'
                      } ${
                        mainCategory === 'CASH_VALAS'
                          ? 'bg-white border-[#32A89C] shadow-xs ring-1 ring-[#32A89C]'
                          : 'bg-white/70 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Landmark className="w-4 h-4 text-[#32A89C]" />
                        <span className="text-xs font-bold text-slate-900">Kas & Valas</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Rekening bank valas (USD, EUR, CHF, JPY, IDR, dll)
                      </p>
                    </button>

                    {/* 2. Investasi & Portofolio */}
                    <button
                      type="button"
                      disabled={Boolean(editingPocketId && transactions.some((t) => t.pocketId === editingPocketId))}
                      onClick={() => handleSelectCategory('INVESTMENT')}
                      className={`text-left p-3 rounded-xl border transition ${
                        editingPocketId && transactions.some((t) => t.pocketId === editingPocketId)
                          ? 'opacity-60 cursor-not-allowed'
                          : 'cursor-pointer'
                      } ${
                        mainCategory === 'INVESTMENT'
                          ? 'bg-white border-[#32A89C] shadow-xs ring-1 ring-[#32A89C]'
                          : 'bg-white/70 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-slate-900">Investasi</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Saham, Reksadana, ETF, Portofolio Efek
                      </p>
                    </button>

                    {/* 3. Sinking Fund */}
                    <button
                      type="button"
                      disabled={Boolean(editingPocketId && transactions.some((t) => t.pocketId === editingPocketId))}
                      onClick={() => handleSelectCategory('SINKING_FUND')}
                      className={`text-left p-3 rounded-xl border transition ${
                        editingPocketId && transactions.some((t) => t.pocketId === editingPocketId)
                          ? 'opacity-60 cursor-not-allowed'
                          : 'cursor-pointer'
                      } ${
                        mainCategory === 'SINKING_FUND'
                          ? 'bg-white border-[#32A89C] shadow-xs ring-1 ring-[#32A89C]'
                          : 'bg-white/70 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base leading-none">🎯</span>
                        <span className="text-xs font-bold text-slate-900">Sinking Fund</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Pajak, servis, qurban, asuransi, liburan
                      </p>
                    </button>

                    {/* 4. Logam Mulia */}
                    <button
                      type="button"
                      disabled={Boolean(editingPocketId && transactions.some((t) => t.pocketId === editingPocketId))}
                      onClick={() => handleSelectCategory('LOGAM_MULIA')}
                      className={`text-left p-3 rounded-xl border transition ${
                        editingPocketId && transactions.some((t) => t.pocketId === editingPocketId)
                          ? 'opacity-60 cursor-not-allowed'
                          : 'cursor-pointer'
                      } ${
                        mainCategory === 'LOGAM_MULIA'
                          ? 'bg-white border-[#32A89C] shadow-xs ring-1 ring-[#32A89C]'
                          : 'bg-white/70 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Scale className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-slate-900">Logam Mulia</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Emas fisik batangan Antam / UBS
                      </p>
                    </button>

                    {/* 5. Aset Fisik & Operasional */}
                    <button
                      type="button"
                      disabled={Boolean(editingPocketId && transactions.some((t) => t.pocketId === editingPocketId))}
                      onClick={() => handleSelectCategory('ASET_FISIK')}
                      className={`text-left p-3 rounded-xl border transition ${
                        editingPocketId && transactions.some((t) => t.pocketId === editingPocketId)
                          ? 'opacity-60 cursor-not-allowed'
                          : 'cursor-pointer'
                      } ${
                        mainCategory === 'ASET_FISIK'
                          ? 'bg-white border-indigo-600 shadow-xs ring-1 ring-indigo-600'
                          : 'bg-white/70 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-900">Aset Fisik & Operasional</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Kendaraan armada rental, properti produktif, mesin & inventaris usaha
                      </p>
                    </button>
                  </div>
                </div>

                {/* Langkah 2: Field Input yang Bersih & Berlabel Jelas */}
                <div className="border-t border-slate-200/80 pt-4 space-y-4">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Langkah 2: Rincian Konfigurasi
                  </div>

                  {/* KONDISIONAL A: KAS & VALUTA ASING */}
                  {mainCategory === 'CASH_VALAS' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Pilihan Mata Uang Valas
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {POPULAR_VALAS.map((val) => (
                            <button
                              key={val.code}
                              type="button"
                              disabled={Boolean(editingPocketId && transactions.some((t) => t.pocketId === editingPocketId))}
                              onClick={() => handleSelectValas(val.code)}
                              className={`px-2.5 py-1 text-xs rounded-lg font-sans font-medium flex items-center gap-1.5 transition ${
                                editingPocketId && transactions.some((t) => t.pocketId === editingPocketId)
                                  ? 'opacity-60 cursor-not-allowed'
                                  : 'cursor-pointer'
                              } ${
                                valasCurrency === val.code
                                  ? 'bg-[#32A89C] text-white shadow-2xs font-bold'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span>{val.flag}</span>
                              <span>{val.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Kantong
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: CIMB Niaga Valas, Kas Operasional USD"
                            required
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#32A89C]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Kustodian / Bank
                          </label>
                          <input
                            type="text"
                            value={custodian}
                            onChange={(e) => setCustodian(e.target.value)}
                            placeholder="Contoh: CIMB Niaga, Bank Jago, BCA"
                            required
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#32A89C]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KONDISIONAL B: INVESTASI & PORTOFOLIO */}
                  {mainCategory === 'INVESTMENT' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Kantong
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Reksadana Indeks, Saham Dividen, ETF Global"
                            required
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#32A89C]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Kustodian / Platform
                          </label>
                          <input
                            type="text"
                            value={custodian}
                            onChange={(e) => setCustodian(e.target.value)}
                            placeholder="Contoh: Bibit, Bareksa, Mandiri Sekuritas, IBKR"
                            required
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#32A89C]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Basis Mata Uang
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={Boolean(editingPocketId && transactions.some((t) => t.pocketId === editingPocketId))}
                              onClick={() => setInvestCurrencyBasis('IDR')}
                              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition border ${
                                editingPocketId && transactions.some((t) => t.pocketId === editingPocketId)
                                  ? 'opacity-60 cursor-not-allowed'
                                  : 'cursor-pointer'
                              } ${
                                investCurrencyBasis === 'IDR'
                                  ? 'bg-[#32A89C] text-white border-[#32A89C]'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              🇮🇩 Rupiah (IDR)
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(editingPocketId && transactions.some((t) => t.pocketId === editingPocketId))}
                              onClick={() => setInvestCurrencyBasis('USD')}
                              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition border ${
                                editingPocketId && transactions.some((t) => t.pocketId === editingPocketId)
                                  ? 'opacity-60 cursor-not-allowed'
                                  : 'cursor-pointer'
                              } ${
                                investCurrencyBasis === 'USD'
                                  ? 'bg-[#32A89C] text-white border-[#32A89C]'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              🇺🇸 US Dollar (USD)
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Format Tampilan Saldo
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={Boolean(editingPocketId && transactions.some((t) => t.pocketId === editingPocketId))}
                              onClick={() => setInvestFormat('IDR')}
                              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition border ${
                                editingPocketId && transactions.some((t) => t.pocketId === editingPocketId)
                                  ? 'opacity-60 cursor-not-allowed'
                                  : 'cursor-pointer'
                              } ${
                                investFormat === 'IDR'
                                  ? 'bg-[#32A89C] text-white border-[#32A89C]'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Nominal Mata Uang (Rp)
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(editingPocketId && transactions.some((t) => t.pocketId === editingPocketId))}
                              onClick={() => setInvestFormat('UNIT')}
                              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition border ${
                                editingPocketId && transactions.some((t) => t.pocketId === editingPocketId)
                                  ? 'opacity-60 cursor-not-allowed'
                                  : 'cursor-pointer'
                              } ${
                                investFormat === 'UNIT'
                                  ? 'bg-[#32A89C] text-white border-[#32A89C]'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Unit Penyertaan (Unit)
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        Nilai pasar portofolio dapat diperbarui setelah kantong dibuat melalui halaman detail.
                      </p>
                    </div>
                  )}

                  {mainCategory === 'SINKING_FUND' && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-xs text-teal-900">
                        Dana cadangan untuk kebutuhan terencana dan tujuan khusus keluarga.
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Tujuan Dana</label>
                          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Pajak Tahunan, Qurban, Liburan" required className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#32A89C]" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Rekening / Tempat Penyimpanan</label>
                          <input type="text" value={custodian} onChange={(e) => setCustodian(e.target.value)} placeholder="Contoh: Bank Jago, BCA, Deposito" required className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#32A89C]" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KONDISIONAL C: LOGAM MULIA (EMAS FISIK) */}
                  {mainCategory === 'LOGAM_MULIA' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Kantong
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Emas Batangan Antam, Brankas Fisik"
                            required
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#32A89C]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Lokasi Penyimpanan
                          </label>
                          <input
                            type="text"
                            value={custodian}
                            onChange={(e) => setCustodian(e.target.value)}
                            placeholder="Contoh: Brankas Rumah, Safe Deposit Box, Pegadaian"
                            required
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#32A89C]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Satuan Ukur
                          </label>
                          <input
                            type="text"
                            disabled
                            value="Gram (gr) · Otomatis"
                            className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-semibold cursor-not-allowed"
                          />
                        </div>

                      </div>
                      <p className="text-[11px] text-slate-500">
                        Setelah kantong dibuat, masukkan total nilai pasar emas terkini melalui halaman detail kantong.
                      </p>
                    </div>
                  )}

                  {/* KONDISIONAL D: ASET FISIK & OPERASIONAL */}
                  {mainCategory === 'ASET_FISIK' && (
                    <div className="space-y-4">
                      {/* Edukasi Mutasi */}
                      <div className="bg-indigo-50/80 border border-indigo-200 p-3.5 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold text-indigo-900">Pedoman Mutasi Aset Fisik & Operasional:</p>
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            <span className="font-semibold text-emerald-700">• Mutasi Masuk (Kredit):</span> Penambahan unit armada/properti baru, akuisisi inventaris, atau Capex renovasi kapital.<br />
                            <span className="font-semibold text-rose-700">• Mutasi Keluar (Debet):</span> Depresiasi / beban penyusutan buku berkala, atau pelepasan/penjualan aset.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Kantong / Unit Aset
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Armada Rental Innova Zenix, Villa Ubud, Ruko Gandaria"
                            required
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Kustodian / Lokasi Aset
                          </label>
                          <input
                            type="text"
                            value={custodian}
                            onChange={(e) => setCustodian(e.target.value)}
                            placeholder="Contoh: Garasi Armada Labuan Bajo, Pool Pusat, Properti Bali"
                            required
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Mata Uang Pembukuan
                          </label>
                          <input
                            type="text"
                            disabled
                            value="🇮🇩 Rupiah (IDR) · Otomatis Terkunci"
                            className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-semibold cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Satuan & Nilai Valuasi
                          </label>
                          <input
                            type="text"
                            disabled
                            value="Nilai Buku Riil (IDR)"
                            className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-semibold cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold text-white bg-[#32A89C] hover:bg-[#288a80] rounded-xl shadow-xs transition cursor-pointer active:scale-[0.99]"
                    >
                      {editingPocketId ? 'Simpan Perubahan' : 'Buat Kantong Aset'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : null}

          {/* Pocket List Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Daftar Kantong Valas & Aset Aktif
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pockets.map((pocket) => {
                const txCount = transactions.filter((t) => t.pocketId === pocket.id).length;

                return (
                  <div
                    key={pocket.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <AssetAvatar
                            currency={pocket.currencyCode}
                            category={pocket.instrumentType}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-1.5 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900 leading-snug break-words">
                                {pocket.name}
                              </h4>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-slate-900 text-white shrink-0">
                                {pocket.currencyCode}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                              <Building className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{pocket.defaultCustodian}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(pocket)}
                            title="Edit Kantong"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(pocket)}
                            title={`Hapus Kantong ${pocket.name}`}
                            aria-label={`Hapus Kantong ${pocket.name}`}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-700" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          Kategori: <span className="font-medium text-slate-800">{getPocketTypeLabel(pocket.currencyCode, pocket.instrumentType)}</span>
                        </span>
                        <span className="text-slate-400 font-sans tabular-nums text-[11px]">
                          {txCount} Transaksi
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Kantong terhubung langsung ke mesin mutasi jurnal &amp; selector tab.</span>
          <button
            type="button"
            onClick={handleCloseModal}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl transition cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {pocketToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-100"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Hapus Kantong Aset?
              </h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan menghapus kantong <strong>{pocketToDelete.pocket.name}</strong> ({pocketToDelete.pocket.currencyCode}).
              <span className="block mt-2 text-rose-600 font-semibold">
                Menghapus kantong ini akan menghapus seluruh riwayat transaksi di dalamnya secara permanen. Lanjutkan?
              </span>
              <span className="block mt-1 text-slate-500">
                {pocketToDelete.txCount} transaksi terkait akan ikut dihapus.
              </span>
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPocketToDelete(null)}
                disabled={deleteInProgress}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteInProgress}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition cursor-pointer disabled:cursor-wait disabled:opacity-60"
              >
                {deleteInProgress ? 'Menghapus dari Sheets...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
