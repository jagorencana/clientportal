import React, { useState } from 'react';
import { CurrencyWatchlistItem } from '../../services/currencyService';
import { AssetAvatar } from './AssetAvatar';
import { RefreshCw, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';

interface CurrencyWatchlistWidgetProps {
  watchlist: CurrencyWatchlistItem[];
  lastUpdated: string;
  isLoading: boolean;
  onRefresh: () => void;
  onSelectCurrency?: (currencyCode: string) => void;
}

export const CurrencyWatchlistWidget: React.FC<CurrencyWatchlistWidgetProps> = ({
  watchlist,
  lastUpdated,
  isLoading,
  onRefresh,
  onSelectCurrency,
}) => {
  // State untuk expand / collapse khusus tampilan mobile (default 5 valas teratas)
  const [isExpanded, setIsExpanded] = useState(false);

  // Pembagian data untuk Desktop (2 Tabel Mandiri Berdampingan: 7 kiri & 7 kanan)
  const leftColumnItems = watchlist.slice(0, 7);
  const rightColumnItems = watchlist.slice(7, 14);

  // Data untuk Mobile (default 5 teratas, jika di-expand tampil seluruhnya)
  const mobileItems = isExpanded ? watchlist : watchlist.slice(0, 5);

  const renderCurrencyTable = (items: CurrencyWatchlistItem[]) => (
    <table className="w-full text-left border-collapse table-fixed">
      <thead>
        <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <th scope="col" className="text-left w-[35%] py-2 pl-0.5 font-medium">
            Mata Uang
          </th>
          <th scope="col" className="text-right w-[32%] py-2 font-medium">
            Kurs Beli (Spot)
          </th>
          <th scope="col" className="text-right w-[33%] py-2 pr-0.5 font-medium">
            Kurs Jual (Est)
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.code}
            onClick={() => onSelectCurrency && onSelectCurrency(item.code)}
            title={`1 ${item.code} = Beli Rp ${item.formattedRate} | Jual Rp ${item.formattedSellRate}`}
            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors cursor-pointer group"
          >
            {/* Kolom 1: Mata Uang (Rata Kiri w-[35%]) */}
            <td className="w-[35%] py-2.5 pl-0.5 text-left whitespace-nowrap align-middle">
              <div className="flex items-center gap-2">
                <AssetAvatar currency={item.code} size="sm" />
                <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 font-sans shrink-0">
                  {item.code}
                </span>
                <span className="font-bold text-slate-900 group-hover:text-[#32A89C] transition-colors text-xs truncate max-w-[80px] lg:max-w-[105px] xl:max-w-[135px]">
                  {item.name}
                </span>
              </div>
            </td>

            {/* Kolom 2: Kurs Beli Spot (Rata Kanan w-[32%]) */}
            <td className="w-[32%] py-2.5 text-right font-sans tabular-nums tracking-tight font-medium text-xs sm:text-sm text-slate-800 whitespace-nowrap align-middle">
              Rp {item.formattedRate}
            </td>

            {/* Kolom 3: Kurs Jual Est (Rata Kanan w-[33%]) */}
            <td className="w-[33%] py-2.5 pr-0.5 text-right font-sans tabular-nums tracking-tight font-medium text-xs sm:text-sm text-slate-700 whitespace-nowrap align-middle">
              Rp {item.formattedSellRate}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <section
      aria-label="Widget Kurs Mata Uang Ringkas"
      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 transition-all"
    >
      {/* 1. Header Widget ala myBCA / OCTO Mobile */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
              Kurs Mata Uang
            </h2>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* Sub-baris status live: Titik hijau berkedip ● Live dengan jam pembaruan */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mt-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-700 font-bold">Live</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 font-medium">
              {lastUpdated ? lastUpdated : 'Pasar Terkini'}
            </span>
          </div>
        </div>

        {/* Quick Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          title="Perbarui kurs live sekarang"
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#32A89C]' : ''}`}
          />
        </button>
      </div>

      {/* 2. Layout Desktop (md: ke atas) -> 2 Tabel Mandiri dengan Garis Pemisah Vertikal */}
      <div className="hidden md:grid md:grid-cols-2 gap-y-6 md:gap-x-12 mt-2">
        {/* Kolom Kiri: 7 Valas Pertama (USD, EUR, CHF, JPY, CNY, SGD, GBP) */}
        <div>{renderCurrencyTable(leftColumnItems)}</div>

        {/* Kolom Kanan: 7 Valas Berikutnya (AUD, KRW, HKD, THB, MYR, NZD, CAD) dengan Garis Pemisah Vertikal */}
        <div className="md:border-l md:border-slate-200/80 md:pl-10">
          {renderCurrencyTable(rightColumnItems)}
        </div>
      </div>

      {/* 3. Layout Mobile (Layar Handphone) -> 1 Kolom Ringkas */}
      <div className="block md:hidden mt-2">
        {renderCurrencyTable(mobileItems)}

        {/* Kontrol Hemat Ruang: Expand / Collapse Accordion khusus Mobile */}
        {watchlist.length > 5 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-2.5 mt-1.5 text-center text-xs font-semibold text-[#32A89C] hover:text-[#26857b] hover:bg-slate-50/80 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 active:scale-[0.99]"
          >
            {isExpanded ? (
              <>
                <span>Tampilkan Lebih Sedikit</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Lihat Valas Lainnya ({watchlist.length} Mata Uang)</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>

      {/* 4. Footer Keterangan Kecil */}
      <div className="pt-2.5 border-t border-slate-100 mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
        <span>
          Kurs per {lastUpdated ? lastUpdated : 'hari ini'}. Data benchmark pasar live interbank.
        </span>
        <span className="hidden sm:inline">14 Pasangan Valas Portofolio &middot; Basis IDR</span>
      </div>
    </section>
  );
};
