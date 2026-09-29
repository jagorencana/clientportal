import React from 'react';

interface LockedFeatureGuardProps {
  moduleTitle?: string;
  customDescription?: string;
  onUpgrade?: () => void;
}

export const LockedFeatureGuard: React.FC<LockedFeatureGuardProps> = ({
  moduleTitle,
  customDescription,
  onUpgrade,
}) => {
  const handleUpgradeClick = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.open(
        'https://wa.me/6281806988868?text=Halo%20Admin%2C%20saya%20ingin%20upgrade%20ke%20VIP%20Blueprint',
        '_blank'
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 m-6 backdrop-blur-sm">
      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm">
        🔒
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">
        {moduleTitle ? `Fitur Khusus Anggota VIP Blueprint OS - ${moduleTitle}` : 'Fitur Khusus Anggota VIP Blueprint OS'}
      </h3>
      <p className="text-slate-500 max-w-md text-sm mb-6 leading-relaxed">
        {customDescription ||
          'Modul ini dirancang eksklusif untuk pendampingan komprehensif 1-on-1. Upgrade paket Anda untuk membuka simulator KPR, alokasi 4-pos budget, dan sinking funds.'}
      </p>
      <button 
        onClick={handleUpgradeClick}
        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
      >
        <span>⚡ Upgrade ke VIP Blueprint (Rp 500.000)</span>
      </button>
    </div>
  );
};

