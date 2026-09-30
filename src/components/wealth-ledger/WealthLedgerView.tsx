import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  AssetPocket,
  CurrencyPocketSummary,
  CurrencyType,
  LedgerTransaction,
  TransactionType,
  ReconciliationStatus,
  DiscrepancyDetail,
} from '../../types/ledger';
import {
  computeCurrencyPocketSummary,
  computeEnrichedTransactions,
  computeGlobalWealthSummary,
  filterValidTransactions,
} from '../../utils/calculator';
import {
  loadManualPricesFromStorage,
  loadMarketRatesFromStorage,
  saveManualPricesToStorage,
  saveMarketRatesToStorage,
} from '../../utils/storage';
import {
  CurrencyWatchlistItem,
  FALLBACK_RAW_RATES,
  buildLiveFxRateMap,
  buildWatchlistItems,
  fetchUniversalCurrencyRates,
  loadCurrencyCacheFromStorage,
} from '../../services/currencyService';
import {
  fetchRemoteLedgerData,
  loadCachedLedgerData,
  saveCachedLedgerData,
  saveRemoteTransaction,
  syncRemotePockets,
  deleteRemoteTransaction,
  deleteRemotePocketCascade,
  updateRemotePocketMarketRate,
  repairRemoteOrphanPockets,
  setCurrentUserEmail,
} from '../../services/ledgerApiService';
import { exportLedgerTransactionsToCsv } from '../../services/reportService';
import { GlobalMetrics } from './GlobalMetrics';
import { CurrencyWatchlistModal } from './CurrencyWatchlistModal';
import { PocketGrid } from './PocketGrid';
import { PocketDetailView } from './PocketDetailView';
import { TransactionTable } from './TransactionTable';
import { TransactionModal } from './TransactionModal';
import { MarketRateModal } from './MarketRateModal';
import { BackupRestoreModal } from './BackupRestoreModal';
import { PocketManagerModal } from './PocketManagerModal';
import { MonthlyReportModal } from './MonthlyReportModal';
import { StatementDownloadModal } from './StatementDownloadModal';
import {
  FolderKanban,
  FileSpreadsheet,
  ChevronDown,
  FileText,
  RefreshCw,
} from 'lucide-react';

export type MainViewMode = 'POCKETS' | 'GLOBAL_LEDGER';

const isLedgerMutationSuccess = (result: any): boolean =>
  result?.success === true || result?.status === 'success';

export interface WealthLedgerProps {
  currentUserEmail?: string;
  clientName?: string;
  monthlySurplusCapacity?: number;
}

export const WealthLedgerView: React.FC<WealthLedgerProps> = ({
  currentUserEmail,
  clientName,
  monthlySurplusCapacity: monthlySurplusCapacityProp,
}) => {
  const effectiveEmail = currentUserEmail?.trim().toLowerCase() || '';
  const [initialLedgerCache] = useState(() =>
    effectiveEmail ? loadCachedLedgerData(effectiveEmail) : null
  );

  useEffect(() => {
    setCurrentUserEmail(effectiveEmail);
  }, [effectiveEmail]);

  // Cache tenant aktif ditampilkan pada render pertama; Sheets direvalidasi di background.
  const [transactions, setTransactions] = useState<LedgerTransaction[]>(() =>
    Array.isArray(initialLedgerCache?.transactions) ? initialLedgerCache.transactions : []
  );
  const [pockets, setPockets] = useState<AssetPocket[]>(() =>
    Array.isArray(initialLedgerCache?.pockets) ? initialLedgerCache.pockets : []
  );

  const [manualPrices, setManualPrices] = useState<Record<string, number>>(() =>
    loadManualPricesFromStorage()
  );
  const [marketRates, setMarketRates] = useState<Record<string, number>>(() => {
    const storedRates = loadMarketRatesFromStorage();
    const cachedLiveFx = loadCurrencyCacheFromStorage();
    return cachedLiveFx
      ? { ...storedRates, ...buildLiveFxRateMap(cachedLiveFx), IDR: 1 }
      : storedRates;
  });

  // 2. Navigation & View State (Bank Jago Pro Pattern)
  const [mainView, setMainView] = useState<MainViewMode>('POCKETS');
  const [activePocketId, setActivePocketId] = useState<string | null>(null);

  // 3. Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<LedgerTransaction | null>(null);
  const [txModalDefaults, setTxModalDefaults] = useState<{
    pocketId?: string;
    currency: CurrencyType;
    type: TransactionType;
  }>({
    pocketId: undefined,
    currency: 'CHF',
    type: 'CREDIT',
  });

  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isPocketModalOpen, setIsPocketModalOpen] = useState(false);
  const [isFxModalOpen, setIsFxModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const reportMenuRef = useRef<HTMLDivElement>(null);
  const [isScopedPocketTx, setIsScopedPocketTx] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 4. Live Currency Watchlist State (myBCA / OCTO Mobile Compact Ticker)
  const [watchlist, setWatchlist] = useState<CurrencyWatchlistItem[]>(() => {
    const cached = loadCurrencyCacheFromStorage();
    if (cached && cached.watchlist && cached.watchlist.length > 0) {
      return cached.watchlist;
    }
    return buildWatchlistItems(FALLBACK_RAW_RATES);
  });

  // 5. Live FX Engine State (Auto-Fetch & Background Cache)
  const [liveStatus, setLiveStatus] = useState<{
    isLoading: boolean;
    lastUpdated: string | null;
    isLive: boolean;
    error: string | null;
  }>(() => {
    const cached = loadCurrencyCacheFromStorage();
    return {
      isLoading: false,
      lastUpdated: cached?.lastUpdated || null,
      isLive: !!cached,
      error: null,
    };
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (!isReportMenuOpen) return;

    const closeReportMenu = (event: MouseEvent) => {
      if (!reportMenuRef.current?.contains(event.target as Node)) {
        setIsReportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeReportMenu);
    return () => document.removeEventListener('mousedown', closeReportMenu);
  }, [isReportMenuOpen]);

  // Google Apps Script Cloud Sync State
  const [monthlySurplusCapacity, setMonthlySurplusCapacity] = useState<number>(
    monthlySurplusCapacityProp ?? 15511915
  );

  useEffect(() => {
    if (monthlySurplusCapacityProp !== undefined && monthlySurplusCapacityProp > 0) {
      setMonthlySurplusCapacity(monthlySurplusCapacityProp);
    }
  }, [monthlySurplusCapacityProp]);

  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isDeletingPocket, setIsDeletingPocket] = useState(false);
  const [isLedgerLoading, setIsLedgerLoading] = useState(!initialLedgerCache);
  const [ledgerLoadError, setLedgerLoadError] = useState<string | null>(null);
  const [isUsingLedgerCache, setIsUsingLedgerCache] = useState(Boolean(initialLedgerCache));
  const [lastSheetsSyncTime, setLastSheetsSyncTime] = useState<string | null>(() => {
    if (!initialLedgerCache?.cacheSavedAt) return null;
    return new Date(initialLedgerCache.cacheSavedAt).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });
  const ledgerRequestIdRef = useRef(0);
  const ledgerMutationVersionRef = useRef(0);
  const pendingLedgerWritesRef = useRef(new Map<string, number>());
  const ledgerWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const transactionsRef = useRef(transactions);
  const pocketsRef = useRef(pockets);
  const activeTenantEmailRef = useRef(effectiveEmail);
  activeTenantEmailRef.current = effectiveEmail;

  // State helpers: setiap pocketId hanya boleh menghasilkan satu kartu UI.
  const updateTransactions = useCallback((newTxs: LedgerTransaction[]) => {
    const normalized = newTxs.map((transaction) => ({
      ...transaction,
      pocketId: String(transaction.pocketId ?? '').trim(),
    }));
    transactionsRef.current = normalized;
    setTransactions(normalized);
  }, []);

  const updatePockets = useCallback((newPockets: AssetPocket[]) => {
    const uniqueById = new Map<string, AssetPocket>();
    newPockets.forEach((pocket) => {
      const rawId = pocket.id || (pocket as AssetPocket & { pocketId?: string }).pocketId;
      const normalized = { ...pocket, id: String(rawId ?? '').trim() };
      if (normalized.id) uniqueById.set(normalized.id, normalized);
    });
    const normalizedPockets = Array.from(uniqueById.values());
    pocketsRef.current = normalizedPockets;
    setPockets(normalizedPockets);
  }, []);

  const persistLedgerSnapshot = useCallback((
    nextPockets: AssetPocket[],
    nextTransactions: LedgerTransaction[]
  ) => {
    const email = effectiveEmail.trim().toLowerCase();
    if (!email) return;
    saveCachedLedgerData(email, {
      pockets: nextPockets,
      transactions: nextTransactions,
      monthlySurplusCapacity,
      lastUpdated: new Date().toISOString(),
    });
  }, [effectiveEmail, monthlySurplusCapacity]);

  const enqueueLedgerWrite = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    const queued = ledgerWriteQueueRef.current.then(operation, operation);
    ledgerWriteQueueRef.current = queued.then(() => undefined, () => undefined);
    return queued;
  }, []);

  const beginLedgerWrite = useCallback((tenantEmail: string) => {
    const pending = pendingLedgerWritesRef.current.get(tenantEmail) || 0;
    pendingLedgerWritesRef.current.set(tenantEmail, pending + 1);
  }, []);

  const finishLedgerWrite = useCallback((tenantEmail: string) => {
    const remaining = Math.max(0, (pendingLedgerWritesRef.current.get(tenantEmail) || 1) - 1);
    if (remaining === 0) pendingLedgerWritesRef.current.delete(tenantEmail);
    else pendingLedgerWritesRef.current.set(tenantEmail, remaining);
    if (remaining === 0 && activeTenantEmailRef.current === tenantEmail) {
      persistLedgerSnapshot(pocketsRef.current, transactionsRef.current);
    }
  }, [persistLedgerSnapshot]);

  const loadLedgerData = useCallback(async (
    showSuccessToast = false,
    silentRevalidation = false
  ): Promise<boolean> => {
    const email = effectiveEmail.trim().toLowerCase();
    if (!email) {
      setIsLedgerLoading(false);
      setLedgerLoadError('Email tenant aktif belum tersedia.');
      return false;
    }

    const requestId = ++ledgerRequestIdRef.current;
    const mutationVersionAtStart = ledgerMutationVersionRef.current;
    if (!silentRevalidation) setIsLedgerLoading(true);
    setLedgerLoadError(null);

    try {
      const data = await fetchRemoteLedgerData(email, { persistCache: false });
      if (requestId !== ledgerRequestIdRef.current) return false;
      if (
        mutationVersionAtStart !== ledgerMutationVersionRef.current ||
        (pendingLedgerWritesRef.current.get(email) || 0) > 0
      ) {
        // Snapshot remote dimulai sebelum write lokal selesai; jangan timpa state/cache terbaru.
        return false;
      }
      if (!data) {
        throw new Error('Google Sheets belum dapat dijangkau dan cache lokal belum tersedia.');
      }

      const usingCache = data.source === 'cache';
      setIsUsingLedgerCache(usingCache);

      const remotePockets = Array.isArray(data.pockets) ? data.pockets : [];
      const activePocketIds = new Set(
        remotePockets.map((pocket) => String(pocket.id || '').trim()).filter(Boolean)
      );
      const remoteTransactions = Array.isArray(data.transactions)
        ? filterValidTransactions(data.transactions).filter((transaction) =>
            activePocketIds.has(String(transaction.pocketId || '').trim())
          )
        : [];

      if (data.monthlySurplusCapacity && typeof data.monthlySurplusCapacity === 'number') {
        setMonthlySurplusCapacity(data.monthlySurplusCapacity);
      }
      updatePockets(remotePockets);
      updateTransactions(remoteTransactions);
      if (!usingCache) {
        saveCachedLedgerData(email, {
          ...data,
          pockets: remotePockets,
          transactions: remoteTransactions,
        });
      }
      if (!usingCache) {
        // Maintenance berjalan setelah snapshot utama tersedia agar tidak memperlambat initial load.
        void repairRemoteOrphanPockets(email);
      }
      setActivePocketId((current) =>
        current && activePocketIds.has(current) ? current : null
      );
      const statusTime = usingCache && data.cacheSavedAt ? new Date(data.cacheSavedAt) : new Date();
      setLastSheetsSyncTime(
        statusTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      );
      if (showSuccessToast) {
        showToast(
          usingCache
            ? 'Google Sheets belum tersedia. Menampilkan data cache terakhir.'
            : 'Data berhasil disinkronkan dengan Google Sheets.'
        );
      }
      return true;
    } catch (err: any) {
      if (requestId !== ledgerRequestIdRef.current) return false;
      const message = err?.message || 'Koneksi Google Sheets tidak tersedia.';
      console.warn('Load ledger warning:', message);
      setIsUsingLedgerCache(false);
      setLedgerLoadError(message);
      if (showSuccessToast) {
        showToast('Sinkronisasi gagal. Silakan coba lagi.');
      }
      return false;
    } finally {
      if (requestId === ledgerRequestIdRef.current) {
        setIsLedgerLoading(false);
      }
    }
  }, [effectiveEmail, showToast, updateTransactions, updatePockets]);

  const handleSyncWithSheets = useCallback(async () => {
    if (!effectiveEmail) {
      showToast('Menunggu sesi dan email klien aktif.');
      return;
    }
    setIsSyncingSheets(true);
    try {
      await loadLedgerData(true, true);
    } finally {
      setIsSyncingSheets(false);
    }
  }, [effectiveEmail, loadLedgerData, showToast]);

  // Stale-while-revalidate: tampilkan cache tenant seketika, lalu fetch Sheets diam-diam.
  useEffect(() => {
    if (!effectiveEmail) {
      setIsLedgerLoading(false);
      setLedgerLoadError('Email tenant aktif belum tersedia.');
      return;
    }

    const cached = loadCachedLedgerData(effectiveEmail);
    const cachedPockets = Array.isArray(cached?.pockets) ? cached.pockets : [];
    const cachedPocketIds = new Set(
      cachedPockets.map((pocket) => String(pocket.id || '').trim()).filter(Boolean)
    );
    const cachedTransactions = Array.isArray(cached?.transactions)
      ? filterValidTransactions(cached.transactions).filter((transaction) =>
          cachedPocketIds.has(String(transaction.pocketId || '').trim())
        )
      : [];

    updatePockets(cachedPockets);
    updateTransactions(cachedTransactions);
    setActivePocketId(null);
    setIsUsingLedgerCache(Boolean(cached));
    setLedgerLoadError(null);
    setIsLedgerLoading(!cached);
    if (cached?.cacheSavedAt) {
      setLastSheetsSyncTime(
        new Date(cached.cacheSavedAt).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } else {
      setLastSheetsSyncTime(null);
    }

    void loadLedgerData(false, Boolean(cached));

    return () => {
      ledgerRequestIdRef.current += 1;
    };
  }, [effectiveEmail, loadLedgerData, updatePockets, updateTransactions]);

  const updateManualPrices = useCallback((newPrices: Record<string, number>) => {
    setManualPrices(newPrices);
    saveManualPricesToStorage(newPrices);
  }, []);

  const updateMarketRates = useCallback((newRates: Record<string, number>) => {
    setMarketRates(newRates);
    saveMarketRatesToStorage(newRates);
  }, []);

  // Satu sumber kurs untuk seluruh UI dan kalkulasi. Watchlist adalah data yang
  // ditampilkan modal Live FX Benchmark, sehingga harus menang atas cache lama.
  const liveFxRates = useMemo(() => ({
    ...marketRates,
    ...Object.fromEntries(
      watchlist
        .filter((item) => Number.isFinite(Number(item.rateToIdr)) && Number(item.rateToIdr) > 0)
        .map((item) => [String(item.code).toUpperCase(), Number(item.rateToIdr)])
    ),
    IDR: 1,
  }), [marketRates, watchlist]);

  // Universal Live FX Fetcher Function using Universal Currency Data Service
  const refreshLiveRates = useCallback(async () => {
    setLiveStatus((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await fetchUniversalCurrencyRates();

      if (res.idrRates && res.watchlist) {
        const latestFxRates = buildLiveFxRateMap(res);
        setWatchlist(res.watchlist);
        updateMarketRates({ ...marketRates, ...latestFxRates, IDR: 1 });
        setLiveStatus({
          isLoading: false,
          lastUpdated: res.lastUpdated,
          isLive: res.success,
          error: res.success ? null : res.error || 'Offline / Menggunakan cache kurs terakhir',
        });
        if (res.success) {
          showToast('Kurs live 14 valas portofolio berhasil diperbarui.');
        }
      } else {
        if (res.watchlist) {
          setWatchlist(res.watchlist);
        }
        setLiveStatus((prev) => ({
          ...prev,
          isLoading: false,
          isLive: false,
          error: res.error || 'Offline / Menggunakan kurs cadangan',
        }));
      }
    } catch (err: any) {
      console.error('Failed to auto-fetch live FX rates:', err);
      setLiveStatus((prev) => ({
        ...prev,
        isLoading: false,
        isLive: false,
        error: 'Koneksi API gagal',
      }));
    }
  }, [marketRates, updateMarketRates, showToast]);

  // Initial Auto-Fetch on mount
  useEffect(() => {
    refreshLiveRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 6. Computed Pocket Summaries & Global Net Worth
  const currencyPockets: CurrencyPocketSummary[] = useMemo(() => {
    return pockets.map((pocket) => {
      const code = (pocket.currencyCode || 'IDR').toUpperCase();
      const supportsManualValuation =
        pocket.instrumentType === 'LOGAM_MULIA' ||
        pocket.instrumentType === 'REKSADANA' ||
        pocket.instrumentType === 'SAHAM_ETF' ||
        pocket.instrumentType === 'SINKING_FUND' ||
        pocket.instrumentType === 'ASET_FISIK';
      const currentRate =
        supportsManualValuation && Number(pocket.manualMarketRate) > 0
          ? Number(pocket.manualMarketRate)
          : code === 'IDR'
          ? 1
          : liveFxRates[code] || pocket.manualMarketPrice || 1;

      return computeCurrencyPocketSummary(
        code,
        transactions,
        currentRate,
        pocket
      );
    });
  }, [pockets, transactions, liveFxRates]);

  const globalSummary = useMemo(() => {
    return computeGlobalWealthSummary(currencyPockets);
  }, [currencyPockets]);

  const enrichedTransactions = useMemo(() => {
    return computeEnrichedTransactions(transactions);
  }, [transactions]);

  const activePocketSummary = useMemo(() => {
    if (!activePocketId) return null;
    return currencyPockets.find((p) => p.pocketId === activePocketId) || null;
  }, [activePocketId, currencyPockets]);

  // Real Checksum Reconciliation Status
  const reconciliationInfo: ReconciliationStatus = useMemo(() => {
    const discrepantPockets: string[] = [];
    const discrepancies: DiscrepancyDetail[] = [];

    currencyPockets.forEach((cp) => {
      const rawTxBal = transactions
        .filter((t) => String(t.pocketId ?? '').trim() === String(cp.pocketId ?? '').trim())
        .reduce(
          (acc, t) => (t.type === 'CREDIT' ? acc + t.nativeAmount : acc - t.nativeAmount),
          0
        );

      const isMatching = Math.abs(rawTxBal - cp.balanceNative) < 0.0001;
      const isNonNegative = rawTxBal >= -0.0001;

      if (!isNonNegative) {
        discrepantPockets.push(cp.name);
        discrepancies.push({
          pocketId: cp.pocketId,
          pocketName: cp.name,
          currencyCode: cp.currency,
          symbol: cp.symbol,
          flag: cp.flag,
          balanceNative: rawTxBal,
          issueDescription: `Saldo negatif ${cp.symbol || cp.currency} ${rawTxBal.toLocaleString('id-ID')}`,
        });
      } else if (!isMatching) {
        discrepantPockets.push(cp.name);
        discrepancies.push({
          pocketId: cp.pocketId,
          pocketName: cp.name,
          currencyCode: cp.currency,
          symbol: cp.symbol,
          flag: cp.flag,
          balanceNative: rawTxBal,
          issueDescription: `Selisih mutasi (${rawTxBal.toLocaleString('id-ID')}) ≠ saldo (${cp.balanceNative.toLocaleString('id-ID')})`,
        });
      }
    });

    const orphanTxs = transactions.filter(
      (t) =>
        !pockets.some(
          (p) => String(p.id ?? '').trim() === String(t.pocketId ?? '').trim()
        )
    );
    if (orphanTxs.length > 0) {
      discrepantPockets.push(`${orphanTxs.length} Mutasi Tanpa Kantong`);
      discrepancies.push({
        pocketName: 'Mutasi Tanpa Kantong Terdaftar',
        currencyCode: 'N/A',
        symbol: '⚠️',
        flag: '❓',
        balanceNative: 0,
        issueDescription: `${orphanTxs.length} mutasi tidak terhubung dengan kantong manapun`,
      });
    }

    return {
      isSynced: discrepancies.length === 0,
      discrepancyCount: discrepancies.length,
      discrepantPockets,
      discrepancies,
    };
  }, [currencyPockets, transactions, pockets]);

  const handleNavigateToPocket = (pocketId?: string) => {
    if (!pocketId) return;
    setMainView('POCKETS');
    setActivePocketId(pocketId);
  };

  // 7. Handlers for CRUD Operations
  const handleOpenNewTx = (
    pocketIdOrCurr?: string,
    defaultType: TransactionType = 'CREDIT',
    isScoped: boolean = false
  ) => {
    setEditingTx(null);
    setIsScopedPocketTx(isScoped);

    const targetPocket =
      pockets.find((p) => p.id === pocketIdOrCurr) ||
      (pocketIdOrCurr
        ? pockets.find(
            (p) =>
              (p.currencyCode || '').toUpperCase() ===
              (pocketIdOrCurr || '').toUpperCase()
          )
        : undefined) ||
      pockets.find((p) => p.id === activePocketId) ||
      pockets[0];

    setTxModalDefaults({
      pocketId: targetPocket?.id,
      currency: targetPocket?.currencyCode || 'CHF',
      type: defaultType,
    });
    setIsTxModalOpen(true);
  };

  const handleEditTx = (tx: LedgerTransaction) => {
    setEditingTx(tx);
    setIsScopedPocketTx(false);
    setTxModalDefaults({
      pocketId: tx.pocketId,
      currency: tx.currency,
      type: tx.type,
    });
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = async (tx: LedgerTransaction) => {
    if (tx.type === 'DEBET') {
      const currentBalance = transactions
        .filter(
          (t) =>
            (String(t.pocketId ?? '').trim() === String(tx.pocketId ?? '').trim() ||
              (!t.pocketId && t.currency === tx.currency)) &&
            t.id !== tx.id
        )
        .reduce(
          (acc, t) => (t.type === 'CREDIT' ? acc + t.nativeAmount : acc - t.nativeAmount),
          0
        );

      if (tx.nativeAmount > currentBalance + 0.000001) {
        showToast(
          `Gagal: Penarikan melebihi saldo tersedia (${currentBalance.toLocaleString('id-ID')} ${tx.currency}).`
        );
        return;
      }
    }

    const existingIndex = transactions.findIndex((t) => t.id === tx.id);
    let updated: LedgerTransaction[];

    if (existingIndex >= 0) {
      updated = [...transactions];
      updated[existingIndex] = tx;
    } else {
      updated = [tx, ...transactions];
    }

    const previousTransaction = existingIndex >= 0 ? transactions[existingIndex] : undefined;
    const mutationTenant = effectiveEmail;
    ledgerMutationVersionRef.current += 1;
    beginLedgerWrite(mutationTenant);
    updateTransactions(updated);
    try {
      const result = await enqueueLedgerWrite(() => saveRemoteTransaction(tx, mutationTenant));
      if (activeTenantEmailRef.current !== mutationTenant) return;
      if (!isLedgerMutationSuccess(result)) {
        throw new Error(result?.message || 'Google Sheets tidak mengonfirmasi penyimpanan transaksi.');
      }
      showToast(
        existingIndex >= 0
          ? `Transaksi "${tx.description}" berhasil diperbarui.`
          : `Transaksi "${tx.description}" berhasil disimpan ke Google Sheets.`
      );
    } catch (error: any) {
      if (activeTenantEmailRef.current !== mutationTenant) return;
      ledgerMutationVersionRef.current += 1;
      const withoutFailedWrite = transactionsRef.current.filter((item) => item.id !== tx.id);
      updateTransactions(previousTransaction ? [previousTransaction, ...withoutFailedWrite] : withoutFailedWrite);
      showToast(error?.message || 'Transaksi gagal disimpan ke Google Sheets. Perubahan dibatalkan.');
    } finally {
      finishLedgerWrite(mutationTenant);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    const updated = transactions.filter((t) => t.id !== id);
    const mutationTenant = effectiveEmail;
    ledgerMutationVersionRef.current += 1;
    beginLedgerWrite(mutationTenant);
    updateTransactions(updated);
    try {
      const result = await enqueueLedgerWrite(() => deleteRemoteTransaction(id, mutationTenant));
      if (activeTenantEmailRef.current !== mutationTenant) return;
      if (!isLedgerMutationSuccess(result)) {
        throw new Error(result?.message || 'Google Sheets tidak mengonfirmasi penghapusan transaksi.');
      }
      showToast(`Baris transaksi "${tx?.description || id}" telah dihapus.`);
    } catch (error: any) {
      if (activeTenantEmailRef.current !== mutationTenant) return;
      ledgerMutationVersionRef.current += 1;
      const currentTransactions = transactionsRef.current;
      updateTransactions(
        tx && !currentTransactions.some((item) => item.id === tx.id)
          ? [tx, ...currentTransactions]
          : currentTransactions
      );
      showToast(error?.message || 'Transaksi gagal dihapus dari Google Sheets.');
    } finally {
      finishLedgerWrite(mutationTenant);
    }
  };

  const handleUpdatePocketMarketRate = async (
    pocketId: string,
    manualMarketRate: number,
    marketValue: number
  ): Promise<boolean> => {
    const normalizedPocketId = String(pocketId || '').trim();
    const rate = Number(manualMarketRate);
    const totalMarketValue = Number(marketValue);
    if (!normalizedPocketId || !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(totalMarketValue) || totalMarketValue < 0 || !effectiveEmail) {
      showToast('Harga pasar dan email klien harus valid.');
      return false;
    }

    const previousPocket = pockets.find((pocket) => pocket.id === normalizedPocketId);
    const mutationTenant = effectiveEmail;
    const lastPriceUpdatedAt = new Date().toISOString();
    const updatedPockets = pockets.map((pocket) =>
      String(pocket.id || '').trim() === normalizedPocketId
        ? { ...pocket, manualMarketRate: rate, marketValue: totalMarketValue, lastPriceUpdatedAt, updatedAt: lastPriceUpdatedAt }
        : pocket
    );

    ledgerMutationVersionRef.current += 1;
    beginLedgerWrite(mutationTenant);
    updatePockets(updatedPockets);
    try {
      const result = await enqueueLedgerWrite(() => updateRemotePocketMarketRate(
        normalizedPocketId,
        rate,
        lastPriceUpdatedAt,
        mutationTenant,
        totalMarketValue
      ));
      if (activeTenantEmailRef.current !== mutationTenant) return false;
      if (!isLedgerMutationSuccess(result)) {
        throw new Error(result?.message || 'Harga pasar gagal disimpan ke Google Sheets.');
      }
      showToast('Harga pasar / NAB berhasil diperbarui.');
      return true;
    } catch (error: any) {
      if (activeTenantEmailRef.current !== mutationTenant) return false;
      ledgerMutationVersionRef.current += 1;
      const withoutFailedWrite = pocketsRef.current.filter((pocket) => pocket.id !== normalizedPocketId);
      updatePockets(previousPocket ? [...withoutFailedWrite, previousPocket] : withoutFailedWrite);
      showToast(error?.message || 'Harga pasar gagal disimpan ke Google Sheets.');
      return false;
    } finally {
      finishLedgerWrite(mutationTenant);
    }
  };

  // Pocket Management Handlers
  const handleSavePocket = async (pocketToSave: AssetPocket) => {
    const existingIndex = pockets.findIndex((p) => p.id === pocketToSave.id);
    let updated: AssetPocket[];

    if (existingIndex >= 0) {
      updated = [...pockets];
      updated[existingIndex] = pocketToSave;
    } else {
      updated = [...pockets, pocketToSave];
    }

    if (pocketToSave.manualMarketPrice) {
      const pCode = (pocketToSave.currencyCode || 'IDR').toUpperCase();
      updateManualPrices({
        ...manualPrices,
        [pCode]: pocketToSave.manualMarketPrice,
      });
    }

    const previousPocket = existingIndex >= 0 ? pockets[existingIndex] : undefined;
    const mutationTenant = effectiveEmail;
    ledgerMutationVersionRef.current += 1;
    beginLedgerWrite(mutationTenant);
    updatePockets(updated);
    try {
      const result = await enqueueLedgerWrite(() => syncRemotePockets(updated, mutationTenant));
      if (activeTenantEmailRef.current !== mutationTenant) return;
      if (!isLedgerMutationSuccess(result)) {
        throw new Error(result?.message || 'Google Sheets tidak mengonfirmasi penyimpanan kantong.');
      }
      showToast(
        existingIndex >= 0
          ? `Kantong "${pocketToSave.name}" berhasil diperbarui.`
          : `Kantong baru "${pocketToSave.name}" berhasil disimpan ke Google Sheets.`
      );
    } catch (error: any) {
      if (activeTenantEmailRef.current !== mutationTenant) return;
      ledgerMutationVersionRef.current += 1;
      const withoutFailedWrite = pocketsRef.current.filter((pocket) => pocket.id !== pocketToSave.id);
      updatePockets(previousPocket ? [...withoutFailedWrite, previousPocket] : withoutFailedWrite);
      showToast(error?.message || 'Kantong gagal disimpan ke Google Sheets. Perubahan dibatalkan.');
    } finally {
      finishLedgerWrite(mutationTenant);
    }
  };

  const handleDeletePocket = async (pocketId: string) => {
    const normalizedPocketId = String(pocketId || '').trim();
    const target = pockets.find(
      (p) => String((p as AssetPocket & { pocketId?: string }).pocketId || p.id).trim() === normalizedPocketId
    );
    if (!target) return false;

    const relatedTransactions = transactions.filter(
      (tx) => String(tx.pocketId || '').trim() === normalizedPocketId
    );
    const remainingPockets = pockets.filter(
      (p) => String((p as AssetPocket & { pocketId?: string }).pocketId || p.id).trim() !== normalizedPocketId
    );

    const remainingTransactions = transactions.filter(
      (tx) => String(tx.pocketId || '').trim() !== normalizedPocketId
    );

    const previousActivePocketId = activePocketId;
    const mutationTenant = effectiveEmail;

    ledgerMutationVersionRef.current += 1;
    beginLedgerWrite(mutationTenant);

    // Optimistic state agar kartu dan mutasinya langsung hilang dari UI.
    updatePockets(remainingPockets);
    updateTransactions(remainingTransactions);

    if (activePocketId === normalizedPocketId) {
      setActivePocketId(null);
    }

    setIsDeletingPocket(true);
    let remoteDeleteSucceeded = false;
    try {
      // Sync master tidak pernah menghapus baris. Penghapusan hanya melalui
      // endpoint cascade eksplisit agar kantong lain tidak dapat ter-overwrite.
      const deleteResult = await enqueueLedgerWrite(() =>
        deleteRemotePocketCascade(normalizedPocketId, mutationTenant)
      );
      if (activeTenantEmailRef.current !== mutationTenant) return false;
      if (!deleteResult?.success) {
        throw new Error(deleteResult?.message || 'Kantong gagal dihapus dari Google Sheets.');
      }

      showToast(
        `Kantong ${target.name} dan ${relatedTransactions.length} transaksi terkait berhasil dihapus permanen.`
      );
      remoteDeleteSucceeded = true;
      return true;
    } catch {
      if (activeTenantEmailRef.current !== mutationTenant) return false;
      // Rollback segera bila backend gagal/timeout agar data lokal tidak tampak terhapus palsu.
      const currentPockets = pocketsRef.current;
      updatePockets(
        currentPockets.some((pocket) => pocket.id === target.id)
          ? currentPockets
          : [...currentPockets, target]
      );
      const restoredTransactions = new Map(
        transactionsRef.current.map((transaction) => [transaction.id, transaction])
      );
      relatedTransactions.forEach((transaction) => restoredTransactions.set(transaction.id, transaction));
      updateTransactions(Array.from(restoredTransactions.values()));
      setActivePocketId(previousActivePocketId);
      showToast('Gagal menghapus kantong dari Google Sheets, silakan coba lagi');
      return false;
    } finally {
      finishLedgerWrite(mutationTenant);
      setIsDeletingPocket(false);
      if (remoteDeleteSucceeded) {
        window.setTimeout(() => void loadLedgerData(false, true), 0);
      }
    }
  };

  const handleReloadRemoteData = () => {
    setActivePocketId(null);
    setMainView('POCKETS');
    void handleSyncWithSheets();
  };

  // Import JSON handler
  const handleImportSuccess = async (
    importedTxs: LedgerTransaction[],
    importedRates?: Record<CurrencyType, number>,
    importedPockets?: AssetPocket[]
  ): Promise<boolean> => {
    const mutationTenant = effectiveEmail;
    if (!mutationTenant) {
      showToast('Impor dibatalkan karena email tenant tidak tersedia.');
      return false;
    }
    const previousPockets = pocketsRef.current;
    const previousTransactions = transactionsRef.current;
    const restoredPockets = importedPockets?.length ? importedPockets : previousPockets;
    const restoredPocketIds = new Set(restoredPockets.map((pocket) => pocket.id));
    const restoredTransactions = importedTxs.filter((transaction) =>
      restoredPocketIds.has(String(transaction.pocketId || '').trim())
    );

    ledgerMutationVersionRef.current += 1;
    beginLedgerWrite(mutationTenant);
    updatePockets(restoredPockets);
    updateTransactions(restoredTransactions);
    try {
      const saved = await enqueueLedgerWrite(async () => {
        const pocketResult = await syncRemotePockets(restoredPockets, mutationTenant);
        if (!isLedgerMutationSuccess(pocketResult)) {
          throw new Error(pocketResult?.message || 'Master kantong gagal dipulihkan.');
        }
        for (const transaction of restoredTransactions) {
          const transactionResult = await saveRemoteTransaction(transaction, mutationTenant);
          if (!isLedgerMutationSuccess(transactionResult)) {
            throw new Error(transactionResult?.message || `Transaksi ${transaction.id} gagal dipulihkan.`);
          }
        }
        return true;
      });
      if (!saved || activeTenantEmailRef.current !== mutationTenant) return false;
      if (importedRates) updateMarketRates({ ...marketRates, ...importedRates });
      showToast(`Berhasil memulihkan ${restoredTransactions.length} transaksi ke Google Sheets.`);
      return true;
    } catch (error: any) {
      if (activeTenantEmailRef.current === mutationTenant) {
        ledgerMutationVersionRef.current += 1;
        updatePockets(previousPockets);
        updateTransactions(previousTransactions);
        showToast(error?.message || 'Impor ledger gagal disimpan ke Google Sheets.');
      }
      return false;
    } finally {
      finishLedgerWrite(mutationTenant);
    }
  };

  // Export CSV Handler
  const handleExportCsv = () => {
    try {
      exportLedgerTransactionsToCsv(transactions, pockets);
      showToast(`${transactions.length} mutasi berhasil diekspor ke CSV.`);
    } catch (error) {
      console.error('CSV export failed:', error);
      showToast('Gagal membuat file CSV. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Main Container: toolbar modul berada di alur dokumen, bukan header aplikasi kedua. */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        <section
          aria-label="Aksi Wealth Ledger"
          className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs no-print"
        >
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900">Wealth Ledger</h1>
            <p className="text-[11px] text-slate-500">
              {isLedgerLoading
                ? `${clientName ? `${clientName} · ` : ''}Memuat data Google Sheets...`
                : `${clientName ? `${clientName} · ` : ''}${transactions.length} mutasi · ${pockets.length} kantong`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFxModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
            >
              <span aria-hidden="true">💱</span>
              <span>Kurs FX</span>
            </button>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-medium ${
                  ledgerLoadError || isUsingLedgerCache ? 'text-amber-600' : 'text-slate-500'
                }`}
                title={ledgerLoadError || (isUsingLedgerCache ? 'Menampilkan cache lokal terakhir' : undefined)}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    ledgerLoadError || isUsingLedgerCache ? 'bg-amber-500' : lastSheetsSyncTime ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
                {ledgerLoadError
                  ? 'Koneksi bermasalah'
                  : isUsingLedgerCache
                    ? `Mode cache · ${lastSheetsSyncTime || 'tersimpan'}`
                  : lastSheetsSyncTime
                    ? `Terhubung · ${lastSheetsSyncTime}`
                    : 'Belum tersinkron'}
              </span>

              <button
                type="button"
                onClick={handleSyncWithSheets}
                disabled={isSyncingSheets || !effectiveEmail}
                title="Ambil ulang data kantong dan transaksi dari Google Sheets"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 shadow-2xs transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                <span>{isSyncingSheets ? 'Sync...' : 'Sync'}</span>
              </button>
            </div>

            <div ref={reportMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsReportMenuOpen((open) => !open)}
                aria-expanded={isReportMenuOpen}
                aria-haspopup="menu"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
              >
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                <span>Laporan</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {isReportMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsReportMenuOpen(false);
                      setIsReportModalOpen(true);
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Laporan Portofolio A4
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsReportMenuOpen(false);
                      setIsStatementModalOpen(true);
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Rekening Koran / E-Statement
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsReportMenuOpen(false);
                      handleExportCsv();
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Unduh Seluruh Mutasi (CSV)
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {isLedgerLoading && (
          <section aria-label="Memuat data Wealth Ledger" className="space-y-4 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-[212px] rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="h-3 w-2/3 rounded bg-slate-200" />
                  <div className="mt-12 h-7 w-1/2 rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-4/5 rounded bg-slate-100" />
                </div>
              ))}
            </div>
            <div className="h-14 rounded-2xl border border-slate-200 bg-white" />
            <div className="h-52 rounded-2xl border border-slate-200 bg-white" />
          </section>
        )}

        {!isLedgerLoading && ledgerLoadError && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <span>Data Google Sheets belum dapat dimuat: {ledgerLoadError}</span>
            <button
              type="button"
              onClick={handleSyncWithSheets}
              className="rounded-lg bg-amber-100 px-3 py-1.5 font-bold transition hover:bg-amber-200"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!isLedgerLoading && !ledgerLoadError && isUsingLedgerCache && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <span>Google Sheets belum dapat dijangkau. Data terakhir dari cache lokal tetap ditampilkan.</span>
            <button
              type="button"
              onClick={handleSyncWithSheets}
              className="rounded-lg bg-amber-100 px-3 py-1.5 font-bold transition hover:bg-amber-200"
            >
              Coba Sync Lagi
            </button>
          </div>
        )}

        {!isLedgerLoading && !ledgerLoadError && pockets.length === 0 && transactions.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-center">
            <p className="text-sm font-bold text-slate-900">Belum ada transaksi di Wealth Ledger</p>
            <p className="mt-1 text-xs text-slate-500">
              Buat kantong pertama untuk mulai mencatat aset dan transaksi.
            </p>
          </div>
        )}

        <div className={isLedgerLoading ? 'hidden' : 'contents'}>

        {/* A. Ringkasan utama dan alokasi kelas aset */}
        <GlobalMetrics
          summary={globalSummary}
          pocketsCount={pockets.length}
          pockets={currencyPockets}
          transactions={transactions}
          monthlySurplusCapacity={monthlySurplusCapacity}
        />

        {/* B. Clean Segmented Control Switcher */}
        <section aria-label="Navigasi Tampilan Buku Besar" className="space-y-4">
          <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setMainView('POCKETS');
                }}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  mainView === 'POCKETS'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FolderKanban className="w-4 h-4 text-[#32A89C]" />
                <span>Kantong Saya</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 font-sans tabular-nums font-semibold">
                  {pockets.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMainView('GLOBAL_LEDGER');
                }}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  mainView === 'GLOBAL_LEDGER'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-[#32A89C]" />
                <span>Seluruh Mutasi Jurnal</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 font-sans tabular-nums font-semibold">
                  {transactions.length}
                </span>
              </button>
            </div>
          </div>

          {/* D. Dynamic Viewport Content */}
          {mainView === 'POCKETS' ? (
            activePocketSummary ? (
              <PocketDetailView
                pocket={activePocketSummary}
                transactions={enrichedTransactions}
                onBack={() => setActivePocketId(null)}
                onTopUp={(pocketId) => handleOpenNewTx(pocketId, 'CREDIT', true)}
                onWithdraw={(pocketId) => handleOpenNewTx(pocketId, 'DEBET', true)}
                onUpdateMarketRate={handleUpdatePocketMarketRate}
                onOpenPocketManager={() => setIsPocketModalOpen(true)}
                onEditTransaction={handleEditTx}
                onDeleteTransaction={handleDeleteTransaction}
              />
            ) : (
              <PocketGrid
                pockets={currencyPockets}
                rawPockets={pockets}
                onReorderPockets={(updated) => {
                  updatePockets(updated);
                  syncRemotePockets(updated, effectiveEmail).catch((err) => {
                    console.warn('Sync reordered pockets to Sheets failed:', err);
                  });
                  showToast('Urutan posisi kantong berhasil diperbarui');
                }}
                onSelectPocket={(pocketId) => setActivePocketId(pocketId)}
                onOpenPocketManager={() => setIsPocketModalOpen(true)}
              />
            )
          ) : (
            <section aria-label="Seluruh Mutasi Jurnal Lintas Valas" className="space-y-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Buku Besar Seluruh Mutasi Transaksi
                </h2>
                <p className="text-xs text-slate-500">
                  Pencatatan debet, kredit, kurs beli rata-rata, dan saldo berjalan lintas seluruh kantong
                </p>
              </div>

              <TransactionTable
                transactions={enrichedTransactions}
                selectedCurrency="ALL"
                pockets={pockets}
                isSinglePocketView={false}
                onEditTransaction={handleEditTx}
                onDeleteTransaction={handleDeleteTransaction}
              />
            </section>
          )}
        </section>
        </div>
      </main>

      {/* 4. Modals */}
      {/* A. Transaction Modal (Add / Edit) */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        editTransaction={editingTx}
        defaultPocketId={txModalDefaults.pocketId}
        defaultCurrency={txModalDefaults.currency}
        defaultType={txModalDefaults.type}
        currentRates={liveFxRates}
        pockets={pockets}
        transactions={transactions}
        isScopedToPocket={isScopedPocketTx}
      />

      {/* B. Market Valuation Modal */}
      <MarketRateModal
        isOpen={isRatesModalOpen}
        onClose={() => setIsRatesModalOpen(false)}
        pockets={pockets}
        rates={liveFxRates}
        pocketSummaries={currencyPockets}
        onSaveRates={(newRates, newManualPrices) => {
          updateMarketRates(newRates);
          if (newManualPrices) {
            updateManualPrices({ ...manualPrices, ...newManualPrices });
          }
          showToast('Kurs pasar berhasil diperbarui. Valuasi portofolio telah dihitung ulang.');
        }}
      />

      {/* C. Dynamic Asset Pocket Manager Modal (CRUD Pockets) */}
      <PocketManagerModal
        isOpen={isPocketModalOpen}
        onClose={() => setIsPocketModalOpen(false)}
        pockets={pockets}
        transactions={transactions}
        onSavePocket={handleSavePocket}
        onDeletePocket={handleDeletePocket}
        isDeletingPocket={isDeletingPocket}
      />

      {/* D. Backup & Restore Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        transactions={transactions}
        marketRates={liveFxRates}
        pockets={pockets}
        onImportSuccess={handleImportSuccess}
        onReloadRemoteData={handleReloadRemoteData}
        onExportCsv={handleExportCsv}
      />

      {/* E. Monthly Asset Portfolio Report Modal (A4 Print Ready) */}
      <MonthlyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        pockets={currencyPockets}
        transactions={transactions}
      />

      {/* Statement Download Modal (Rekening Koran) */}
      <StatementDownloadModal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        pockets={pockets}
        transactions={transactions}
        userEmail={effectiveEmail}
      />

      {/* F. Floating Kurs FX Live Modal Dialog */}
      <CurrencyWatchlistModal
        isOpen={isFxModalOpen}
        onClose={() => setIsFxModalOpen(false)}
        watchlist={watchlist}
        lastUpdated={liveStatus.lastUpdated || ''}
        isLoading={liveStatus.isLoading}
        onRefresh={refreshLiveRates}
        onSelectCurrency={(code) => {
          const matchPocket = pockets.find(
            (p) => (p.currencyCode || '').toUpperCase() === (code || '').toUpperCase()
          );
          if (matchPocket) {
            setMainView('POCKETS');
            setActivePocketId(matchPocket.id);
            showToast(`Membuka rincian kantong ${matchPocket.name}.`);
          } else {
            const item = watchlist.find((w) => w.code === code);
            showToast(`Kurs spot 1 ${code} = Rp ${item?.formattedRate || '-'}`);
          }
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#32A89C]" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WealthLedgerView;
