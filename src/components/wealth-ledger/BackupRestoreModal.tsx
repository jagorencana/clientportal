import React, { useState } from 'react';
import { AssetPocket, CurrencyType, LedgerTransaction } from '../../types/ledger';
import { exportLedgerToJson, parseImportJson } from '../../utils/storage';
import {
  X,
  Copy,
  Check,
  Upload,
  FileCode,
  Download,
  AlertCircle,
  FileSpreadsheet,
  RotateCcw,
} from 'lucide-react';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: LedgerTransaction[];
  marketRates: Record<CurrencyType, number>;
  pockets?: AssetPocket[];
  onImportSuccess: (
    transactions: LedgerTransaction[],
    rates?: Record<CurrencyType, number>,
    pockets?: AssetPocket[]
  ) => void;
  onReloadRemoteData: () => void;
  onExportCsv: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  transactions,
  marketRates,
  pockets,
  onImportSuccess,
  onReloadRemoteData,
  onExportCsv,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'csv'>('export');
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const exportedJsonString = exportLedgerToJson(transactions, marketRates, pockets);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportedJsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handleDownloadJsonFile = () => {
    const blob = new Blob([exportedJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jago-wealth-ledger-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportSuccessMsg(null);

    if (!importText.trim()) {
      setImportError('String JSON cadangan tidak boleh kosong.');
      return;
    }

    const result = parseImportJson(importText);
    if (!result.success || !result.transactions) {
      setImportError(result.error || 'Format data JSON tidak valid.');
      return;
    }

    onImportSuccess(result.transactions, result.marketRates, result.pockets);
    setImportSuccessMsg(
      `Berhasil memulihkan ${result.transactions.length} baris transaksi mutasi!`
    );
    setImportText('');
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Backup, Restore & Sinkronisasi JSON
              </h2>
              <p className="text-xs text-slate-500">
                Kelola pencadangan data mutasi buku besar dan kantong aset
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

        {/* Tab Controls */}
        <div className="flex items-center gap-1 border-b border-slate-200 mt-4">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-[#32A89C] text-[#32A89C]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Cadangan (Backup JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-[#32A89C] text-[#32A89C]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Impor Cadangan (Restore JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'csv'
                ? 'border-[#32A89C] text-[#32A89C]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Format Spreadsheet</span>
          </button>
        </div>

        {/* Tab 1: Export JSON */}
        {activeTab === 'export' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>
                String JSON data mutasi ({transactions.length} transaksi):
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadJsonFile}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .json</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#32A89C] text-white rounded-md font-semibold text-xs hover:bg-[#288a80] transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Data JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <textarea
              readOnly
              value={exportedJsonString}
              rows={10}
              className="w-full p-3 font-mono text-[11px] bg-slate-900 text-emerald-300 rounded-xl border border-slate-700 select-all focus:outline-none"
            />
            <p className="text-[11px] text-slate-500">
              💡 Tips: String ini mencakup seluruh transaksi, kantong aset & kurs acuan.
            </p>
          </div>
        )}

        {/* Tab 2: Import JSON */}
        {activeTab === 'import' && (
          <form onSubmit={handleImportSubmit} className="mt-4 space-y-3">
            <div className="text-xs text-slate-600">
              Tempelkan (paste) data string JSON transaksi yang sebelumnya telah diekspor:
            </div>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={8}
              placeholder='[{"id":"tx-1","date":"2026-04-12","currency":"CHF","description":"Top-Up Valas","location":"CIMB Niaga","type":"CREDIT","nativeAmount":500,"exchangeRate":18500,"costIdr":9250000}]'
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#32A89C]/30 focus:border-[#32A89C]"
            />

            {importError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#32A89C] text-white rounded-lg text-xs font-bold hover:bg-[#288a80] transition cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pulihkan & Terapkan Data</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: CSV Spreadsheet Format */}
        {activeTab === 'csv' && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-2">
              <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Format Standar CSV Jago Wealth Ledger</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Anda dapat mengunduh seluruh mutasi dalam format CSV yang kompatibel langsung dengan Microsoft Excel, Google Sheets, atau Apple Numbers.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onExportCsv();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File CSV Sekarang</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
              <div className="text-amber-800">
                <span className="font-bold">Muat ulang data?</span> Data layar akan dibaca ulang dari Google Sheets milik klien aktif tanpa membuat data contoh.
              </div>
              <button
                type="button"
                onClick={() => {
                  onReloadRemoteData();
                  onClose();
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Muat Ulang dari Sheets</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
