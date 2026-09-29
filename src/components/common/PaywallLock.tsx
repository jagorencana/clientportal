import React from 'react';
import { Lock, Zap, Sparkles } from 'lucide-react';
import { DUITKU_CONFIG } from '../../services/duitkuService';
import { formatRupiah } from '../../utils/calculations';

export interface PaywallLockProps {
  moduleTitle?: string;
  moduleDescription?: string;
  onUpgrade?: () => void;
  onNavigateToTvm?: () => void;
  onNavigateToOverview?: () => void;
  children?: React.ReactNode;
}

export const PaywallLock: React.FC<PaywallLockProps> = ({
  moduleTitle,
  moduleDescription,
  onUpgrade,
  onNavigateToTvm,
  onNavigateToOverview,
  children,
}) => {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#D5CEBF]/80 shadow-xs bg-white min-h-[500px]">
      {/* 1. Blurred and Unclickable Background Content */}
      {children && (
        <div 
          aria-hidden="true" 
          className="pointer-events-none select-none filter blur-sm opacity-35 max-h-[720px] overflow-hidden"
        >
          {children}
        </div>
      )}

      {/* 2. Centered Paywall & Lock Overlay */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 sm:p-10 text-center bg-gradient-to-b from-slate-900/65 via-slate-900/80 to-slate-950/90 backdrop-blur-[2px]">
        {/* Lock Icon Badge */}
        <div className="w-16 h-16 bg-amber-500/15 border border-amber-400/30 rounded-2xl flex items-center justify-center mb-4 shadow-xl ring-4 ring-amber-500/10">
          <Lock className="w-8 h-8 text-amber-400" />
        </div>

        {/* Badge Label */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>VIP Wealth Blueprint OS</span>
        </div>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-black text-white max-w-lg tracking-tight leading-snug mb-2">
          {moduleTitle || 'Fitur Eksklusif VIP Wealth Blueprint OS'}
        </h3>

        {/* Description */}
        <p className="text-slate-300 max-w-lg text-xs sm:text-sm mb-6 leading-relaxed font-normal">
          {moduleDescription ||
            'Fitur Eksklusif VIP Wealth Blueprint OS. Buka kunci simulasi alokasi portofolio institusional, compounding multi-aset, simulator KPR, dan proyeksi passive income.'}
        </p>

        {/* Action Button: Upgrade Duitku */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
          <button
            type="button"
            onClick={onUpgrade}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 text-slate-950 fill-current" />
            <span>Upgrade ke VIP Blueprint ({formatRupiah(DUITKU_CONFIG.package.amount)})</span>
          </button>
        </div>

        {/* Secondary Navigation */}
        <div className="flex items-center gap-4 mt-5 text-xs text-slate-400">
          {onNavigateToTvm && (
            <button
              type="button"
              onClick={onNavigateToTvm}
              className="hover:text-white underline cursor-pointer transition-colors"
            >
              Kembali ke TVM Goals
            </button>
          )}
          {onNavigateToOverview && (
            <button
              type="button"
              onClick={onNavigateToOverview}
              className="hover:text-white underline cursor-pointer transition-colors"
            >
              Ke Dashboard Overview
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
