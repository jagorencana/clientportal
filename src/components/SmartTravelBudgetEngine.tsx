import React, { useState, useMemo } from 'react';
import { 
  Plane, 
  Hotel, 
  Utensils, 
  MapPin, 
  Calendar, 
  Sparkles, 
  ShieldCheck, 
  CreditCard, 
  Compass, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Clock,
  RefreshCw,
  Info,
  Shield,
  Layers,
  FileCheck2,
  Check,
  AlertCircle
} from 'lucide-react';
import { formatRupiah } from '../utils/calculations';
import { SinkingFundGoal } from '../types';
import { CurrencyInput } from './common/CurrencyInput';
import confetti from 'canvas-confetti';

interface SmartTravelBudgetEngineProps {
  onSyncToSinkingFund?: (goalData: { title: string; targetAmount: number; tenorMonths: number; category: 'travel'; notes: string }) => void;
  existingTravelGoals?: SinkingFundGoal[];
  onNavigateTab?: (tab: string) => void;
}

interface DestinationPreset {
  id: string;
  name: string;
  destinationName: string;
  country: string;
  currencyCode: string;
  currencySymbol: string;
  exchangeRateToIdr: number;
  defaultDays: number;
  defaultPax: number;
  defaultMonths: number;
  flightPpIdr: number;
  hotelPerNightIdr: number;
  visaInsuranceIdr: number;
  diningPerPaxPerDayIdr: number;
  localTransportPerDayIdr: number;
  tourAttractionsPerPaxIdr: number;
  shoppingSouvenirIdr: number;
  tag: string;
}

const PRESET_TRIPS: DestinationPreset[] = [
  {
    id: 'japan',
    name: 'Tokyo, Kyoto & Osaka (Cherry Blossom / Autumn)',
    destinationName: 'Liburan Jepang 10 Hari (Tokyo & Kyoto)',
    country: 'Jepang',
    currencyCode: 'JPY',
    currencySymbol: '¥',
    exchangeRateToIdr: 108,
    defaultDays: 10,
    defaultPax: 2,
    defaultMonths: 8,
    flightPpIdr: 11000000,
    hotelPerNightIdr: 2400000,
    visaInsuranceIdr: 1200000,
    diningPerPaxPerDayIdr: 950000,
    localTransportPerDayIdr: 450000,
    tourAttractionsPerPaxIdr: 2500000,
    shoppingSouvenirIdr: 6000000,
    tag: 'Favorite Couple & Family',
  },
  {
    id: 'europe',
    name: 'Western Europe Tour (Paris, Swiss, Rome)',
    destinationName: 'Grand Euro Tour 14D (Paris & Swiss)',
    country: 'Eropa (Schengen)',
    currencyCode: 'EUR',
    currencySymbol: '€',
    exchangeRateToIdr: 17500,
    defaultDays: 14,
    defaultPax: 2,
    defaultMonths: 12,
    flightPpIdr: 16500000,
    hotelPerNightIdr: 3200000,
    visaInsuranceIdr: 2500000,
    diningPerPaxPerDayIdr: 1400000,
    localTransportPerDayIdr: 750000,
    tourAttractionsPerPaxIdr: 4500000,
    shoppingSouvenirIdr: 10000000,
    tag: 'Grand Vacation',
  },
  {
    id: 'umrah',
    name: 'Umrah Mandiri / VIP Plus Turki (12 Hari)',
    destinationName: 'Umrah VIP & City Tour (12 Hari)',
    country: 'Arab Saudi',
    currencyCode: 'SAR',
    currencySymbol: 'SAR',
    exchangeRateToIdr: 4350,
    defaultDays: 12,
    defaultPax: 2,
    defaultMonths: 9,
    flightPpIdr: 14500000,
    hotelPerNightIdr: 3500000,
    visaInsuranceIdr: 2800000,
    diningPerPaxPerDayIdr: 650000,
    localTransportPerDayIdr: 500000,
    tourAttractionsPerPaxIdr: 1800000,
    shoppingSouvenirIdr: 4000000,
    tag: 'Spiritual Sinking Fund',
  },
  {
    id: 'bajo',
    name: 'Labuan Bajo & Komodo Sailing Liveaboard',
    destinationName: 'Trip Labuan Bajo & Komodo 4D3N',
    country: 'Indonesia',
    currencyCode: 'IDR',
    currencySymbol: 'Rp',
    exchangeRateToIdr: 1,
    defaultDays: 4,
    defaultPax: 2,
    defaultMonths: 5,
    flightPpIdr: 3200000,
    hotelPerNightIdr: 1800000,
    visaInsuranceIdr: 350000,
    diningPerPaxPerDayIdr: 400000,
    localTransportPerDayIdr: 300000,
    tourAttractionsPerPaxIdr: 4500000, // Phinisi Liveaboard
    shoppingSouvenirIdr: 1500000,
    tag: 'Domestic Island Escape',
  },
  {
    id: 'singapore',
    name: 'Singapore Weekend Break & Universal Studios',
    destinationName: 'Short Escape Singapore 4D3N',
    country: 'Singapura',
    currencyCode: 'SGD',
    currencySymbol: 'S$',
    exchangeRateToIdr: 12400,
    defaultDays: 4,
    defaultPax: 2,
    defaultMonths: 4,
    flightPpIdr: 2800000,
    hotelPerNightIdr: 2800000,
    visaInsuranceIdr: 400000,
    diningPerPaxPerDayIdr: 850000,
    localTransportPerDayIdr: 250000,
    tourAttractionsPerPaxIdr: 1800000,
    shoppingSouvenirIdr: 3500000,
    tag: 'Short Break / Family',
  },
];

export const SmartTravelBudgetEngine: React.FC<SmartTravelBudgetEngineProps> = ({
  onSyncToSinkingFund,
  existingTravelGoals = [],
  onNavigateTab,
}) => {
  // FORM PARAMETERS
  const [destinationTitle, setDestinationTitle] = useState<string>(PRESET_TRIPS[0].destinationName);
  const [durationDays, setDurationDays] = useState<number>(PRESET_TRIPS[0].defaultDays);
  const [paxCount, setPaxCount] = useState<number>(PRESET_TRIPS[0].defaultPax);
  const [monthsToDeparture, setMonthsToDeparture] = useState<number>(PRESET_TRIPS[0].defaultMonths);
  const [currentSavedCash, setCurrentSavedCash] = useState<number>(15000000);

  // 1. POS BIAYA PRA-TRIP (FIXED)
  const [flightPerPax, setFlightPerPax] = useState<number>(PRESET_TRIPS[0].flightPpIdr);
  const [hotelPerNight, setHotelPerNight] = useState<number>(PRESET_TRIPS[0].hotelPerNightIdr);
  const [visaInsurancePerPax, setVisaInsurancePerPax] = useState<number>(PRESET_TRIPS[0].visaInsuranceIdr);

  // 2. POS BIAYA HARIAN DI LOKASI (PER DIEM)
  const [diningDailyPerPax, setDiningDailyPerPax] = useState<number>(PRESET_TRIPS[0].diningPerPaxPerDayIdr);
  const [localTransportDaily, setLocalTransportDaily] = useState<number>(PRESET_TRIPS[0].localTransportPerDayIdr);
  const [tourAttractionPerPax, setTourAttractionPerPax] = useState<number>(PRESET_TRIPS[0].tourAttractionsPerPaxIdr);

  // 3. POS BELANJA & LIFESTYLE
  const [shoppingSouvenirs, setShoppingSouvenirs] = useState<number>(PRESET_TRIPS[0].shoppingSouvenirIdr);

  // 4. POS CONTINGENCY BUFFER (10% SAFETY NET)
  const [enableContingencyBuffer, setEnableContingencyBuffer] = useState<boolean>(true);

  // Sync state feedback
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Apply Preset
  const handleApplyPreset = (preset: DestinationPreset) => {
    setDestinationTitle(preset.destinationName);
    setDurationDays(preset.defaultDays);
    setPaxCount(preset.defaultPax);
    setMonthsToDeparture(preset.defaultMonths);
    setFlightPerPax(preset.flightPpIdr);
    setHotelPerNight(preset.hotelPerNightIdr);
    setVisaInsurancePerPax(preset.visaInsuranceIdr);
    setDiningDailyPerPax(preset.diningPerPaxPerDayIdr);
    setLocalTransportDaily(preset.localTransportPerDayIdr);
    setTourAttractionPerPax(preset.tourAttractionsPerPaxIdr);
    setShoppingSouvenirs(preset.shoppingSouvenirIdr);
    setSyncSuccessMessage(null);
  };

  // REAL-TIME REACTIVE CALCULATIONS
  const calculations = useMemo(() => {
    const days = Math.max(1, durationDays);
    const nights = Math.max(1, days - 1);
    const pax = Math.max(1, paxCount);
    const rooms = Math.max(1, Math.ceil(pax / 2));
    const months = Math.max(1, monthsToDeparture);

    // Pos 1: Pra-Trip
    const totalFlights = flightPerPax * pax;
    const totalHotel = hotelPerNight * nights * rooms;
    const totalVisaInsurance = visaInsurancePerPax * pax;
    const pos1PraTripTotal = totalFlights + totalHotel + totalVisaInsurance;

    // Pos 2: Harian di Lokasi
    const totalDining = diningDailyPerPax * days * pax;
    const totalLocalTransport = localTransportDaily * days;
    const totalTourAttractions = tourAttractionPerPax * pax;
    const pos2HarianTotal = totalDining + totalLocalTransport + totalTourAttractions;

    // Pos 3: Belanja & Lifestyle
    const pos3BelanjaTotal = shoppingSouvenirs;

    // Subtotal Pos 1-3
    const subtotalPos1to3 = pos1PraTripTotal + pos2HarianTotal + pos3BelanjaTotal;

    // Pos 4: Contingency Buffer (10%)
    const pos4ContingencyTotal = enableContingencyBuffer ? Math.round(subtotalPos1to3 * 0.10) : 0;

    // Grand Total Kebutuhan Anggaran Trip
    const grandTotalTripBudget = subtotalPos1to3 + pos4ContingencyTotal;

    // Biaya Riil per Pax
    const realCostPerPax = Math.round(grandTotalTripBudget / pax);

    // Sisa Kebutuhan Tabungan
    const remainingNeed = Math.max(0, grandTotalTripBudget - currentSavedCash);

    // Kebutuhan Tabungan Bulanan
    const monthlySavingRequired = Math.round(remainingNeed / months);

    // M-Fund 7.2% Yield Booster Estimasi
    const avgAccumulatingBalance = currentSavedCash + (remainingNeed / 2);
    const estimatedMFundYieldGain = Math.round(avgAccumulatingBalance * 0.072 * (months / 12));

    // Progress Pct
    const progressPercent = grandTotalTripBudget > 0
      ? Math.min(100, Math.round((currentSavedCash / grandTotalTripBudget) * 100))
      : 0;

    return {
      totalFlights,
      totalHotel,
      totalVisaInsurance,
      pos1PraTripTotal,
      totalDining,
      totalLocalTransport,
      totalTourAttractions,
      pos2HarianTotal,
      pos3BelanjaTotal,
      pos4ContingencyTotal,
      subtotalPos1to3,
      grandTotalTripBudget,
      realCostPerPax,
      remainingNeed,
      monthlySavingRequired,
      estimatedMFundYieldGain,
      progressPercent,
      nights,
      rooms,
    };
  }, [
    durationDays,
    paxCount,
    monthsToDeparture,
    currentSavedCash,
    flightPerPax,
    hotelPerNight,
    visaInsurancePerPax,
    diningDailyPerPax,
    localTransportDaily,
    tourAttractionPerPax,
    shoppingSouvenirs,
    enableContingencyBuffer,
  ]);

  const handleSyncClick = () => {
    if (onSyncToSinkingFund) {
      onSyncToSinkingFund({
        title: destinationTitle.trim() || 'Family Vacation Trip',
        targetAmount: calculations.grandTotalTripBudget,
        tenorMonths: Math.max(1, monthsToDeparture),
        category: 'travel',
        notes: `Rincian Trip: ${durationDays} Hari, ${paxCount} Pax. Biaya riil: ${formatRupiah(calculations.realCostPerPax)}/pax.`,
      });

      setSyncSuccessMessage(`Target "${destinationTitle}" sebesar ${formatRupiah(calculations.grandTotalTripBudget)} berhasil disinkronkan ke Sinking Fund!`);
      
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#32A89C', '#10B981', '#0F1A24'],
      });

      setTimeout(() => setSyncSuccessMessage(null), 6000);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#1D6E66] bg-[#E8F7F5] px-2.5 py-0.5 rounded-full border border-[#32A89C]/20">
              VIP Tool Module #3
            </span>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs font-semibold text-slate-500">
              Smart Travel & Vacation Budget Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Smart Travel Budgeting & Trip Planner
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Rancang liburan impian keluarga bebas utang kartu kredit dengan breakdown 4 pos biaya riil, 10% safety contingency buffer, dan sinkronisasi instan ke Sinking Fund.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 bg-[#FAF8F5] px-3.5 py-2 rounded-xl border border-[#E5E0D8] flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-[#32A89C]" />
            Zero-Debt Travel Protocol
          </span>
        </div>
      </div>

      {/* Preset Destinations Bar */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          Pilih Template Destinasi Populer:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PRESET_TRIPS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                destinationTitle === preset.destinationName
                  ? 'bg-[#0F1A24] text-white border-[#0F1A24] shadow-sm'
                  : 'bg-white text-slate-800 border-[#E5E0D8] hover:border-[#D5CEBF] hover:bg-[#FAF8F5]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${destinationTitle === preset.destinationName ? 'text-[#32A89C]' : 'text-slate-400'}`}>
                  {preset.country}
                </span>
                <span className="text-[10px] opacity-75">{preset.defaultDays}D</span>
              </div>
              <p className="text-xs font-bold leading-snug line-clamp-1">{preset.name.split('(')[0]}</p>
              <span className="text-[10px] text-slate-400 block mt-0.5">{preset.tag}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Parameters & 4-Pos Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 4 POS BIAYA (Span 7) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Trip Parameters Box */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#E5E0D8]">
              <Calendar className="w-4 h-4 text-[#32A89C]" />
              Parameter Rencana Perjalanan (Trip Parameters)
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Nama Destinasi & Keterangan Trip
              </label>
              <input
                type="text"
                value={destinationTitle}
                onChange={(e) => setDestinationTitle(e.target.value)}
                placeholder="Contoh: Trip Labuan Bajo 4D3N / Liburan Tokyo"
                className="h-10 w-full rounded-xl px-3.5 bg-[#FAF8F5] border border-[#D5CEBF] focus:border-[#32A89C] text-sm font-bold text-slate-900 outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Durasi Liburan</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Math.max(1, Number(e.target.value)))}
                    className="w-full h-9 px-2 rounded-lg bg-[#FAF8F5] border border-[#D5CEBF] text-xs font-bold text-slate-900 text-center"
                  />
                  <span className="text-[11px] text-slate-500 font-semibold">Hari</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Jumlah Peserta</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={paxCount}
                    onChange={(e) => setPaxCount(Math.max(1, Number(e.target.value)))}
                    className="w-full h-9 px-2 rounded-lg bg-[#FAF8F5] border border-[#D5CEBF] text-xs font-bold text-slate-900 text-center"
                  />
                  <span className="text-[11px] text-slate-500 font-semibold">Pax</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Target Berangkat</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={48}
                    value={monthsToDeparture}
                    onChange={(e) => setMonthsToDeparture(Math.max(1, Number(e.target.value)))}
                    className="w-full h-9 px-2 rounded-lg bg-[#FAF8F5] border border-[#D5CEBF] text-xs font-bold text-slate-900 text-center"
                  />
                  <span className="text-[11px] text-slate-500 font-semibold">Bulan</span>
                </div>
              </div>
            </div>
          </div>

          {/* POS 1: BIAYA PRA-TRIP (FIX) */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D8]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#0F1A24] text-white text-[10px] font-black flex items-center justify-center">1</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Biaya Pra-Trip (Fix / Sebelum Berangkat)
                </h3>
              </div>
              <span className="text-xs font-extrabold text-[#1D6E66] tabular-nums">
                Subtotal: {formatRupiah(calculations.pos1PraTripTotal, true)}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Tiket Transportasi PP */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#E5E0D8] bg-[#FAF8F5]">
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-[#32A89C]" />
                  <div>
                    <span className="font-bold text-slate-800">Tiket Transportasi PP (Pesawat / Kereta)</span>
                    <span className="text-[10px] text-slate-400 block">Per Orang ({paxCount} Pax = {formatRupiah(calculations.totalFlights, true)})</span>
                  </div>
                </div>
                <CurrencyInput
                  value={flightPerPax}
                  onChange={(val) => setFlightPerPax(val)}
                  prefix=""
                  className="w-36 h-8 px-2.5 rounded-lg bg-white border border-[#D5CEBF] font-bold text-slate-900 text-right text-xs"
                />
              </div>

              {/* Penginapan / Hotel */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#E5E0D8] bg-[#FAF8F5]">
                <div className="flex items-center gap-2">
                  <Hotel className="w-4 h-4 text-slate-700" />
                  <div>
                    <span className="font-bold text-slate-800">Penginapan & Hotel (Tarif / Malam)</span>
                    <span className="text-[10px] text-slate-400 block">{calculations.nights} Malam × {calculations.rooms} Kamar = {formatRupiah(calculations.totalHotel, true)}</span>
                  </div>
                </div>
                <CurrencyInput
                  value={hotelPerNight}
                  onChange={(val) => setHotelPerNight(val)}
                  prefix=""
                  className="w-36 h-8 px-2.5 rounded-lg bg-white border border-[#D5CEBF] font-bold text-slate-900 text-right text-xs"
                />
              </div>

              {/* Visa, Paspor & Asuransi */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#E5E0D8] bg-[#FAF8F5]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-slate-800">Visa, Paspor & Asuransi Perjalanan</span>
                    <span className="text-[10px] text-slate-400 block">Per Orang ({paxCount} Pax = {formatRupiah(calculations.totalVisaInsurance, true)})</span>
                  </div>
                </div>
                <CurrencyInput
                  value={visaInsurancePerPax}
                  onChange={(val) => setVisaInsurancePerPax(val)}
                  prefix=""
                  className="w-36 h-8 px-2.5 rounded-lg bg-white border border-[#D5CEBF] font-bold text-slate-900 text-right text-xs"
                />
              </div>
            </div>
          </div>

          {/* POS 2: BIAYA HARIAN DI LOKASI (PER DIEM) */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D8]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#0F1A24] text-white text-[10px] font-black flex items-center justify-center">2</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Biaya Harian di Lokasi (Per Diem)
                </h3>
              </div>
              <span className="text-xs font-extrabold text-[#1D6E66] tabular-nums">
                Subtotal: {formatRupiah(calculations.pos2HarianTotal, true)}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Makan & Kuliner */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#E5E0D8] bg-[#FAF8F5]">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="font-bold text-slate-800">Makan & Kuliner (Per Orang / Hari)</span>
                    <span className="text-[10px] text-slate-400 block">{durationDays} Hari × {paxCount} Pax = {formatRupiah(calculations.totalDining, true)}</span>
                  </div>
                </div>
                <CurrencyInput
                  value={diningDailyPerPax}
                  onChange={(val) => setDiningDailyPerPax(val)}
                  prefix=""
                  className="w-36 h-8 px-2.5 rounded-lg bg-white border border-[#D5CEBF] font-bold text-slate-900 text-right text-xs"
                />
              </div>

              {/* Transportasi Lokal */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#E5E0D8] bg-[#FAF8F5]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-slate-800">Transportasi Lokal (Sewa / BBM / MRT / Hari)</span>
                    <span className="text-[10px] text-slate-400 block">{durationDays} Hari = {formatRupiah(calculations.totalLocalTransport, true)}</span>
                  </div>
                </div>
                <CurrencyInput
                  value={localTransportDaily}
                  onChange={(val) => setLocalTransportDaily(val)}
                  prefix=""
                  className="w-36 h-8 px-2.5 rounded-lg bg-white border border-[#D5CEBF] font-bold text-slate-900 text-right text-xs"
                />
              </div>

              {/* Wisata & Atraksi */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#E5E0D8] bg-[#FAF8F5]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#32A89C]" />
                  <div>
                    <span className="font-bold text-slate-800">Tiket Wisata, Atraksi & Open Trip</span>
                    <span className="text-[10px] text-slate-400 block">Total per Pax ({paxCount} Pax = {formatRupiah(calculations.totalTourAttractions, true)})</span>
                  </div>
                </div>
                <CurrencyInput
                  value={tourAttractionPerPax}
                  onChange={(val) => setTourAttractionPerPax(val)}
                  prefix=""
                  className="w-36 h-8 px-2.5 rounded-lg bg-white border border-[#D5CEBF] font-bold text-slate-900 text-right text-xs"
                />
              </div>
            </div>
          </div>

          {/* POS 3: BELANJA & LIFESTYLE */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D8]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#0F1A24] text-white text-[10px] font-black flex items-center justify-center">3</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Belanja & Lifestyle (Oleh-oleh)
                </h3>
              </div>
              <span className="text-xs font-extrabold text-[#1D6E66] tabular-nums">
                Subtotal: {formatRupiah(calculations.pos3BelanjaTotal, true)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#E5E0D8] bg-[#FAF8F5] text-xs">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-600" />
                <div>
                  <span className="font-bold text-slate-800">Belanja Pribadi & Oleh-oleh Keluarga</span>
                  <span className="text-[10px] text-slate-400 block">Total alokasi belanja untuk trip</span>
                </div>
              </div>
              <CurrencyInput
                value={shoppingSouvenirs}
                onChange={(val) => setShoppingSouvenirs(val)}
                prefix=""
                className="w-36 h-8 px-2.5 rounded-lg bg-white border border-[#D5CEBF] font-bold text-slate-900 text-right text-xs"
              />
            </div>
          </div>

          {/* POS 4: CONTINGENCY BUFFER (10% SAFETY NET) */}
          <div className="bg-[#FAF8F5] rounded-2xl p-5 border border-[#E5E0D8] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D8]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#32A89C] text-white text-[10px] font-black flex items-center justify-center">4</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Contingency Buffer (10% Safety Net)
                </h3>
              </div>
              <span className="text-xs font-extrabold text-[#1D6E66] tabular-nums">
                {formatRupiah(calculations.pos4ContingencyTotal, true)}
              </span>
            </div>

            <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#E5E0D8] cursor-pointer hover:border-[#32A89C] transition-all">
              <input
                type="checkbox"
                checked={enableContingencyBuffer}
                onChange={(e) => setEnableContingencyBuffer(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#32A89C] focus:ring-[#32A89C] border-[#D5CEBF] accent-[#32A89C]"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">
                  Aktifkan Cadangan Kontinjensi 10% (Rekomendasi Financial Planner)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Otomatis menambahkan 10% dari total Pos 1–3 ({formatRupiah(calculations.subtotalPos1to3, true)}) untuk mengantisipasi selisih fluktuasi kurs valas, delay jadwal, atau pengeluaran tak terduga di tempat.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Right Column: OUTPUT METRIK TRAVEL & ACTION HOOK (Span 5) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Output Card: Total Budget & Metrics */}
          <div className="bg-[#0F1A24] text-white rounded-2xl p-6 sm:p-7 border border-black/20 shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 w-48 h-48 bg-[#32A89C]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#32A89C]">
                Total Kebutuhan Anggaran Trip
              </span>
              <span className="text-xs font-bold text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full">
                {durationDays} Hari • {paxCount} Pax
              </span>
            </div>

            <div className="my-2">
              <span className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight">
                {formatRupiah(calculations.grandTotalTripBudget)}
              </span>
              <span className="text-xs text-white/70 block mt-1">
                Biaya Riil per Pax: <strong className="text-white">{formatRupiah(calculations.realCostPerPax)}</strong> / orang
              </span>
            </div>

            {/* Sinking Fund Breakdown */}
            <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-[#32A89C] font-bold block">Tabungan Wajib Bulanan</span>
                <span className="text-2xl font-black text-[#32A89C] tabular-nums">
                  {formatRupiah(calculations.monthlySavingRequired, true)}
                  <span className="text-xs font-normal text-white/60">/bln</span>
                </span>
                <span className="text-[10px] text-white/60 block mt-0.5">Tenor {monthsToDeparture} bulan</span>
              </div>

              <div>
                <span className="text-[11px] text-white/70 block">Kas Sudah Terkumpul</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    step={1000000}
                    value={currentSavedCash}
                    onChange={(e) => setCurrentSavedCash(Number(e.target.value))}
                    className="w-full h-8 px-2 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-bold"
                  />
                </div>
                <span className="text-[10px] text-white/60 block mt-0.5">{calculations.progressPercent}% terkumpul</span>
              </div>
            </div>

            {/* ACTION HOOK: SINKRONISASI KE SINKING FUND */}
            <div className="mt-6 pt-4 border-t border-white/15">
              <button
                onClick={handleSyncClick}
                className="w-full h-11 px-4 rounded-xl bg-[#32A89C] hover:bg-[#25857B] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>🔄 Sinkronkan ke Target Sinking Fund</span>
              </button>

              {syncSuccessMessage && (
                <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="leading-snug">{syncSuccessMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cashflow Advice Callout: M-Fund Accelerator */}
          <div className="bg-[#E8F7F5] rounded-2xl p-5 border border-[#32A89C]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#1D6E66]" />
                <h4 className="text-xs font-bold text-[#1D6E66] uppercase tracking-wider">
                  Notifikasi Alokasi Cashflow & Yield Booster
                </h4>
              </div>
              <span className="text-[10px] font-black text-[#1D6E66] bg-white px-2 py-0.5 rounded-full border border-[#32A89C]/30">
                7.2% p.a.
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              💡 <strong>Rekomendasi Advisor:</strong> Alokasikan akumulasi tabungan travel <strong className="text-slate-900">{formatRupiah(calculations.monthlySavingRequired, true)}/bulan</strong> ini ke <strong>Reksadana Pasar Uang M-Fund</strong> (Yield 5–9% p.a., likuid tanpa penalti saat tiket & visa dipesan).
            </p>

            <div className="p-3 bg-white rounded-xl border border-[#32A89C]/20 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Estimasi Bonus Imbal Hasil</span>
                <span className="text-base font-black text-[#1D6E66] tabular-nums">
                  +{formatRupiah(calculations.estimatedMFundYieldGain, true)}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 max-w-[170px] text-right">
                Cukup membiayai oleh-oleh atau asuransi perjalanan!
              </span>
            </div>
          </div>

          {/* Pos Summary Distribution */}
          <div className="bg-white rounded-2xl p-5 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2.5 text-xs">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Ringkasan 4 Pos Biaya Liburan:
            </h4>
            <div className="flex justify-between items-center text-slate-600 pb-1.5 border-b border-[#E5E0D8]">
              <span>Pos 1: Pra-Trip (Fix):</span>
              <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(calculations.pos1PraTripTotal, true)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 pb-1.5 border-b border-[#E5E0D8]">
              <span>Pos 2: Harian di Lokasi (Per Diem):</span>
              <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(calculations.pos2HarianTotal, true)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 pb-1.5 border-b border-[#E5E0D8]">
              <span>Pos 3: Belanja & Lifestyle:</span>
              <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(calculations.pos3BelanjaTotal, true)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 pb-1.5 border-b border-[#E5E0D8]">
              <span>Pos 4: Contingency Buffer (10%):</span>
              <span className="font-bold text-[#1D6E66] tabular-nums">{formatRupiah(calculations.pos4ContingencyTotal, true)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-900 font-extrabold pt-1">
              <span>Total Estimasi Anggaran:</span>
              <span className="text-sm text-[#0F1A24] tabular-nums">{formatRupiah(calculations.grandTotalTripBudget)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
