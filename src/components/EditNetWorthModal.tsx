import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Wallet, 
  TrendingUp, 
  Home, 
  Building2, 
  CreditCard, 
  Save, 
  CheckCircle2, 
  Lock,
  Sparkles
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { formatRupiah } from '../utils/calculations';
import { CurrencyInput } from './common/CurrencyInput';

interface EditNetWorthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditNetWorthModal: React.FC<EditNetWorthModalProps> = ({ isOpen, onClose }) => {
  const { netWorthData, portfolioAssets, updateNetWorth } = usePortal();

  // Hitung totalPortofolioRiil dari array portfolioAssets (jumlah seluruh marketValue)
  const calculatedPortofolioRiil = useMemo(() => {
    const assets = portfolioAssets || [];
    if (Array.isArray(assets) && assets.length > 0) {
      return assets.reduce((sum, item) => sum + (Number(item.marketValue) || 0), 0);
    }
    return 0;
  }, [portfolioAssets]);

  const hasRealPortfolio = calculatedPortofolioRiil > 0;

  const [kasLikuid, setKasLikuid] = useState<number>(netWorthData.kasLikuid ?? 1000000);
  const [investasi, setInvestasi] = useState<number>(
    hasRealPortfolio ? calculatedPortofolioRiil : (netWorthData.investasi ?? 1000000)
  );
  const [asetFisik, setAsetFisik] = useState<number>(netWorthData.asetFisik ?? 0);
  const [liabilitasKPR, setLiabilitasKPR] = useState<number>(netWorthData.liabilitasKPR ?? 0);
  const [utangLain, setUtangLain] = useState<number>(netWorthData.utangLain ?? 0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Synchronize modal state with live netWorthData & real portfolio whenever opened
  useEffect(() => {
    if (isOpen) {
      setKasLikuid(netWorthData.kasLikuid ?? 1000000);
      setInvestasi(hasRealPortfolio ? calculatedPortofolioRiil : (netWorthData.investasi ?? 1000000));
      setAsetFisik(netWorthData.asetFisik ?? 0);
      setLiabilitasKPR(netWorthData.liabilitasKPR ?? 0);
      setUtangLain(netWorthData.utangLain ?? 0);
    }
  }, [isOpen, netWorthData, hasRealPortfolio, calculatedPortofolioRiil]);

  // Live preview calculation: Net Worth = (kasLikuid + effectiveInvestasi + asetFisik) - totalLiabilitas
  const preview = useMemo(() => {
    const kas = Number(kasLikuid) || 0;
    const inv = hasRealPortfolio ? calculatedPortofolioRiil : (Number(investasi) || 0);
    const fisik = Number(asetFisik) || 0;
    const kpr = Number(liabilitasKPR) || 0;
    const utang = Number(utangLain) || 0;

    const totalAset = kas + inv + fisik;
    const totalLiabilitas = kpr + utang;
    const netWorth = totalAset - totalLiabilitas;

    return {
      kas,
      inv,
      fisik,
      kpr,
      utang,
      totalAset,
      totalLiabilitas,
      netWorth,
    };
  }, [kasLikuid, investasi, asetFisik, liabilitasKPR, utangLain, hasRealPortfolio, calculatedPortofolioRiil]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateNetWorth({
      kasLikuid: preview.kas,
      investasi: preview.inv,
      asetFisik: preview.fisik,
      liabilitasKPR: preview.kpr,
      utangLain: preview.utang,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 border border-[#E5E0D8] shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-[#FAF8F5] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="pb-4 border-b border-[#E5E0D8]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black tracking-wider uppercase text-[#1D6E66] bg-[#E8F7F5] px-2.5 py-0.5 rounded-full border border-[#32A89C]/20">
              Neraca Keuangan Real-Time
            </span>
          </div>
          <h2 className="text-xl font-black text-[#0F1A24] font-sans tracking-tight">
            Edit Komponen Aset & Liabilitas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Perbarui saldo aset likuid, investasi, aset properti fisik, dan saldo sisa utang riil Anda.
          </p>
        </div>

        {/* Live Calculation Box */}
        <div className="my-5 p-4 rounded-2xl bg-[#0F1A24] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#32A89C] block">
              Simulasi Kekayaan Bersih (Net Worth)
            </span>
            <span className="text-2xl font-black tracking-tight text-white block mt-0.5 font-sans tabular-nums">
              {formatRupiah(preview.netWorth)}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-sans">
            <div className="text-right">
              <span className="text-slate-400 text-[10px] block uppercase font-medium">Total Aset</span>
              <span className="font-bold text-emerald-400 tabular-nums">{formatRupiah(preview.totalAset)}</span>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-right">
              <span className="text-slate-400 text-[10px] block uppercase font-medium">Total Liabilitas</span>
              <span className="font-bold text-rose-400 tabular-nums">{formatRupiah(preview.totalLiabilitas)}</span>
            </div>
          </div>
        </div>

        {savedSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">Komponen Aset & Liabilitas Berhasil Diperbarui!</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Aset Likuid & Tabungan Bank */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-sans">
                <Wallet className="w-3.5 h-3.5 text-[#32A89C]" />
                Kas Likuid & Tabungan Bank
              </label>
              <span className="text-xs font-bold text-slate-700 tabular-nums font-sans">
                {formatRupiah(preview.kas)}
              </span>
            </div>
            <CurrencyInput
              value={kasLikuid}
              onChange={(val) => setKasLikuid(val)}
              placeholder="1.000.000"
              prefix="Rp"
              className="w-full py-2.5 pr-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none text-sm font-bold text-slate-900 font-sans tracking-tight transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Dana darurat, saldo rekening harian, dan kas likuid bebas risiko.
            </p>
          </div>

          {/* Portofolio Investasi */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-sans">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Portofolio Investasi (Saham, SBN, Reksadana)
              </label>
              <div className="flex items-center gap-2">
                {hasRealPortfolio && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Auto-Sync
                  </span>
                )}
                <span className="text-xs font-bold text-slate-700 tabular-nums font-sans">
                  {formatRupiah(preview.inv)}
                </span>
              </div>
            </div>
            <div className="relative">
              <CurrencyInput
                value={hasRealPortfolio ? calculatedPortofolioRiil : investasi}
                onChange={(val) => !hasRealPortfolio && setInvestasi(val)}
                placeholder="1.000.000"
                prefix="Rp"
                disabled={hasRealPortfolio}
                readOnly={hasRealPortfolio}
                className={`w-full py-2.5 pr-4 rounded-xl border text-sm font-bold text-slate-900 font-sans tracking-tight transition-all ${
                  hasRealPortfolio
                    ? 'bg-slate-100/90 border-slate-300 text-slate-700 cursor-not-allowed select-none shadow-inner'
                    : 'bg-[#FAF8F5] border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none'
                }`}
              />
              {hasRealPortfolio && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4 text-emerald-600" />
                </div>
              )}
            </div>

            {hasRealPortfolio ? (
              <div className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-semibold">
                <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Terkunci: Nilai ditarik otomatis secara real-time dari Buku Besar Jago Portofolio</span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">
                Portofolio reksa dana, saham, obligasi, deposito, & kas investasi aktif.
              </p>
            )}
          </div>

          {/* Aset Fisik & Personal */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-sans">
                <Home className="w-3.5 h-3.5 text-indigo-600" />
                Aset Fisik & Personal (Rumah, Kendaraan, Emas)
              </label>
              <span className="text-xs font-bold text-slate-700 tabular-nums font-sans">
                {formatRupiah(preview.fisik)}
              </span>
            </div>
            <CurrencyInput
              value={asetFisik}
              onChange={(val) => setAsetFisik(val)}
              placeholder="0"
              prefix="Rp"
              className="w-full py-2.5 pr-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none text-sm font-bold text-slate-900 font-sans tracking-tight transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Estimasi nilai pasar wajar properti, mobil, perhiasan emas, dan aset fisik lain.
            </p>
          </div>

          {/* Liabilitas KPR */}
          <div className="pt-2 border-t border-[#E5E0D8]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5 font-sans">
                <Building2 className="w-3.5 h-3.5 text-rose-600" />
                Sisa Pokok Liabilitas KPR / KPA
              </label>
              <span className="text-xs font-bold text-rose-700 tabular-nums font-sans">
                {formatRupiah(preview.kpr)}
              </span>
            </div>
            <CurrencyInput
              value={liabilitasKPR}
              onChange={(val) => setLiabilitasKPR(val)}
              placeholder="0"
              prefix="Rp"
              className="w-full py-2.5 pr-4 rounded-xl bg-[#FAF8F5] border border-rose-200 focus:border-rose-400 focus:bg-white focus:outline-none text-sm font-bold text-slate-900 font-sans tracking-tight transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Terhubung otomatis dengan simulasi modul KPR Restructuring.
            </p>
          </div>

          {/* Utang Konsumtif & Lainnya */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5 font-sans">
                <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                Utang Konsumtif & Lainnya (KKB, Paylater, CC, KTA)
              </label>
              <span className="text-xs font-bold text-rose-700 tabular-nums font-sans">
                {formatRupiah(preview.utang)}
              </span>
            </div>
            <CurrencyInput
              value={utangLain}
              onChange={(val) => setUtangLain(val)}
              placeholder="0"
              prefix="Rp"
              className="w-full py-2.5 pr-4 rounded-xl bg-[#FAF8F5] border border-rose-200 focus:border-rose-400 focus:bg-white focus:outline-none text-sm font-bold text-slate-900 font-sans tracking-tight transition-all"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-[#E5E0D8] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E5E0D8] text-xs font-bold text-slate-700 hover:bg-[#FAF8F5] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#32A89C]" />
              Simpan Perubahan Aset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditNetWorthModal;
