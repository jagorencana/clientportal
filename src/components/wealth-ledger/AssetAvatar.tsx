import React, { useState } from 'react';

export interface AssetAvatarProps {
  currency: string;
  category?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AssetAvatar: React.FC<AssetAvatarProps> = ({
  currency,
  category,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const curr = (currency || '').toUpperCase().trim();
  const cat = (category || '').toLowerCase();

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 sm:w-14 sm:h-14 text-sm sm:text-base',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  }[size];

  if (cat.includes('sinking')) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-teal-50 border-2 border-white ring-1 ring-teal-200 flex items-center justify-center text-teal-700 shadow-xs shrink-0 select-none ${className}`}
        title={`${currency} - Sinking Fund`}
      >
        🎯
      </div>
    );
  }

  // 1. LOGAM MULIA (EMAS / XAU)
  if (curr === 'XAU' || cat.includes('emas') || cat.includes('logam')) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-white font-bold shadow-xs border-2 border-white ring-1 ring-amber-300 shrink-0 select-none ${className}`}
        title={`${currency} - Logam Mulia`}
      >
        Au
      </div>
    );
  }

  // 2. ASET FISIK & PRODUKTIF (Armada, Properti, Mesin, Kendaraan - kecualikan Kas Valas)
  if (
    !cat.includes('valas') &&
    (cat.includes('fisik') ||
      cat.includes('produktif') ||
      cat.includes('armada') ||
      cat.includes('properti'))
  ) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-slate-800 border-2 border-white ring-1 ring-indigo-400/80 flex items-center justify-center text-indigo-200 shadow-xs shrink-0 select-none ${className}`}
        title={`${currency} - Aset Fisik & Operasional`}
      >
        <svg
          className={iconSizes}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
    );
  }

  // 3. PASAR MODAL DOMESTIK & UNIT REKSADANA (Saham IDX, Bibit Unit)
  if (
    (cat.includes('reksadana') || cat.includes('efek')) &&
    (curr === 'IDR' || curr === 'CUSTOM' || curr === 'UNIT')
  ) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-indigo-50 border-2 border-white ring-1 ring-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs shrink-0 select-none ${className}`}
        title={`${currency} - Pasar Modal / Efek`}
      >
        <svg
          className={iconSizes}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      </div>
    );
  }

  // 3. ASET KRIPTO UTAMA (Logo Resmi via CDN)
  const CRYPTO_LOGOS: Record<string, string> = {
    BTC: 'https://assets.coincap.io/assets/icons/btc@2x.png',
    ETH: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    USDT: 'https://assets.coincap.io/assets/icons/usdt@2x.png',
    USDC: 'https://assets.coincap.io/assets/icons/usdc@2x.png',
    SOL: 'https://assets.coincap.io/assets/icons/sol@2x.png',
  };

  if (CRYPTO_LOGOS[curr] || cat.includes('kripto') || cat.includes('crypto')) {
    const logoUrl = CRYPTO_LOGOS[curr];
    return (
      <div
        className={`${sizeClasses} rounded-full overflow-hidden border-2 border-white ring-1 ring-slate-200 shadow-xs shrink-0 flex items-center justify-center bg-slate-50 p-1 select-none ${className}`}
        title={`${curr} - Kripto`}
      >
        {logoUrl && !imgError ? (
          <img
            src={logoUrl}
            alt={curr}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-[10px] font-bold text-slate-700 font-sans">
            {curr.slice(0, 3)}
          </span>
        )}
      </div>
    );
  }

  // 4. VALAS & KAS NEGARA (BENDERA RESMI VIA FLAGCDN)
  const FIAT_MAP: Record<string, string> = {
    IDR: 'id',
    USD: 'us',
    EUR: 'eu',
    CHF: 'ch',
    SGD: 'sg',
    JPY: 'jp',
    GBP: 'gb',
    AUD: 'au',
    CNY: 'cn',
    HKD: 'hk',
    THB: 'th',
    MYR: 'my',
    KRW: 'kr',
    NZD: 'nz',
    CAD: 'ca',
    AED: 'ae',
    SAR: 'sa',
    INR: 'in',
    PHP: 'ph',
    VND: 'vn',
    TWD: 'tw',
  };

  if (FIAT_MAP[curr] && !imgError) {
    return (
      <div
        className={`${sizeClasses} rounded-full overflow-hidden border-2 border-white ring-1 ring-slate-200/80 shadow-xs shrink-0 flex items-center justify-center bg-slate-100 select-none ${className}`}
        title={`${curr} (${FIAT_MAP[curr].toUpperCase()})`}
      >
        <img
          src={`https://flagcdn.com/w80/${FIAT_MAP[curr]}.png`}
          alt={curr}
          className="w-full h-full object-cover scale-110"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // 5. DEFAULT FALLBACK
  return (
    <div
      className={`${sizeClasses} rounded-full bg-slate-100 border-2 border-white ring-1 ring-slate-200 flex items-center justify-center text-slate-700 font-bold shadow-xs shrink-0 font-sans select-none ${className}`}
      title={curr}
    >
      {curr.slice(0, 3)}
    </div>
  );
};
