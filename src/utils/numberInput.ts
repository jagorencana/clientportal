/**
 * Format angka ke standar Indonesia (titik ribuan, koma desimal)
 * Contoh: 21636 -> "21.636" | 113.41 -> "113,41" | 13.08 -> "13,08"
 */
export function formatIdNumber(
  num: number,
  minDec: number = 0,
  maxDec: number = 4
): string {
  if (num === null || num === undefined || isNaN(num) || num === 0) return '';
  if (Number.isInteger(num)) {
    return num.toLocaleString('id-ID');
  }
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec,
  });
}

/**
 * Parse input string format Indonesia (atau standar) ke number murni
 * Membersihkan karakter pemisah ribuan dan karakter non-numerik lainnya secara aman
 */
export function parseIdNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) ? 0 : val;
  }
  const clean = String(val).trim();
  if (!clean) return 0;

  // Kasus 1: Mengandung titik ribuan dan koma desimal (contoh: "21.636,50" atau "1.520.000,25")
  if (clean.includes('.') && clean.includes(',')) {
    const sanitized = clean.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(sanitized.replace(/[^0-9.-]+/g, ''));
    return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  }

  // Kasus 2: Mengandung koma saja sebagai desimal (contoh: "113,41" atau "13,08")
  if (clean.includes(',')) {
    const sanitized = clean.replace(',', '.');
    const parsed = parseFloat(sanitized.replace(/[^0-9.-]+/g, ''));
    return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  }

  // Kasus 3: Mengandung titik ribuan tanpa koma desimal (contoh: "21.636" atau "1.520.000")
  if (/^\d{1,3}(\.\d{3})+$/.test(clean) || /^\d+\.\d{3}$/.test(clean)) {
    const parsed = parseFloat(clean.replace(/\./g, ''));
    return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  }

  // Kasus 4: Format desimal standar dengan titik (.) atau angka polos (contoh: "150000" atau "12.5")
  const parsed = parseFloat(clean.replace(/[^0-9.-]+/g, ''));
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
}

export function cleanNumericInput(input: any): number {
  if (typeof input === 'number') {
    return isNaN(input) || !isFinite(input) ? 0 : input;
  }
  return parseIdNumber(input);
}

