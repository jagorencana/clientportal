import React from 'react';
import { CurrencyPocketSummary } from '../../types/ledger';
import { AssetAvatar } from './AssetAvatar';
import {
  formatRate,
  getPocketTypeLabel,
  formatPocketBalance,
} from '../../utils/formatters';
import { GripVertical, ChevronRight } from 'lucide-react';

export interface PocketCardProps {
  pocket: CurrencyPocketSummary;
  index: number;
  isReorderingMode?: boolean;
  isBeingDragged?: boolean;
  isDragTarget?: boolean;
  onSelectPocket: (pocketId: string) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  onTouchCancel?: (e: React.TouchEvent) => void;
}

export const getCurrencyFlagOrIcon = (
  currencyOrPocket?: string | CurrencyPocketSummary | any,
  category?: string
): string => {
  if (!currencyOrPocket) return '💳';

  if (typeof currencyOrPocket !== 'string') {
    const p = currencyOrPocket;
    if (p.flag && typeof p.flag === 'string' && p.flag.trim().length > 0 && p.currency !== 'IDR' && p.currencyCode !== 'IDR') {
      return p.flag;
    }
    const curr = (p.currency || p.currencyCode || '').toUpperCase();
    if (curr === 'IDR') return '💰';
    if (curr === 'USD') return '🇺🇸';
    if (curr === 'EUR') return '🇪🇺';
    if (curr === 'JPY') return '🇯🇵';
    if (curr === 'GBP') return '🇬🇧';
    if (curr === 'SGD') return '🇸🇬';
    if (curr === 'AUD') return '🇦🇺';
    if (curr === 'CHF') return '🇨🇭';
    if (curr === 'CNY') return '🇨🇳';
    if (curr === 'MYR') return '🇲🇾';
    if (curr === 'HKD') return '🇭🇰';
    if (curr === 'SAR') return '🇸🇦';
    if (curr === 'XAU' || p.instrumentType === 'LOGAM_MULIA') return '🪙';
    if (p.instrumentType === 'ASET_FISIK') return '🏢';
    if (p.instrumentType === 'REKSADANA' || p.instrumentType === 'SAHAM_ETF') return '📈';
    return p.flag || '💳';
  }

  const curr = (currencyOrPocket || '').toUpperCase();
  if (curr === 'IDR') return '💰';
  if (curr === 'USD') return '🇺🇸';
  if (curr === 'EUR') return '🇪🇺';
  if (curr === 'JPY') return '🇯🇵';
  if (curr === 'GBP') return '🇬🇧';
  if (curr === 'SGD') return '🇸🇬';
  if (curr === 'AUD') return '🇦🇺';
  if (curr === 'CHF') return '🇨🇭';
  if (curr === 'CNY') return '🇨🇳';
  if (curr === 'MYR') return '🇲🇾';
  if (curr === 'HKD') return '🇭🇰';
  if (curr === 'SAR') return '🇸🇦';
  if (curr === 'XAU') return '🪙';
  if (category && (category.toLowerCase().includes('reksa') || category.toLowerCase().includes('saham'))) {
    return '📈';
  }
  return '💳';
};

export const PocketCard: React.FC<PocketCardProps> = ({
  pocket,
  index,
  isReorderingMode = false,
  isBeingDragged = false,
  isDragTarget = false,
  onSelectPocket,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
}) => {
  const pnlPercent = pocket.unrealizedPnlPercent;
  const displayName = pocket.name || pocket.currencyName;
  const custodianDisplay =
    pocket.defaultCustodian ||
    (pocket.currency === 'IDR' ? 'BCA / Jago / Cash' : 'CIMB Niaga');
  const categoryDisplay = getPocketTypeLabel(pocket.currency, pocket.instrumentType);
  const supportsManualValuation =
    pocket.instrumentType === 'LOGAM_MULIA' ||
    pocket.instrumentType === 'REKSADANA' ||
    pocket.instrumentType === 'SAHAM_ETF' ||
    pocket.instrumentType === 'SINKING_FUND' ||
    pocket.instrumentType === 'ASET_FISIK';

  return (
    <div
      data-pocket-index={index}
      draggable={isReorderingMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (isReorderingMode) return;
        onSelectPocket(pocket.pocketId);
      }}
      role={isReorderingMode ? undefined : 'button'}
      tabIndex={isReorderingMode ? -1 : 0}
      onKeyDown={(event) => {
        if (!isReorderingMode && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelectPocket(pocket.pocketId);
        }
      }}
      aria-label={`Buka rincian kantong ${displayName}`}
      className={`bg-white rounded-2xl p-4 border transition-all flex min-h-[220px] sm:min-h-[240px] flex-col justify-between w-full relative select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
        isReorderingMode
          ? 'cursor-grab active:cursor-grabbing border-slate-300 shadow-xs'
          : 'cursor-pointer border-slate-200/90 shadow-xs hover:border-emerald-500 hover:shadow-md active:scale-[0.98]'
      } ${
        isBeingDragged
          ? 'opacity-40 scale-95 border-dashed border-emerald-500 bg-emerald-50/20'
          : ''
      } ${
        isDragTarget
          ? 'border-emerald-400 ring-2 ring-emerald-100 bg-emerald-50/30 scale-[1.02] shadow-sm'
          : ''
      }`}
    >
      {/* Reordering Grip Bar (Hanya tampil saat Mode Atur Posisi aktif) */}
      {isReorderingMode && (
        <div
          className="pb-1.5 border-b border-slate-100 flex items-center justify-between text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center gap-1.5 text-slate-600 font-semibold select-none cursor-grab active:cursor-grabbing touch-none p-1 -m-1 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition"
            style={{ touchAction: 'none' }}
            title="Sentuh & tahan untuk geser posisi kantong"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchCancel}
          >
            <GripVertical className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-sans text-xs font-bold tabular-nums text-slate-500">#{index + 1}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium select-none">
            Geser Posisi
          </span>
        </div>
      )}

      {/* ZONA 1: HEADER (AVATAR, BADGE, RETURN PILL & IDENTITAS) */}
      <div>
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <AssetAvatar
              category={categoryDisplay}
              currency={pocket.currency}
              size="md"
            />
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] font-sans whitespace-nowrap shrink-0">
              {pocket.currency}
            </span>
          </div>

          {/* Return Pill */}
          {(pocket.currency !== 'IDR' || supportsManualValuation) &&
          ((pocket.totalCostBasisIdr || 0) > 0 || (pocket.balanceNative || 0) > 0) &&
          Math.abs(pnlPercent) >= 0.01 ? (
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold font-sans tabular-nums leading-none tracking-tight shrink-0 ${
                pnlPercent > 0
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : 'bg-rose-50 text-rose-600 border border-rose-100'
              }`}
            >
              {pnlPercent > 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
            </span>
          ) : (
            <div className="w-4 h-4 rounded-full flex items-center justify-center text-slate-300 group-hover:text-emerald-600 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <h4
            className="font-bold text-sm text-slate-800 leading-snug whitespace-normal break-words"
            title={displayName}
          >
            {displayName}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-snug whitespace-normal break-words">
            {custodianDisplay} {categoryDisplay ? `• ${categoryDisplay}` : ''}
          </p>
        </div>
      </div>

      {/* ZONA 2: SALDO TERSEDIA & EKUIVALEN RUPIAH */}
      <div className="my-auto py-1 border-y border-slate-50 flex flex-col justify-center">
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
          Saldo Tersedia
        </div>
        <div
          className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate font-sans tabular-nums leading-tight"
          title={String(pocket.balanceNative)}
        >
          {formatPocketBalance(
            pocket.balanceNative,
            pocket.currency,
            pocket.instrumentType,
            pocket.symbol
          )}
        </div>

        {/* Baris Konversi Rupiah */}
        <div className="h-4 mt-0.5 flex items-center">
          {pocket.currency !== 'IDR' || supportsManualValuation ? (
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 font-sans tabular-nums">
              ≈ Rp {Math.round(pocket.marketValueIdr || 0).toLocaleString('id-ID')}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">Kas Induk Rupiah</span>
          )}
        </div>
      </div>

      {/* ZONA 3: KURS SPOT & AVG (KOMPAK DI DASAR KARTU) */}
      <div className="mt-auto pt-1">
        {pocket.currency !== 'IDR' || supportsManualValuation ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-sans text-slate-500 tabular-nums">
            <span className="whitespace-nowrap">Avg: Rp {formatRate(pocket.averageBuyRate, pocket.currency)}</span>
            <span className="text-slate-300">•</span>
            <span className="whitespace-nowrap text-right">{supportsManualValuation ? 'NAB' : 'Spot'}: Rp {formatRate(pocket.currentMarketRate, pocket.currency)}</span>
          </div>
        ) : (
          <div className="px-2 py-1 bg-slate-50/60 rounded-lg flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400">
            <span>Nilai Tetap (1.0)</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              Buku Kas Aktif
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
