/**
 * Jago Rencana VIP Pass Countdown Utility
 * Menghitung sisa hari masa aktif pendampingan VIP Priority WhatsApp (30 Hari) secara real-time.
 */

export interface VipCountdownInfo {
  daysRemaining: number;
  elapsedDays: number;
  totalDuration: number;
  isExpired: boolean;
  activationDateStr: string;
}

export function calculateVipDaysRemaining(
  user?: { email?: string; createdAt?: string; activationDate?: string; loginAt?: string } | null,
  profile?: { email?: string; createdAt?: string; activationDate?: string; registeredDate?: string } | null,
  portalData?: any
): VipCountdownInfo {
  const totalDuration = 30; // Durasi total pendampingan VIP: 30 hari
  const userEmail = user?.email || portalData?.profile?.email || profile?.email || 'default';
  const sanitizedEmail = userEmail.toLowerCase().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const storageKey = `jr_vip_start_${sanitizedEmail}`;

  // 1. Ambil tanggal aktivasi klien dari data sesi user atau portal data
  let activationDateStr: string | null = 
    user?.createdAt || 
    user?.activationDate || 
    portalData?.profile?.createdAt || 
    portalData?.profile?.activationDate || 
    profile?.createdAt || 
    profile?.activationDate || 
    null;

  // 2. Jika tanggal belum terdefinisi di payload cloud, periksa / simpan di localStorage
  if (!activationDateStr) {
    try {
      const stored = localStorage.getItem(storageKey) || localStorage.getItem('jr_vip_start_date');
      if (stored) {
        activationDateStr = stored;
      } else {
        // Fallback: gunakan tanggal aktivasi default / login pertama kali
        const fallbackDate = user?.loginAt || portalData?.profile?.registeredDate || profile?.registeredDate || '2026-09-01';
        try {
          localStorage.setItem(storageKey, fallbackDate);
        } catch {
          // ignore localStorage quota errors
        }
        activationDateStr = fallbackDate;
      }
    } catch {
      activationDateStr = '2026-09-01';
    }
  } else {
    // Sinkronkan ke localStorage agar konsisten di sesi browser
    try {
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, activationDateStr);
      }
    } catch {
      // ignore
    }
  }

  // 3. Parsing tanggal dan validasi
  const parsedDate = new Date(activationDateStr);
  const validActivationDate = !isNaN(parsedDate.getTime()) ? parsedDate : new Date('2026-09-01');

  // 4. Hitung selisih hari terhadap tanggal hari ini secara real-time
  const today = new Date();
  const diffTime = today.getTime() - validActivationDate.getTime();
  const elapsedDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, totalDuration - elapsedDays);
  const isExpired = daysRemaining === 0;

  return {
    daysRemaining,
    elapsedDays,
    totalDuration,
    isExpired,
    activationDateStr: validActivationDate.toISOString().split('T')[0],
  };
}
