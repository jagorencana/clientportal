/**
 * Google Apps Script Backend Service for Jago Wealth Ledger
 * Endpoint: Web App published to execute as user/accessible to anyone
 */

import { AssetPocket, InstrumentType, LedgerTransaction } from '../types/ledger';

const FALLBACK_GAS_URL =
  'https://script.google.com/macros/s/AKfycbwnCkUHXODtKuStZvUnbdohnZyLLD9p53o6VNmMrnpWbaNaSd1PHfP3dInyOjybTdmF/exec';
const GAS_URL = String(import.meta.env.VITE_LEDGER_GAS_URL || FALLBACK_GAS_URL).trim();
const GAS_REQUEST_TIMEOUT_MS = 45_000;
const DELETE_POCKET_TIMEOUT_MS = 10_000;
const GAS_FETCH_MAX_ATTEMPTS = 3;
const GAS_RETRY_BASE_DELAY_MS = 750;
const LEDGER_CACHE_PREFIX = 'wl_pockets_cache';
const LEGACY_LEDGER_CACHE_PREFIX = 'jr_wealth_ledger_cache_v1';

// Tidak boleh ada fallback tenant produksi. Email wajib berasal dari sesi Client Portal aktif.
export const DEFAULT_USER_EMAIL = '';
export let currentUserEmail = DEFAULT_USER_EMAIL;

const resolveUserEmail = (email?: string): string =>
  String(email || currentUserEmail || '').trim().toLowerCase();

export const setCurrentUserEmail = (email: string): void => {
  currentUserEmail = String(email || '').trim().toLowerCase();
};

export const getCurrentUserEmail = (): string => currentUserEmail;

export interface RemoteLedgerPayload {
  pockets?: AssetPocket[];
  transactions?: LedgerTransaction[];
  monthlySurplusCapacity?: number;
  lastUpdated?: string;
  duplicatePocketIds?: string[];
  source?: 'remote' | 'cache';
  cacheSavedAt?: string;
  cacheFallbackReason?: string;
  cacheTenantEmail?: string;
  [key: string]: any;
}

const tenantCacheKey = (email: string, prefix = LEDGER_CACHE_PREFIX): string => {
  if (prefix === LEDGER_CACHE_PREFIX) {
    // Reversible encoding avoids collision antar-tenant yang mungkin terjadi pada hash 32-bit lama.
    return `${prefix}_${encodeURIComponent(email.trim().toLowerCase())}`;
  }
  let hash = 5381;
  for (const char of email) hash = ((hash << 5) + hash) ^ char.charCodeAt(0);
  return `${prefix}_${(hash >>> 0).toString(36)}`;
};

export const saveCachedLedgerData = (emailInput: string, data: RemoteLedgerPayload): void => {
  const email = resolveUserEmail(emailInput);
  if (!email) return;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      tenantCacheKey(email),
      JSON.stringify({
        ...data,
        source: 'cache',
        cacheTenantEmail: email,
        cacheSavedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.warn('Cache lokal Wealth Ledger tidak dapat disimpan:', error);
  }
};

export const loadCachedLedgerData = (userEmail: string): RemoteLedgerPayload | null => {
  const email = resolveUserEmail(userEmail);
  if (!email) return null;
  if (typeof window === 'undefined') return null;
  try {
    const currentKey = tenantCacheKey(email);
    const legacyKey = tenantCacheKey(email, LEGACY_LEDGER_CACHE_PREFIX);
    const raw = window.localStorage.getItem(currentKey) || window.localStorage.getItem(legacyKey);
    if (!raw) return null;
    const cached = JSON.parse(raw) as RemoteLedgerPayload;
    if (!Array.isArray(cached.pockets) || !Array.isArray(cached.transactions)) return null;
    if (cached.cacheTenantEmail && cached.cacheTenantEmail !== email) {
      console.warn('Cache Wealth Ledger ditolak karena tenant tidak cocok.');
      return null;
    }
    if (!cached.cacheTenantEmail) {
      const embeddedEmails = new Set(
        cached.pockets
          .map((pocket) => String(pocket.userEmail || '').trim().toLowerCase())
          .filter(Boolean)
      );
      if (embeddedEmails.size > 0 && !embeddedEmails.has(email)) {
        console.warn('Cache lama Wealth Ledger ditolak karena tenant tidak cocok.');
        return null;
      }
    }
    if (!window.localStorage.getItem(currentKey)) {
      window.localStorage.setItem(
        currentKey,
        JSON.stringify({ ...cached, cacheTenantEmail: email, source: 'cache' })
      );
    }
    return { ...cached, source: 'cache' };
  } catch (error) {
    console.warn('Cache lokal Wealth Ledger tidak dapat dibaca:', error);
    return null;
  }
};

const wait = (delayMs: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, delayMs));

export const normalizeRemotePocket = (p: any, idx: number = 0): AssetPocket => {
  const currency = (p.currency || p.currencyCode || 'IDR').toUpperCase().trim();
  const custodian = p.custodian || p.defaultCustodian || 'CIMB Niaga';
  const name = String(p.name || `Kantong ${currency}`).trim();
  const category = String(p.category || '').trim();
  const categoryKey = category.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const lowerName = name.toLowerCase();
  const rawInstrumentType = String(p.instrumentType || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const validInstrumentTypes: InstrumentType[] = [
    'CASH_VALAS', 'LOGAM_MULIA', 'REKSADANA', 'SAHAM_ETF', 'SINKING_FUND', 'ASET_FISIK',
  ];
  const explicitInstrumentType = validInstrumentTypes.includes(rawInstrumentType as InstrumentType)
    ? rawInstrumentType as InstrumentType
    : undefined;
  const categoryInstrumentType: InstrumentType | undefined =
    /logam|emas|gold/.test(categoryKey) ? 'LOGAM_MULIA'
      : /sinking|dana tujuan|dana cadangan/.test(categoryKey) ? 'SINKING_FUND'
      : /aset fisik|operasional|kendaraan|properti|property|inventaris/.test(categoryKey) ? 'ASET_FISIK'
      : /reksa\s*dana|reksadana|mutual fund/.test(categoryKey) ? 'REKSADANA'
      : /saham|etf|efek|equity/.test(categoryKey) ? 'SAHAM_ETF'
      : /kas|valas|tabungan|cash|rekening/.test(categoryKey) ? 'CASH_VALAS'
      : undefined;
  const nameInstrumentType: InstrumentType | undefined =
    /emas|logam/.test(lowerName) ? 'LOGAM_MULIA'
      : /sinking fund|dana tujuan/.test(lowerName) ? 'SINKING_FUND'
      : /reksa\s*dana|reksadana/.test(lowerName) ? 'REKSADANA'
      : /saham|etf|stock|portfolio efek/.test(lowerName) ? 'SAHAM_ETF'
      : /kendaraan|properti|property|inventaris/.test(lowerName) ? 'ASET_FISIK'
      : undefined;

  // instrumentType yang tersimpan adalah sumber utama. Kategori/nama hanya fallback untuk data lama.
  let instrumentType: InstrumentType =
    explicitInstrumentType || categoryInstrumentType ||
    (/investasi|investment/.test(categoryKey) ? 'SAHAM_ETF' : undefined) || nameInstrumentType ||
    (currency === 'XAU' ? 'LOGAM_MULIA' : 'CASH_VALAS');
  let symbol = p.symbol || 'Rp';
  let flag = p.flag || '💳';
  let accentColor = p.accentColor || 'teal';
  const manualMarketPrice = p.manualMarketPrice;
  const parsedManualRate = Number(p.manualMarketRate ?? p.manualRate ?? p.manualMarketPrice);
  const manualMarketRate = Number.isFinite(parsedManualRate) && parsedManualRate > 0
    ? parsedManualRate
    : undefined;
  const parsedMarketValue = Number(p.marketValue ?? p.marketValueIdr);
  const marketValue = Number.isFinite(parsedMarketValue) && parsedMarketValue >= 0
    ? parsedMarketValue
    : undefined;

  if (instrumentType === 'LOGAM_MULIA') {
    instrumentType = 'LOGAM_MULIA';
    symbol = 'gr';
    flag = '🪙';
    accentColor = 'amber';
  } else if (instrumentType === 'SINKING_FUND') {
    instrumentType = 'SINKING_FUND';
    symbol = 'Rp';
    flag = '🎯';
    accentColor = 'teal';
  } else if (instrumentType === 'SAHAM_ETF') {
    instrumentType = 'SAHAM_ETF';
    symbol = '$';
    flag = '🇺🇸';
    accentColor = 'cyan';
  } else if (instrumentType === 'REKSADANA') {
    instrumentType = 'REKSADANA';
    symbol = currency === 'USD' ? '$' : 'Rp';
    flag = '📈';
    accentColor = 'purple';
  } else if (instrumentType === 'ASET_FISIK') {
    instrumentType = 'ASET_FISIK';
    symbol = 'Rp';
    flag = '🏢';
    accentColor = 'indigo';
  } else if (currency === 'CHF') {
    instrumentType = 'CASH_VALAS';
    symbol = 'CHF';
    flag = '🇨🇭';
    accentColor = 'teal';
  } else if (currency === 'EUR') {
    instrumentType = 'CASH_VALAS';
    symbol = '€';
    flag = '🇪🇺';
    accentColor = 'blue';
  } else if (currency === 'USD') {
    instrumentType = 'CASH_VALAS';
    symbol = '$';
    flag = '🇺🇸';
    accentColor = 'emerald';
  } else if (currency === 'JPY') {
    instrumentType = 'CASH_VALAS';
    symbol = '¥';
    flag = '🇯🇵';
    accentColor = 'rose';
  } else if (currency === 'IDR') {
    instrumentType = 'CASH_VALAS';
    symbol = 'Rp';
    flag = '🇮🇩';
    accentColor = 'indigo';
  }

  return {
    id: String(p.id ?? p.pocketId ?? '').trim() || `pocket-${currency.toLowerCase()}-${idx + 1}`,
    name,
    currencyCode: currency,
    currency,
    instrumentType,
    symbol,
    flag,
    defaultCustodian: custodian,
    custodian,
    // Kunci kategori agar konsisten dengan instrumentType dan tidak membawa kategori lama yang salah.
    category: ({
      LOGAM_MULIA: 'Logam Mulia',
      SINKING_FUND: 'Sinking Fund',
      SAHAM_ETF: 'Saham & ETF',
      REKSADANA: 'Reksa Dana',
      ASET_FISIK: 'Aset Fisik & Operasional',
      CASH_VALAS: currency === 'IDR' ? 'Kas & Tabungan Rupiah' : 'Kas Valas',
    } as Record<InstrumentType, string>)[instrumentType],
    accentColor,
    manualMarketPrice,
    manualMarketRate,
    marketValue,
    lastPriceUpdatedAt: p.lastPriceUpdatedAt || p.priceUpdatedAt || undefined,
    isDefault: p.isDefault ?? true,
    sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : idx + 1,
    userEmail: p.userEmail,
    updatedAt: p.updatedAt,
  };
};

/** Direct Google Apps Script transport. Tidak memakai path relatif/proxy lokal. */
async function executeApiRequest(
  urlParams: string,
  options?: RequestInit,
  timeoutMs: number = GAS_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const isPost = options?.method === 'POST';
  const targetUrl = isPost ? GAS_URL : `${GAS_URL}?${urlParams}`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(targetUrl, {
    ...options,
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function parseJsonResponse<T = any>(res: Response): Promise<T> {
  const rawText = await res.text();
  const trimmed = rawText.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    throw new Error(
      `Respons backend bukan JSON valid (terdeteksi HTML/error page): ${trimmed.slice(0, 120)}`
    );
  }
  const parsed = JSON.parse(trimmed) as T;
  if (!res.ok) {
    const message = (parsed as any)?.message || `HTTP ${res.status}`;
    throw new Error(`Google Apps Script gagal: ${message}`);
  }
  return parsed;
}

export const fetchRemoteLedgerData = async (
  userEmail: string = currentUserEmail,
  options: { persistCache?: boolean } = {}
): Promise<RemoteLedgerPayload | null> => {
  const emailParam = (userEmail || currentUserEmail || '').trim().toLowerCase();
  if (!emailParam) {
    console.warn('Fetch ledger dibatalkan: email tenant aktif tidak tersedia.');
    return null;
  }

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= GAS_FETCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await executeApiRequest(
        `action=get_ledger_data&userEmail=${encodeURIComponent(emailParam)}&t=${Date.now()}`,
        { method: 'GET', redirect: 'follow' }
      );
      const rawResponse = await parseJsonResponse<any>(res);
      const data: RemoteLedgerPayload =
        rawResponse?.data &&
        (Array.isArray(rawResponse.data.pockets) || Array.isArray(rawResponse.data.transactions))
          ? rawResponse.data
          : rawResponse;
      if (!data || data.status === 'error' || data.success === false) {
        throw new Error(data?.message || 'Ledger API mengembalikan respons gagal.');
      }

      const normalizedPockets = (Array.isArray(data.pockets) ? data.pockets : [])
        .map((p: any, idx: number) => normalizeRemotePocket(p, idx));
      const uniquePockets = new Map<string, AssetPocket>();
      const duplicatePocketIds = new Set<string>();
      normalizedPockets.forEach((pocket) => {
        const pocketId = String(pocket.id || '').trim();
        if (!pocketId) return;
        if (uniquePockets.has(pocketId)) duplicatePocketIds.add(pocketId);
        uniquePockets.set(pocketId, pocket);
      });
      data.pockets = Array.from(uniquePockets.values());
      data.duplicatePocketIds = Array.from(duplicatePocketIds);

      data.transactions = (Array.isArray(data.transactions) ? data.transactions : []).map((tx: any) => {
        const rawAmount = tx.amount !== undefined ? tx.amount : tx.nativeAmount;
        const rawRate = tx.rate !== undefined ? tx.rate : tx.exchangeRate;
        const cleanAmount = typeof rawAmount === 'string'
          ? parseFloat(rawAmount.replace(/[^0-9.-]+/g, ''))
          : Number(rawAmount);
        const cleanRate = typeof rawRate === 'string'
          ? parseFloat(rawRate.replace(/[^0-9.-]+/g, ''))
          : Number(rawRate);
        const safeAmount = Number.isFinite(cleanAmount) ? cleanAmount : 0;
        const safeRate = Number.isFinite(cleanRate) ? cleanRate : 1;
        const safeTotalIdr = Math.round(safeAmount * safeRate);
        const isCredit = tx.type === 'CREDIT' || String(tx.type).toUpperCase() === 'IN';
        return {
          ...tx,
          id: tx.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          pocketId: String(tx.pocketId ?? '').trim(),
          nativeAmount: safeAmount,
          exchangeRate: safeRate,
          amount: safeAmount,
          rate: safeRate,
          type: isCredit ? 'CREDIT' : 'DEBET',
          costIdr: isCredit ? safeTotalIdr : -safeTotalIdr,
          totalIdr: isCredit ? safeTotalIdr : -safeTotalIdr,
          description: tx.description || tx.note || tx.notes || 'Mutasi Transaksi',
          date: tx.date || new Date().toISOString().split('T')[0],
        };
      });

      const activePocketIds = new Set(
        data.pockets.map((pocket) => String(pocket.id || '').trim()).filter(Boolean)
      );
      data.transactions = data.transactions.filter((transaction) =>
        activePocketIds.has(String(transaction.pocketId || '').trim())
      );
      data.source = 'remote';
      if (options.persistCache !== false) saveCachedLedgerData(emailParam, data);
      return data;
    } catch (error: any) {
      lastError = error;
      const reason = error?.name === 'AbortError'
        ? `Request timeout setelah ${GAS_REQUEST_TIMEOUT_MS / 1000} detik.`
        : error?.message || String(error);
      console.warn(`Fetch Wealth Ledger gagal (percobaan ${attempt}/${GAS_FETCH_MAX_ATTEMPTS}):`, reason);
      if (attempt < GAS_FETCH_MAX_ATTEMPTS) {
        await wait(GAS_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }

  const cached = loadCachedLedgerData(emailParam);
  if (cached) {
    return {
      ...cached,
      source: 'cache',
      cacheFallbackReason: (lastError as any)?.message || 'Google Sheets belum dapat dijangkau.',
    };
  }

  console.warn(
    'Pemberitahuan: Koneksi Google Sheets terkendala dan cache lokal belum tersedia:',
    (lastError as any)?.message || lastError
  );
  return null;
};

export const cleanupRemotePocketDuplicates = async (
  userEmail: string = currentUserEmail
): Promise<{ success: boolean; deletedRows?: number; [key: string]: any } | null> => {
  try {
    const emailToUse = resolveUserEmail(userEmail);
    if (!emailToUse) return null;
    const res = await executeApiRequest('', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'dedupe_ledger_pockets', userEmail: emailToUse }),
    });
    return await parseJsonResponse(res);
  } catch (err: any) {
    console.warn('Pembersihan duplikat kantong di Sheets gagal:', err?.message || err);
    return null;
  }
};

export const repairRemoteOrphanPockets = async (
  userEmail: string = currentUserEmail
): Promise<{ success: boolean; restoredPocketIds?: string[]; [key: string]: any } | null> => {
  try {
    const emailToUse = resolveUserEmail(userEmail);
    if (!emailToUse) return null;
    const res = await executeApiRequest('', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'repair_ledger_orphan_pockets', userEmail: emailToUse }),
    });
    return await parseJsonResponse(res);
  } catch (err: any) {
    console.warn('Pemulihan master kantong orphan gagal:', err?.message || err);
    return null;
  }
};

export const saveRemoteTransaction = async (
  transaction: any,
  userEmail: string = currentUserEmail
): Promise<{ success: boolean; [key: string]: any } | null> => {
  try {
    const emailToUse = resolveUserEmail(userEmail);
    if (!emailToUse) {
      console.warn('Simpan transaksi dibatalkan: email tenant aktif tidak tersedia.');
      return null;
    }
    const rawAmount = transaction?.amount !== undefined ? transaction.amount : transaction?.nativeAmount;
    const rawRate = transaction?.rate !== undefined ? transaction.rate : transaction?.exchangeRate;
    
    const cleanAmount = typeof rawAmount === 'string'
      ? parseFloat(rawAmount.replace(/[^0-9.-]+/g, ''))
      : Number(rawAmount);
    const cleanRate = typeof rawRate === 'string'
      ? parseFloat(rawRate.replace(/[^0-9.-]+/g, ''))
      : Number(rawRate);
    const cleanTotalIdr = Math.round(cleanAmount * cleanRate);

    // Pastikan type 'IN' (untuk CREDIT) atau 'OUT' (untuk DEBET)
    const rawType = String(transaction?.type || 'CREDIT').toUpperCase();
    const typeCode = rawType === 'CREDIT' || rawType === 'IN' ? 'IN' : 'OUT';

    const cleanPocketId = String(transaction?.pocketId ?? '').trim();
    const cleanTransactionId = String(transaction?.id || '').trim();
    const cleanDate = transaction?.date || new Date().toISOString().split('T')[0];
    const cleanNote = transaction?.note || transaction?.notes || transaction?.description || '';
    if (
      !cleanTransactionId ||
      !cleanPocketId ||
      !Number.isFinite(cleanAmount) ||
      cleanAmount <= 0 ||
      !Number.isFinite(cleanRate) ||
      cleanRate <= 0
    ) {
      return {
        success: false,
        status: 'error',
        message: 'Payload transaksi tidak lengkap atau nominal/kurs tidak valid.',
      };
    }

    // Standard sanitized transaction payload
    const sanitizedPayload = {
      ...transaction,
      id: cleanTransactionId,
      pocketId: cleanPocketId,
      amount: isNaN(cleanAmount) ? 0 : cleanAmount,
      rate: isNaN(cleanRate) ? 1 : cleanRate,
      totalIdr: isNaN(cleanTotalIdr) ? 0 : (typeCode === 'IN' ? cleanTotalIdr : -cleanTotalIdr),
      type: typeCode,
      date: cleanDate,
      note: cleanNote,
      // Field kompatibilitas internal
      nativeAmount: isNaN(cleanAmount) ? 0 : cleanAmount,
      exchangeRate: isNaN(cleanRate) ? 1 : cleanRate,
      costIdr: isNaN(cleanTotalIdr) ? 0 : (typeCode === 'IN' ? cleanTotalIdr : -cleanTotalIdr),
      description: cleanNote,
    };

    const res = await executeApiRequest('', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'save_ledger_transaction',
        userEmail: emailToUse,
        transaction: sanitizedPayload,
      }),
    });
    return await parseJsonResponse(res);
  } catch (err: any) {
    console.warn('Gagal menyimpan transaksi ke Sheets (tersimpan lokal):', err?.message || err);
    return null;
  }
};

export const syncRemotePockets = async (
  pockets: any[],
  userEmail: string = currentUserEmail
): Promise<{ success: boolean; [key: string]: any } | null> => {
  try {
    const emailToUse = resolveUserEmail(userEmail);
    if (!emailToUse) {
      console.warn('Sinkronisasi kantong dibatalkan: email tenant aktif tidak tersedia.');
      return null;
    }
    const nowIso = new Date().toISOString();

    // Map each pocket to format expected by Sheets, termasuk valuasi manual investasi.
    const formattedPockets = pockets.map((p, idx) => {
      const sourceId = String(p?.id || p?.pocketId || '').trim();
      if (!sourceId) throw new Error(`Kantong pada posisi ${idx + 1} tidak memiliki pocketId.`);
      const normalizedPocket = normalizeRemotePocket(p, idx);
      return {
      id: normalizedPocket.id,
      userEmail: emailToUse,
      name: normalizedPocket.name,
      instrumentType: normalizedPocket.instrumentType,
      currency: normalizedPocket.currencyCode,
      custodian: String(normalizedPocket.custodian || normalizedPocket.defaultCustodian || 'CIMB Niaga').trim(),
      category: String(normalizedPocket.category || '').trim(),
      sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : idx + 1,
      manualMarketRate: Number(p.manualMarketRate || 0) || '',
      marketValue: Number.isFinite(Number(p.marketValue)) ? Number(p.marketValue) : undefined,
      lastPriceUpdatedAt: p.lastPriceUpdatedAt || '',
      updatedAt: p.updatedAt || nowIso,
    };
    });

    const res = await executeApiRequest('', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sync_ledger_pockets',
        userEmail: emailToUse,
        pockets: formattedPockets,
      }),
    });
    return await parseJsonResponse(res);
  } catch (err: any) {
    console.warn('Gagal sinkron kantong ke Sheets (tersimpan lokal):', err?.message || err);
    return null;
  }
};

export const updateRemotePocketMarketRate = async (
  pocketId: string,
  manualMarketRate: number,
  lastPriceUpdatedAt: string,
  userEmail: string = currentUserEmail,
  marketValue?: number
): Promise<{ success: boolean; message?: string; [key: string]: any } | null> => {
  try {
    const emailToUse = resolveUserEmail(userEmail);
    const normalizedPocketId = String(pocketId || '').trim();
    const rate = Number(manualMarketRate);
    const totalMarketValue = Number(marketValue);
    if (!emailToUse || !normalizedPocketId || !Number.isFinite(rate) || rate <= 0) return null;
    if (marketValue !== undefined && (!Number.isFinite(totalMarketValue) || totalMarketValue < 0)) return null;

    const res = await executeApiRequest('', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'update_ledger_pocket_market_rate',
        userEmail: emailToUse,
        pocketId: normalizedPocketId,
        manualMarketRate: rate,
        marketValue: marketValue === undefined ? undefined : totalMarketValue,
        lastPriceUpdatedAt,
      }),
    });
    return await parseJsonResponse(res);
  } catch (err: any) {
    console.warn('Gagal menyimpan harga pasar kantong:', err?.message || err);
    return null;
  }
};

export const deleteRemoteTransaction = async (
  txId: string,
  userEmail: string = currentUserEmail
): Promise<{ success: boolean; [key: string]: any } | null> => {
  try {
    const emailToUse = resolveUserEmail(userEmail);
    if (!emailToUse) {
      console.warn('Hapus transaksi dibatalkan: email tenant aktif tidak tersedia.');
      return null;
    }
    const res = await executeApiRequest('', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'delete_ledger_transaction',
        userEmail: emailToUse,
        id: txId,
        transactionId: txId,
      }),
    });
    return await parseJsonResponse(res);
  } catch (err: any) {
    console.warn('Gagal menghapus transaksi dari Sheets (dihapus lokal):', err?.message || err);
    return null;
  }
};

export interface DeletePocketCascadeResult {
  success: boolean;
  status?: string;
  deletedPocketRows?: number;
  deletedTransactionRows?: number;
  message?: string;
  [key: string]: any;
}

/**
 * Menghapus satu kantong beserta seluruh transaksi milik tenant yang sama.
 * Operasi sebenarnya dilakukan secara atomik oleh Google Apps Script.
 */
export const deleteRemotePocketCascade = async (
  pocketId: string,
  userEmail: string = currentUserEmail
): Promise<DeletePocketCascadeResult | null> => {
  try {
    const emailToUse = resolveUserEmail(userEmail);
    const normalizedPocketId = String(pocketId || '').trim();

    if (!emailToUse || !normalizedPocketId) {
      console.warn('Cascade delete dibatalkan: email tenant atau pocketId tidak tersedia.');
      return null;
    }

    const res = await executeApiRequest('', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'delete_ledger_pocket_cascade',
        userEmail: emailToUse,
        pocketId: normalizedPocketId,
      }),
    }, DELETE_POCKET_TIMEOUT_MS);

    const result = await parseJsonResponse<DeletePocketCascadeResult>(res);
    return {
      ...result,
      success:
        result?.success === true ||
        (result?.status === 'success' && result?.success !== false),
    };
  } catch (err: any) {
    console.warn('Gagal menghapus kantong secara cascade:', err?.message || err);
    const isTimeout = err?.name === 'AbortError';
    return {
      success: false,
      status: isTimeout ? 'timeout' : 'error',
      message: isTimeout
        ? 'Waktu penghapusan kantong melebihi 10 detik.'
        : 'Google Sheets gagal memproses penghapusan kantong.',
    };
  }
};
