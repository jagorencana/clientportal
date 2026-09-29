import React, { useState } from 'react';
import { PhoneCall, Calendar, MessageSquare, ShieldCheck, Send, ExternalLink, Video } from 'lucide-react';
import { ClientProfile } from '../types';

interface TanyaAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientProfile;
}

export const TanyaAdvisorModal: React.FC<TanyaAdvisorModalProps> = ({
  isOpen,
  onClose,
  client,
}) => {
  const [topic, setTopic] = useState<'kpr' | 'budgeting' | 'sinking' | 'mfund' | 'general'>('kpr');
  const [question, setQuestion] = useState('');
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleWhatsAppRedirect = () => {
    const text = encodeURIComponent(
      `Halo Tim Advisor Jago Rencana, saya ${client.name} (Client ID: ${client.id}). Saya ingin berdiskusi mengenai topik: ${topic.toUpperCase()}.\n\nPertanyaan/Kebutuhan:\n${question || 'Saya ingin follow-up rekomendasi blueprint finansial.'}`
    );
    window.open(`https://wa.me/6281806988868?text=${text}`, '_blank');
  };

  const handleScheduleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E0D8] shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F7F5] border border-[#32A89C]/30 text-[#1D6E66] flex items-center justify-center">
              <PhoneCall className="w-4 h-4 text-[#32A89C]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Tanya Wealth Advisor Desk
              </h3>
              <p className="text-xs text-slate-500">
                Jago Rencana Private Wealth Advisory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Quick Direct WhatsApp Button */}
          <div className="p-4 rounded-xl bg-[#E8F7F5] border border-[#32A89C]/30 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold text-[#1D6E66]">
                Direct WhatsApp Advisor
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Konsultasi instan & tanggapan cepat pada jam kerja (09:00 - 18:00 WIB).
              </p>
            </div>
            <button
              onClick={handleWhatsAppRedirect}
              className="h-9 px-4 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#32A89C]" />
              Chat WhatsApp
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#E5E0D8]"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Atau Ajukan Jadwal Sesi Lanjutan
            </span>
            <div className="flex-grow border-t border-[#E5E0D8]"></div>
          </div>

          <form onSubmit={handleScheduleRequest} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Topik Diskusi Utama
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value as any)}
                className="h-10 w-full rounded-xl px-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 text-xs font-semibold outline-none"
              >
                <option value="kpr">Restrukturisasi / Takeover KPR Floating</option>
                <option value="budgeting">Optimasi 4-Bucket Master Cashflow</option>
                <option value="sinking">Strategi Sinking Fund & Dana Pendidikan</option>
                <option value="mfund">Setup Kas Produktif M-Fund Mirae Asset</option>
                <option value="general">Review Portofolio Komprehensif</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Catatan / Detail Pertanyaan Klien
              </label>
              <textarea
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Tuliskan pertanyaan spesifik atau kendala finansial yang ingin dibedah..."
                className="w-full rounded-xl p-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 text-xs outline-none resize-none"
              />
            </div>

            <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-xl bg-[#FAF8F5] border border-[#D5CEBF] text-slate-700 text-xs font-bold"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="h-10 px-5 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-[#32A89C]" />
                {isSent ? 'Permintaan Terkirim ✓' : 'Kirim Request Konsultasi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
