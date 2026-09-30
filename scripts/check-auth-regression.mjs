import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const isTruthyEnv = (value) =>
  Boolean(value) && !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
const runtimeGasUrl = String(process.env.VITE_GAS_URL || '').trim();
const isCiBuild = isTruthyEnv(process.env.CF_PAGES) || isTruthyEnv(process.env.CI);
const allowsMissingLocalEnvFiles = Boolean(runtimeGasUrl) || isCiBuild;

if (runtimeGasUrl) {
  expect(
    runtimeGasUrl.startsWith('https://script.google.com/macros/s/'),
    'VITE_GAS_URL bukan URL Web App Google Apps Script'
  );
}

for (const file of ['.env', '.env.local']) {
  const exists = fs.existsSync(path.join(root, file));
  expect(exists || allowsMissingLocalEnvFiles, `${file} tidak ditemukan di luar environment CI/Cloudflare`);
  if (!exists) continue;
  const contents = read(file);
  const match = contents.match(/^VITE_APPS_SCRIPT_URL=(.+)$/m);
  expect(Boolean(match?.[1]?.trim()), `${file}: VITE_APPS_SCRIPT_URL kosong`);
  expect(
    Boolean(match?.[1]?.trim().startsWith('https://script.google.com/macros/s/')),
    `${file}: VITE_APPS_SCRIPT_URL bukan URL Web App Google Apps Script`
  );
}

expect(fs.existsSync(path.join(root, '.env.example')), '.env.example tidak ditemukan');
if (fs.existsSync(path.join(root, '.env.example'))) {
  const contents = read('.env.example');
  const match = contents.match(/^VITE_APPS_SCRIPT_URL=(.+)$/m);
  expect(Boolean(match?.[1]?.trim()), '.env.example: VITE_APPS_SCRIPT_URL kosong');
  expect(
    Boolean(match?.[1]?.trim().startsWith('https://script.google.com/macros/s/')),
    '.env.example: VITE_APPS_SCRIPT_URL bukan URL Web App Google Apps Script'
  );
}

const authService = read('src/utils/googleScript.ts');
expect(authService.includes("action: 'portal_login'"), 'Kontrak action portal_login hilang');
expect(authService.includes("'/api/gas'"), 'Proxy autentikasi localhost /api/gas hilang');
expect(authService.includes('VITE_ENABLE_LOCAL_AUTH_FALLBACK'), 'Toggle fallback autentikasi lokal hilang');
expect(authService.includes("digest('SHA-256'"), 'Proteksi hash kredensial lokal hilang');
expect(authService.includes('AUTH_REQUEST_TIMEOUT_MS = 45_000'), 'Timeout autentikasi 45 detik hilang');
expect(
  authService.includes('postToGoogleScript(payload, AUTH_REQUEST_TIMEOUT_MS)'),
  'Login tidak memakai timeout autentikasi khusus'
);

const loginView = read('src/components/auth/LoginView.tsx');
expect(loginView.includes('loginRequestInFlight.current'), 'Single-flight guard form login hilang');
expect(loginView.includes("window.history.replaceState(null, '', '/dashboard')"), 'Redirect dashboard setelah login hilang');
expect(loginView.includes('Memverifikasi...'), 'Loading state tombol login hilang');

const portalContext = read('src/context/PortalContext.tsx');
expect(
  portalContext.includes("setAuthView('portal');") &&
    portalContext.includes('void getClientPortalDataFromCloud(cleanEmail, token).then'),
  'Login masih menunggu hidrasi cloud sebelum membuka portal'
);
expect(!portalContext.includes('password: cleanSecret'), 'Password mentah kembali disimpan pada session login');

const ledgerService = read('src/services/ledgerApiService.ts');
expect(ledgerService.includes('VITE_LEDGER_GAS_URL'), 'Konfigurasi URL ledger hilang');
expect(ledgerService.includes('action=get_ledger_data'), 'Kontrak GET ledger hilang');
expect(ledgerService.includes("action: 'sync_ledger_pockets'"), 'Kontrak sync_ledger_pockets hilang');
expect(ledgerService.includes("action: 'save_ledger_transaction'"), 'Kontrak save_ledger_transaction hilang');
expect(ledgerService.includes("action: 'delete_ledger_transaction'"), 'Kontrak delete_ledger_transaction hilang');
expect(!ledgerService.includes("'/api/ledger-proxy'"), 'Ledger kembali memakai proxy relatif lama');
expect(
  ledgerService.includes("const LEDGER_CACHE_PREFIX = 'wl_pockets_cache'") &&
    ledgerService.includes('LEGACY_LEDGER_CACHE_PREFIX') &&
    ledgerService.includes('cacheTenantEmail: email') &&
    ledgerService.includes("Cache Wealth Ledger ditolak karena tenant tidak cocok"),
  'Cache key Wealth Ledger atau migrasi cache lama hilang'
);
expect(
  ledgerService.includes("/aset fisik|operasional|kendaraan|properti|property|inventaris/") &&
    ledgerService.includes("/reksa\\s*dana|reksadana|mutual fund/") &&
    ledgerService.includes("/saham|etf|efek|equity/") &&
    ledgerService.includes("'SINKING_FUND'") &&
    ledgerService.includes('const normalizedPocket = normalizeRemotePocket(p, idx)'),
  'Normalisasi kategori Wealth Ledger tidak lengkap'
);
expect(
  ledgerService.includes('DELETE_POCKET_TIMEOUT_MS = 10_000') &&
    ledgerService.includes('}, DELETE_POCKET_TIMEOUT_MS)'),
  'Cascade delete kantong tidak memakai timeout khusus 10 detik'
);

const currencyService = read('src/services/currencyService.ts');
expect(currencyService.includes('export function buildLiveFxRateMap'), 'Mapper rate pusat Live FX hilang');
expect(
  currencyService.includes('rates[code] = rate'),
  'Watchlist Live FX tidak lagi menjadi sumber rate valuasi'
);

const viteConfig = read('vite.config.ts');
expect(viteConfig.includes('configurePreviewServer'), 'Middleware proxy preview autentikasi hilang');
expect(viteConfig.includes('controller.abort(), 45000'), 'Timeout proxy Vite 45 detik hilang');

const serverSource = read('server.ts');
expect(serverSource.includes('controller.abort(), 45000'), 'Timeout proxy server 45 detik hilang');

const reportService = read('src/services/reportService.ts');
expect(reportService.includes('exportLedgerTransactionsToCsv'), 'Eksportir CSV ledger hilang');
expect(reportService.includes("'ID Transaksi'"), 'Header CSV ledger tidak lengkap');
expect(reportService.includes('URL.createObjectURL'), 'Blob downloader CSV ledger hilang');

const calculations = read('src/utils/calculations.ts');
expect(
  calculations.includes('safeIncome > 0 ? (totalSavingsAndInvestment / safeIncome) * 100 : 0'),
  'Guard divide-by-zero saving rate hilang'
);

const healthScoreCalculator = read('src/utils/healthScoreCalculator.ts');
const executiveSummary = read('src/components/ExecutiveSummary.tsx');
const executiveReport = read('src/components/ExecutiveReportPrint.tsx');
expect(
  healthScoreCalculator.includes('resolveDisplayHealthScore'),
  'Single source of truth skor kesehatan hilang'
);
expect(
  executiveSummary.includes('resolveDisplayHealthScore(metrics, baselineAudit, hasUserOptimized)'),
  'Dashboard tidak memakai helper skor kesehatan bersama'
);
expect(
  executiveReport.includes('resolveDisplayHealthScore(metrics, portal.baselineAudit, portal.hasUserOptimized)'),
  'Executive Report tidak memakai helper skor kesehatan bersama'
);

const wealthLedgerView = read('src/components/wealth-ledger/WealthLedgerView.tsx');
expect(
  wealthLedgerView.includes('Belum ada transaksi di Wealth Ledger'),
  'Empty state Wealth Ledger hilang'
);
expect(
  ledgerService.includes('GAS_REQUEST_TIMEOUT_MS = 45_000'),
  'Timeout Google Sheets 45 detik hilang'
);
expect(
  ledgerService.includes('GAS_FETCH_MAX_ATTEMPTS = 3'),
  'Retry Google Sheets maksimal tiga percobaan hilang'
);
expect(
  ledgerService.includes('GAS_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)'),
  'Exponential backoff Google Sheets hilang'
);
expect(
  ledgerService.includes("source: 'cache'"),
  'Fallback cache Wealth Ledger hilang'
);
expect(
  ledgerService.includes('export const loadCachedLedgerData') &&
    wealthLedgerView.includes('loadCachedLedgerData(effectiveEmail)') &&
    wealthLedgerView.includes('silentRevalidation') &&
    wealthLedgerView.includes('setIsLedgerLoading(!cached)'),
  'Strategi cache-first stale-while-revalidate Wealth Ledger hilang'
);
expect(
  wealthLedgerView.includes('new Map<string, AssetPocket>()') &&
    wealthLedgerView.includes('pocketId?: string'),
  'Deduplikasi pocketId sebelum state UI hilang'
);
expect(
  wealthLedgerView.includes('const liveFxRates = useMemo') &&
    wealthLedgerView.includes('liveFxRates[code]'),
  'Valuasi kantong tidak memakai central Live FX rate map'
);
expect(
  wealthLedgerView.includes('currentRates={liveFxRates}') &&
    wealthLedgerView.includes('rates={liveFxRates}') &&
    wealthLedgerView.includes('marketRates={liveFxRates}'),
  'Consumer Wealth Ledger belum seluruhnya memakai Live FX rate map'
);
expect(
  wealthLedgerView.includes('mutationVersionAtStart !== ledgerMutationVersionRef.current') &&
    wealthLedgerView.includes('(pendingLedgerWritesRef.current.get(email) || 0) > 0') &&
    wealthLedgerView.includes("fetchRemoteLedgerData(email, { persistCache: false })"),
  'Guard race condition SWR terhadap write lokal hilang'
);
expect(
  wealthLedgerView.includes('const enqueueLedgerWrite') &&
    wealthLedgerView.includes('isLedgerMutationSuccess(result)') &&
    wealthLedgerView.includes('finishLedgerWrite(mutationTenant)'),
  'Write ledger belum diserialisasi atau kegagalan API belum ditangani eksplisit'
);
expect(
  wealthLedgerView.includes("showToast('Gagal menghapus kantong dari Google Sheets, silakan coba lagi')") &&
    wealthLedgerView.includes('void loadLedgerData(false, true)') &&
    wealthLedgerView.includes('relatedTransactions.forEach'),
  'Delete kantong tidak memiliki toast, re-fetch sukses, dan rollback defensif'
);

const pocketManagerModal = read('src/components/wealth-ledger/PocketManagerModal.tsx');
expect(
  pocketManagerModal.includes('const [isConfirmDeleting, setIsConfirmDeleting]') &&
    pocketManagerModal.includes("console.warn('Penghapusan kantong gagal:'") &&
    pocketManagerModal.includes('finally {') &&
    pocketManagerModal.includes('setPocketToDelete(null)'),
  'Modal delete kantong tidak menjamin reset loading dan penutupan lewat finally'
);

const gasBackend = read('google-apps-script/Code.gs');
expect(
  gasBackend.includes('function normalizePocketInstrumentType') &&
    gasBackend.includes('function normalizePocketCategory') &&
    gasBackend.includes("record.category = String(value || '').trim()") &&
    gasBackend.includes("record.marketValue = value") &&
    gasBackend.includes("'category', 'sortOrder', 'marketValue', 'manualMarketRate'") &&
    gasBackend.includes("action === 'update_ledger_pocket_market_value'"),
  'Normalisasi kategori di backend Apps Script hilang'
);
expect(
  gasBackend.includes("action === 'save_ledger_transaction'") &&
    gasBackend.includes('function handleSaveLedgerTransaction') &&
    gasBackend.includes("action === 'delete_ledger_transaction'") &&
    gasBackend.includes('function handleDeleteLedgerTransaction'),
  'Route simpan/hapus transaksi Wealth Ledger di Apps Script hilang'
);
const upsertStart = gasBackend.indexOf('function upsertTenantPockets');
const upsertEnd = gasBackend.indexOf('function restoreOrphanPocketMasters', upsertStart);
const upsertPocketSource = gasBackend.slice(upsertStart, upsertEnd);
expect(upsertStart >= 0 && upsertEnd > upsertStart, 'Fungsi upsertTenantPockets tidak ditemukan');
expect(upsertPocketSource.includes('const matches = rowsById[id] || []'), 'Lookup pocketId sebelum insert hilang');
expect(upsertPocketSource.includes('rowsById[id] = [insertRow]'), 'Guard indeks setelah insert kantong hilang');
expect(!upsertPocketSource.includes('appendRow('), 'Upsert kantong kembali memakai appendRow liar');
expect(!upsertPocketSource.includes('deleteRow('), 'Sync kantong tidak boleh menghapus baris master');

const masterBudgeting = read('src/components/MasterBudgeting.tsx');
expect(masterBudgeting.includes("? `Defisit Kas:"), 'Badge Defisit Kas hilang');
expect(
  masterBudgeting.includes('isDeficit || budget.monthlyNetIncome <= 0'),
  'Guard surplus saat defisit/pendapatan nol hilang'
);

expect(executiveReport.includes('src="/logo-jr.png"'), 'Logo report resmi hilang');
expect(
  executiveReport.includes("toLocaleDateString('id-ID'"),
  'Format tanggal Indonesia Executive Report hilang'
);

const profileModal = read('src/components/auth/UserProfileModal.tsx');
expect(profileModal.includes('role="dialog"'), 'Role dialog modal profil hilang');
expect(profileModal.includes('aria-modal="true"'), 'aria-modal modal profil hilang');

if (failures.length > 0) {
  console.error('Regression check gagal:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Regression check login, ledger sync, dan QA priority fixes: OK');
