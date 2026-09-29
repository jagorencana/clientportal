import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  Save, 
  CheckCircle2,
  Lock
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBookingModal?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, onOpenBookingModal }) => {
  const { profile, portalData, user, currentUser, isVip, updateProfile } = usePortal();

  const clientName = portalData?.profile?.name || portalData?.profile?.fullName || user?.name || user?.nama || currentUser?.nama || profile.name || "Klien VIP";
  const activeEmail = user?.email || currentUser?.email || profile.email || '';
  const officialOrderId = user?.orderId || currentUser?.orderId || portalData?.profile?.id || profile.id || "JR-VIP-732373";
  const isStarter = !isVip;

  const [name, setName] = useState(clientName);
  const [phone, setPhone] = useState(profile.phone || '');
  const [city, setCity] = useState(profile.city || '');
  const [age, setAge] = useState(profile.age || 30);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(clientName);
      setPhone(profile.phone || '');
      setCity(profile.city || '');
      setAge(profile.age || 30);
    }
  }, [isOpen, clientName, profile]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: name.trim() || clientName,
      phone: phone.trim(),
      city: city.trim(),
      age: Number(age) || profile.age || 30,
    });
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 1200);
  };

  const avatarInitial = (name || clientName).trim().charAt(0).toUpperCase() || 'V';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-[#E5E0D8] shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-[#FAF8F5] transition-all cursor-pointer"
          title="Tutup Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 pb-5 border-b border-[#E5E0D8]">
          <div className="w-14 h-14 rounded-2xl bg-[#0F1A24] text-white flex items-center justify-center text-xl font-black shadow-md uppercase">
            {avatarInitial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="profile-modal-title" className="text-xl font-black text-[#0F1A24]">{name || clientName}</h2>
              {isStarter ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-black uppercase">
                  ⚪ STARTER PASS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8F7F5] border border-[#32A89C]/30 text-[#1D6E66] text-[10px] font-black uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  🟢 VIP BLUEPRINT OS
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{activeEmail}</p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">ID: {officialOrderId}</p>
          </div>
        </div>

        {/* Upgrade Callout for Starter */}
        {isStarter && onOpenBookingModal && (
          <div className="my-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between">
            <div>
              <p className="font-bold text-amber-900">Tingkatkan Hak Akses ke VIP Blueprint</p>
              <p className="text-[11px] text-amber-700">Dapatkan akses Master Budget, KPR, Sinking Funds & PDF Report.</p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenBookingModal();
              }}
              className="px-3 py-1.5 bg-[#0F1A24] hover:bg-[#1E293B] text-white rounded-xl text-[10px] font-bold shadow-xs cursor-pointer shrink-0 ml-2"
            >
              ⚡ Upgrade (Rp 400k)
            </button>
          </div>
        )}

        {/* Status Akses Portal VIP - Institutional Status (No Raw Secret Token/Password Display) */}
        {isVip && (
          <div className="my-4 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <p className="font-bold text-slate-800">Status Akses Portal VIP</p>
                <p className="text-[12px] text-emerald-800 font-mono font-bold tracking-wide">
                  {officialOrderId} • Akses Seumur Hidup Aktif
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900 shrink-0">
              Verified VIP
            </span>
          </div>
        )}

        {savedNotice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">Profil berhasil diperbarui dan disinkronkan ke Cloud!</span>
          </div>
        )}

        {/* Form Demografi & Audit Profil */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nama Lengkap
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Lengkap Klien"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none text-sm font-semibold text-slate-900"
              />
            </div>
          </div>

          {/* Email Terdaftar - Read-Only / Disabled */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Alamat Email Terdaftar
              </label>
              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Read-Only
              </span>
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={activeEmail}
                readOnly
                disabled
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-semibold text-sm cursor-not-allowed select-none"
                title="Email akun utama terikat dengan lisensi akses portal dan tidak dapat diubah secara mandiri."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Nomor WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none text-sm font-semibold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Kota Domisili
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Jakarta, Surabaya, dll"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none text-sm font-semibold text-slate-900"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Usia Klien (Tahun)
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min={17}
                max={100}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                placeholder="30"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none text-sm font-semibold text-slate-900"
              />
            </div>
          </div>

          {/* Advisor Desk */}
          <div className="p-3.5 rounded-2xl bg-[#E8F7F5]/50 border border-[#32A89C]/20 text-xs">
            <p className="font-bold text-[#1D6E66] mb-1">Advisor Desk</p>
            <p className="text-slate-800 font-semibold">Jago Rencana Private Wealth</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Layanan konsultasi & pendampingan perencanaan keuangan komprehensif.</p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E5E0D8] text-xs font-bold text-slate-700 hover:bg-[#FAF8F5] cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#32A89C]" />
              Simpan Profil
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfileModal;
