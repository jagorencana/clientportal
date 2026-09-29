import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const requiredEnvFiles = ['.env', '.env.local', '.env.example'];
for (const file of requiredEnvFiles) {
  expect(fs.existsSync(path.join(root, file)), `${file} tidak ditemukan`);
  if (!fs.existsSync(path.join(root, file))) continue;
  const contents = read(file);
  const match = contents.match(/^VITE_APPS_SCRIPT_URL=(.+)$/m);
  expect(Boolean(match?.[1]?.trim()), `${file}: VITE_APPS_SCRIPT_URL kosong`);
  expect(
    Boolean(match?.[1]?.trim().startsWith('https://script.google.com/macros/s/')),
    `${file}: VITE_APPS_SCRIPT_URL bukan URL Web App Google Apps Script`
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
expect(!ledgerService.includes("'/api/ledger-proxy'"), 'Ledger kembali memakai proxy relatif lama');

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
  wealthLedgerView.includes('new Map<string, AssetPocket>()') &&
    wealthLedgerView.includes('pocketId?: string'),
  'Deduplikasi pocketId sebelum state UI hilang'
);

const gasBackend = read('google-apps-script/Code.gs');
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
