import React from 'react';
import { CurrencyWatchlistItem } from '../../services/currencyService';
import { AssetAvatar } from './AssetAvatar';
import { X } from 'lucide-react';

interface CurrencyWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: CurrencyWatchlistItem[];
  lastUpdated: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onSelectCurrency?: (currencyCode: string) => void;
}

export const CurrencyWatchlistModal: React.FC<CurrencyWatchlistModalProps> = ({
  isOpen,
  onClose,
  watchlist,
  lastUpdated,
  onSelectCurrency,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fx-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header: Bersih & Minimalis */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/80 text-[#32A89C] flex items-center justify-center font-bold text-base shadow-2xs">
              💱
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="fx-modal-title"
                  className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
                >
                  Kurs Valuta Asing (Live FX Benchmark)
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Live Pasar</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pembaruan per {lastUpdated || 'Hari ini'} &middot; Basis kuotasi terhadap Rupiah (IDR)
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              aria-label="Tutup Dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Header Tunggal + Grid 12-Kolom Anti-Tabrakan */}
        <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-5">
          {/* Header Kolom TUNGGAL (di luar map / looping) */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-xs z-10 grid grid-cols-12 px-4 py-2.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            <div className="col-span-6">Mata Uang</div>
            <div className="col-span-3 text-right">Kurs Beli</div>
            <div className="col-span-3 text-right">Kurs Jual</div>
          </div>

          {/* List Kurs Mata Uang (Single Loop, Bebas Header Ganda) */}
          <div className="divide-y divide-slate-100 max-h-[58vh] overflow-y-auto custom-scrollbar">
            {watchlist.map((item) => (
              <div
                key={item.code}
                onClick={() => {
                  if (onSelectCurrency) {
                    onSelectCurrency(item.code);
                    onClose();
                  }
                }}
                className="grid grid-cols-12 items-center px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                title={`Klik untuk buka kantong ${item.code} | Beli Rp ${item.formattedRate} · Jual Rp ${item.formattedSellRate}`}
              >
                {/* SISI KIRI: Avatar Bendera + Kode ISO + Nama Valas (Col-span 6) */}
                <div className="col-span-6 flex items-center gap-2.5 min-w-0 pr-2">
                  <AssetAvatar currency={item.code} size="md" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{item.code}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {item.name}
                    </div>
                  </div>
                </div>

                {/* SISI TENGAH: Kurs Beli Spot (Col-span 3) */}
                <div className="col-span-3 text-right font-sans font-semibold text-xs text-slate-800 tabular-nums">
                  Rp {item.formattedRate || item.rateToIdr.toLocaleString('id-ID')}
                </div>

                {/* SISI KANAN: Kurs Jual Estimasi (Col-span 3) */}
                <div className="col-span-3 text-right font-sans font-semibold text-xs text-slate-500 tabular-nums">
                  Rp {item.formattedSellRate || item.sellRateToIdr.toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>

          {/* Catatan Indikatif (For Reference Purposes Only) */}
          <div className="mt-4 px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-slate-500 text-[11px] leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <p>
              * Seluruh kurs bersifat <strong>indikatif sebagai acuan benchmark pasar spot (for reference purposes only)</strong>. Kurs eksekusi riil mengikuti spread kustodian/bank saat transaksi.
            </p>
            <span className="text-slate-400 font-sans shrink-0">Basis: Spot Mid-Rate</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-sans">
            {watchlist.length} Pasangan Valas Aktif Portofolio
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
