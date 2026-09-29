import React, { useState, useEffect } from 'react';
import { AssetPocket, CurrencyPocketSummary } from '../../types/ledger';
import { formatIdr, formatNative } from '../../utils/formatters';
import {
  computeRateToIdr,
  fetchUniversalCurrencyRates,
} from '../../services/currencyService';
import { getIsoCurrencyMeta } from '../../utils/ratesApi';
import {
  X,
  TrendingUp,
  RotateCcw,
  Check,
  Sparkles,
  RefreshCw,
  Radio,
  AlertCircle,
  Coins,
} from 'lucide-react';

interface MarketRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  pockets: AssetPocket[];
  rates: Record<string, number>;
  pocketSummaries: CurrencyPocketSummary[];
  onSaveRates: (newRates: Record<string, number>, newManualPrices?: Record<string, number>) => void;
}

export const MarketRateModal: React.FC<MarketRateModalProps> = ({
  isOpen,
  onClose,
  pockets,
  rates,
  pocketSummaries,
  onSaveRates,
}) => {
  const [formRates, setFormRates] = useState<Record<string, string>>({});
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [isFetchingLive, setIsFetchingLive] = useState(false);
  const [liveStatusText, setLiveStatusText] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initialForm: Record<string, string> = {};
      pockets.forEach((p) => {
        const code = (p.currencyCode || 'IDR').toUpperCase();
        if (code === 'IDR') {
          initialForm[code] = '1';
        } else {
          initialForm[code] = String(rates[code] || p.manualMarketPrice || 1);
        }
      });
      setFormRates(initialForm);
      setSavedFeedback(false);
      setFetchError(null);
    }
  }, [isOpen, pockets, rates]);

  if (!isOpen) return null;

  const handleRateChange = (curr: string, val: string) => {
    setFormRates((prev) => ({
      ...prev,
      [(curr || '').toUpperCase()]: val,
    }));
  };

  // Fetch Live Spot Rates for all 160+ currencies
  const handleFetchLiveBenchmark = async () => {
    setIsFetchingLive(true);
    setFetchError(null);

    try {
      const result = await fetchUniversalCurrencyRates();

      if (result.success && result.rawRates) {
        const updatedForm: Record<string, string> = { ...formRates };
        const updatedRates: Record<string, number> = {};
        const updatedManualPrices: Record<string, number> = {};

        pockets.forEach((p) => {
          const code = (p.currencyCode || 'IDR').toUpperCase();
          if (code === 'IDR') {
            updatedForm[code] = '1';
            updatedRates[code] = 1;
          } else if (p.instrumentType === 'LOGAM_MULIA' || code === 'XAU') {
            const price = parseFloat(formRates[code]) || p.manualMarketPrice || 1520000;
            updatedForm[code] = String(price);
            updatedRates[code] = price;
            updatedManualPrices[code] = price;
          } else if (p.instrumentType === 'REKSADANA' || code === 'CUSTOM') {
            const price = parseFloat(formRates[code]) || p.manualMarketPrice || 10000;
            updatedForm[code] = String(price);
            updatedRates[code] = price;
            updatedManualPrices[code] = price;
          } else {
            // Live FX rate via universal formula
            const liveRate = computeRateToIdr(code, result.rawRates);
            updatedForm[code] = String(liveRate);
            updatedRates[code] = liveRate;
          }
        });

        setFormRates(updatedForm);
        setLiveStatusText(
          `Terakhir diperbarui: ${result.timeString} WIB (Live Spot 160+ Valas)`
        );

        onSaveRates(updatedRates, updatedManualPrices);
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 2500);
      } else {
        setFetchError('Koneksi API gagal, menggunakan acuan default');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setFetchError('Gagal mengambil kurs online, beralih ke kurs tersimpan');
    } finally {
      setIsFetchingLive(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedRates: Record<string, number> = {};
    const updatedManualPrices: Record<string, number> = {};

    pockets.forEach((p) => {
      const code = p.currencyCode.toUpperCase();
      if (code === 'IDR') {
        updatedRates[code] = 1;
      } else {
        const val = Math.max(0, parseFloat(formRates[code]) || rates[code] || 1);
        updatedRates[code] = val;
        if (p.instrumentType === 'LOGAM_MULIA' || p.instrumentType === 'REKSADANA' || code === 'XAU' || code === 'CUSTOM') {
          updatedManualPrices[code] = val;
        }
      }
    });

    onSaveRates(updatedRates, updatedManualPrices);
    setSavedFeedback(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const nonIdrPockets = pockets.filter((p) => (p.currencyCode || '').toUpperCase() !== 'IDR');

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#32A89C] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Valuasi & Kurs Pasar
              </h2>
              <p className="text-xs text-slate-500">
                Kelola kurs spot 160+ valas dunia, spread retail bank, dan harga komoditas / NAV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Indicator Bar */}
        {liveStatusText && (
          <div className="mt-3.5 px-3 py-2 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 font-medium">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>{liveStatusText}</span>
            </div>
            <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full font-bold uppercase text-emerald-800">
              Live FX Active
            </span>
          </div>
        )}

        {fetchError && (
          <div className="mt-3.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {nonIdrPockets.map((pocket) => {
              const code = (pocket.currencyCode || 'VALAS').toUpperCase();
              const meta = getIsoCurrencyMeta(code);
              const summary = pocketSummaries.find(
                (p) =>
                  (p.pocketId && p.pocketId === pocket.id) ||
                  ((p.currency || '').toUpperCase() === code)
              );
              const balance = summary ? summary.balanceNative : 0;
              const inputVal = parseFloat(formRates[code]) || 0;
              const estimatedValuation = Math.round(balance * inputVal);
              const isCommodityOrFund =
                pocket.instrumentType === 'LOGAM_MULIA' ||
                pocket.instrumentType === 'REKSADANA' ||
                code === 'XAU' ||
                code === 'CUSTOM';

              return (
                <div
                  key={pocket.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 hover:border-slate-300 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-[140px]">
                    <span className="text-2xl leading-none">{pocket.flag || meta.flag}</span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{code}</span>
                        {isCommodityOrFund ? (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                            Manual / NAV
                          </span>
                        ) : (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-sans font-medium">
                            Live Spot FX
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                        {pocket.name}
                      </div>
                    </div>
                  </div>

                  {/* Saldo info */}
                  <div className="text-right hidden sm:block">
                    <div className="text-[11px] text-slate-500">Saldo Sisa</div>
                    <div className="text-xs font-sans tabular-nums font-semibold text-slate-700">
                      {formatNative(balance, code)}
                    </div>
                  </div>

                  {/* Rate Input */}
                  <div className="w-36 shrink-0">
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-xs text-slate-400 font-medium">
                        Rp
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={formRates[code] ?? ''}
                        onChange={(e) => handleRateChange(code, e.target.value)}
                        placeholder="Kurs IDR"
                        className="w-full pl-8 pr-2 py-1.5 text-xs font-sans tabular-nums font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#32A89C]/30 focus:border-[#32A89C]"
                      />
                    </div>
                    {balance > 0 && (
                      <div className="text-[10px] text-slate-500 mt-1 text-right font-sans tabular-nums truncate">
                        ≈ {formatIdr(estimatedValuation)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Fetch Action Panel */}
          <div className="p-3 bg-gradient-to-r from-teal-50/80 to-slate-50 rounded-xl border border-teal-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#32A89C] shrink-0" />
              <div>
                <span className="font-bold text-slate-800 block text-xs">
                  Mesin Valas 160+ Mata Uang Dunia
                </span>
                <span className="text-[11px] text-slate-500">
                  Sinkronisasi langsung dari Open ER-API (USD Base)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFetchLiveBenchmark}
              disabled={isFetchingLive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#32A89C] hover:bg-[#288a80] disabled:opacity-60 rounded-lg shadow-xs transition cursor-pointer self-end sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLive ? 'animate-spin' : ''}`} />
              <span>
                {isFetchingLive ? 'Menghubungkan...' : 'Sinkronkan Kurs Benchmark Terkini'}
              </span>
            </button>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              * Valuasi Net Worth & PnL dihitung otomatis
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#32A89C] hover:bg-[#278d82] active:scale-[0.98] rounded-lg shadow-xs transition cursor-pointer"
              >
                {savedFeedback ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Tersimpan!</span>
                  </>
                ) : (
                  <span>Simpan & Hitung Ulang</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
