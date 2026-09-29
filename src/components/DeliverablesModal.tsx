import React from 'react';
import { FileText, FileSpreadsheet, Sparkles, ShieldCheck, Download, ExternalLink, Check, Copy, Lock, Zap, ArrowRight } from 'lucide-react';
import { M_FUND_INFO } from '../data/initialData';
import { ClientProfile } from '../types';

interface DeliverablesModalProps {
  type: 'checklist' | 'diagnostic' | 'sheet' | 'mfund' | null;
  onClose: () => void;
  client: ClientProfile;
  onOpenBookingModal?: () => void;
}

export const DeliverablesModal: React.FC<DeliverablesModalProps> = ({
  type,
  onClose,
  client,
  onOpenBookingModal,
}) => {
  if (!type || !['checklist', 'diagnostic', 'sheet', 'mfund'].includes(type)) return null;

  const isVip = Boolean(
    client?.tier && String(client.tier).toUpperCase().includes("VIP")
  );
  const isStarter = !isVip;
  const isLockedForStarter = isStarter && (type === 'sheet' || type === 'mfund');

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E0D8] shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F7F5] border border-[#32A89C]/30 text-[#1D6E66] flex items-center justify-center">
              {type === 'sheet' ? (
                <FileSpreadsheet className="w-4 h-4 text-[#32A89C]" />
              ) : type === 'mfund' ? (
                <Sparkles className="w-4 h-4 text-[#32A89C]" />
              ) : (
                <FileText className="w-4 h-4 text-[#32A89C]" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {type === 'checklist' && 'One-Page Action Checklist VIP'}
                {type === 'diagnostic' && 'Laporan Hasil Diagnostik Finansial'}
                {type === 'sheet' && 'Master Monthly Budgeting Spreadsheet'}
                {type === 'mfund' && 'Panduan Alokasi Kas Produktif M-Fund'}
              </h3>
              <p className="text-xs text-slate-500">Khusus Klien Terdaftar • Jago Rencana</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Content depending on tier lock & type */}
        {isLockedForStarter ? (
          <div className="mt-5 p-6 rounded-2xl bg-[#FAF8F5] border border-amber-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider mb-2">
                Eksklusif VIP Blueprint
              </span>
              <h4 className="text-base font-black text-slate-900">
                Modul Panduan & Template Terkunci
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                Akses template Master Spreadsheet dan panduan racikan instrumen M-Fund & SBN hanya tersedia untuk anggota VIP Blueprint OS.
              </p>
            </div>

            {onOpenBookingModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenBookingModal();
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>⚡ Upgrade ke VIP Blueprint (Rp 500.000)</span>
                <ArrowRight className="w-4 h-4 text-white/70" />
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 text-xs space-y-4">
            {type === 'sheet' && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] space-y-2">
                  <p className="font-bold text-slate-900 text-sm">
                    Template Spreadsheet 4-Bucket Jago Rencana
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Spreadsheet ini sudah dilengkapi formula otomasi cashflow harian, pencatatan sinking fund bulanan, dan tracker penurunan pokok KPR tahunan.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <a
                      href="https://docs.google.com/spreadsheets/d/1_sample_jago_rencana_blueprint/copy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 px-4 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white font-bold flex items-center gap-1.5 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#32A89C]" />
                      Salin ke Google Sheets Anda
                    </a>
                    <button
                      onClick={() => alert('Download template Excel .xlsx berhasil disimulasikan.')}
                      className="h-9 px-4 rounded-xl bg-white border border-[#D5CEBF] hover:border-[#32A89C] text-slate-700 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh Format Excel (.xlsx)
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#E8F7F5] border border-[#32A89C]/30 text-[#1D6E66]">
                  <p className="font-bold mb-1">Tips Pemakaian:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Update data pemasukan di sheet `01_Income_Setting`.</li>
                    <li>Kunci alokasi tabungan otomatis di tanggal gajian (tanggal 25/26).</li>
                  </ul>
                </div>
              </div>
            )}

            {type === 'mfund' && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#E8F7F5] border border-[#32A89C]/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-[#1D6E66]">{M_FUND_INFO.productName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-[#32A89C] text-white rounded">OJK Regulated</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {M_FUND_INFO.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8]">
                    <span className="text-slate-400 block text-[10px] font-bold">Imbal Hasil Bersih:</span>
                    <span className="font-black text-slate-900 text-sm">{M_FUND_INFO.annualYieldEstimate}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8]">
                    <span className="text-slate-400 block text-[10px] font-bold">Pajak Penghasilan:</span>
                    <span className="font-black text-[#1D6E66] text-sm">0% Bebas Pajak Final</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8]">
                    <span className="text-slate-400 block text-[10px] font-bold">Likuiditas Penarikan:</span>
                    <span className="font-bold text-slate-900">{M_FUND_INFO.liquidity}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8]">
                    <span className="text-slate-400 block text-[10px] font-bold">Mitra Sekuritas:</span>
                    <span className="font-bold text-slate-900">{M_FUND_INFO.provider}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#D5CEBF]">
                  <p className="font-bold text-slate-900 mb-1">Langkah Membuka Akun M-Fund:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                    <li>Buka aplikasi M-Stock / M-Fund via Mirae Asset Sekuritas.</li>
                    <li>Masukkan kode referral partner Jago Rencana: <strong className="text-slate-900">JAGORENCANA</strong>.</li>
                    <li>Pindahkan 3-6 bulan alokasi dana darurat dan sinking fund target pendek.</li>
                  </ol>
                </div>
              </div>
            )}

            {(type === 'checklist' || type === 'diagnostic') && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8]">
                  <p className="font-bold text-slate-900 text-sm mb-1">
                    {type === 'checklist' ? 'Checklist Aksi 30 Hari Klien' : 'Ringkasan Diagnostik Solvabilitas & Likuiditas'}
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Dokumen ini telah disinkronisasikan ke profil Anda ({client.name}, ID: {client.id}). Seluruh item aksi dapat langsung Anda centang di dashboard atau dicetak melalui tombol Cetak PDF.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-end">
              <button
                onClick={onClose}
                className="h-10 px-5 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
