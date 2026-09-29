# QA, Defensive Security & Visual Audit Report

**Target:** `http://127.0.0.1:5173`  
**Execution mode:** Single-pass, unauthenticated, read-only application inspection  
**Viewport:** Desktop `1440×900`; Mobile `390×844`  
**Timestamp selesai:** 2026-09-29 16:56:05 WIB (`+07:00`)

## 1. Executive Summary

| Modul / Rute | Status | Total Issues | Catatan Utama |
|---|---:|---:|---|
| `/` — Landing/Home | WARN | 1 | Route menampilkan halaman login, bukan landing publik. Run desktop pertama gagal karena server belum aktif; mobile berhasil setelah server dinyalakan satu kali. |
| `/login` — Auth | WARN | 2 | Validasi HTML5 menolak input kosong/tidak valid, tetapi tidak ditemukan pesan validasi inline atau `aria-invalid`. Audit storage/network payload penuh tidak dapat diverifikasi oleh instrumentation browser. |
| `/dashboard` — Overview | WARN | 1 | Route guard bekerja dan menampilkan login tanpa sesi. Fungsi dashboard setelah login tidak dapat diuji tanpa kredensial/sesi. |
| `/master-budget` — Master 4-Pos | WARN | 1 | Route guard bekerja. Kalkulasi, input angka, modal, dan layout internal setelah login tidak dapat diuji. |
| `/portfolio` — Portfolio/Wealth Ledger | WARN | 1 | Route guard bekerja. Mutasi, kalkulasi, modal aset, serta sinkronisasi setelah login tidak dapat diuji. |

**Kesimpulan:** tidak ditemukan crash UI, overflow horizontal, gambar rusak, nilai `NaN`/`undefined`, atau error/warning console pada permukaan unauthenticated yang berhasil diperiksa. Route VIP tidak membocorkan konten dashboard kepada pengguna tanpa sesi. Audit fitur internal berstatus **belum terverifikasi**, bukan PASS, karena tidak tersedia sesi login audit.

## 2. Coverage & Observations

### Functional & State Integrity

- Form login memiliki input `type="email"` dan `type="password"` dengan atribut `required`.
- Submit kosong menghasilkan state validity invalid untuk kedua input.
- Payload email karakter khusus ditolak oleh validasi browser dan menampilkan native validation bubble.
- Tidak ditemukan `NaN` atau `undefined` pada teks halaman login.
- Modal Edit Profile, Tambah Aset, kalkulasi neraca/surplus, slider, dan toggle internal tidak dapat dijangkau tanpa login.

### Defensive Security & Privacy

- Akses langsung ke `/dashboard`, `/master-budget`, dan `/portfolio` tidak menampilkan konten VIP; seluruhnya tetap berada pada lock/login screen.
- Tidak ditemukan password/token/API key yang tampil pada DOM visible halaman login.
- Console browser: tidak ditemukan error merah, unhandled rejection, warning, atau log data klien pada semua navigasi yang berhasil.
- Pemeriksaan nilai LocalStorage/SessionStorage tidak dapat diselesaikan karena Storage API tidak diekspos oleh sandbox instrumentation. Nilai storage tidak dibaca atau dicetak.
- Inspeksi payload request/response Network tidak tersedia melalui instrumentation run ini. Tidak ada klaim PASS untuk aspek tersebut.

### UI/UX & Stability

- Desktop `1440×900`: tidak ada overflow horizontal; form login terpusat dan seluruh kontrol utama terlihat.
- Mobile `390×844`: tidak ada overflow horizontal pada kelima rute; form tetap satu kolom dan dapat dibaca.
- Tidak ditemukan gambar dengan `naturalWidth = 0` atau status incomplete pada DOM.
- Tidak ditemukan layout jump pada permukaan unauthenticated; kontrol internal tidak dapat diuji.
- Scanner heuristik menandai beberapa teks slate/transparan sebagai kandidat kontras rendah, tetapi visual inspection menunjukkan label utama tetap terbaca. Verifikasi WCAG numerik perlu alat yang memahami warna OKLCH dan background komposit.

## 3. Detailed Findings

### QA-01 — Cakupan fitur VIP tidak dapat diuji tanpa sesi audit

- **Lokasi / Rute:** `/dashboard`, `/master-budget`, `/portfolio`
- **Severity:** Medium
- **Deskripsi Masalah:** Direct navigation selalu menampilkan login. Ini membuktikan route guarding pada permukaan UI, tetapi mencegah pengujian formulir, kalkulasi reaktif, modal, tombol simpan/tutup, tabel, slider, dan layout dashboard authenticated.
- **Bukti:** Body DOM pada ketiga URL hanya berisi `Client Portal VIP`, field email/password, dan tombol `Masuk ke Portal VIP`; tidak ada konten dashboard.
- **Saran Perbaikan Defensif:** Siapkan akun QA nonproduksi atau fixture session khusus test dengan data sintetis dan izin minimum. Jangan menggunakan kredensial klien riil untuk regression UI.

### QA-02 — Validasi login tidak menyediakan feedback inline yang terdeteksi

- **Lokasi / Rute:** `/login`
- **Severity:** Low
- **Deskripsi Masalah:** Input kosong dan email berkarakter tidak valid ditolak oleh HTML5 browser, tetapi DOM tidak menunjukkan pesan error inline dan input tidak memiliki `aria-invalid`. Pengguna bergantung pada native browser bubble.
- **Bukti:** `validity.valid = false` untuk input email kosong/tidak valid; `aria-invalid = null`; tidak ditemukan teks `gagal`, `tidak valid`, atau `wajib` pada body setelah submit.
- **Saran Perbaikan Defensif:** Tambahkan pesan error inline yang persisten, hubungkan melalui `aria-describedby`, dan set `aria-invalid="true"` saat field gagal validasi.

### QA-03 — Storage dan Network payload belum terverifikasi

- **Lokasi / Rute:** seluruh rute
- **Severity:** Medium
- **Deskripsi Masalah:** Sandbox browser tidak mengekspos Performance API maupun Storage API pada evaluation context. Karena itu audit tidak dapat memastikan isi LocalStorage/SessionStorage atau memeriksa payload request/response secara penuh.
- **Bukti:** Instrumentation error: `Performance API unavailable`; `Storage API unavailable`. Console aplikasi sendiri tetap bersih.
- **Saran Perbaikan Defensif:** Jalankan audit lanjutan menggunakan DevTools Protocol/Playwright test runner dengan redaction otomatis. Assertion minimum: tidak ada password, refresh token, private API key, atau full financial state dalam storage/log; payload hanya mengirim field yang diperlukan dan memakai HTTPS.

### QA-04 — Route `/` berfungsi sebagai login, bukan landing publik

- **Lokasi / Rute:** `/`
- **Severity:** Low
- **Deskripsi Masalah:** Route yang diberi label Landing Page/Homepage menampilkan komponen login yang sama dengan `/login`.
- **Bukti:** DOM `/` mobile identik dengan halaman `Client Portal VIP` dan form login.
- **Saran Perbaikan Defensif:** Jika ini memang desain portal, dokumentasikan `/` sebagai auth entry. Jika landing publik diharapkan, pisahkan route publik dan redirect `/` secara eksplisit.

### QA-05 — Startup preview sempat tidak tersedia

- **Lokasi / Rute:** `/` desktop, percobaan pertama
- **Severity:** Low
- **Deskripsi Masalah:** Browser menerima `net::ERR_CONNECTION_REFUSED` karena preview belum aktif. Server kemudian dinyalakan satu kali dan seluruh rute berikutnya dapat diperiksa.
- **Bukti:** Browser error `ERR_CONNECTION_REFUSED`; health endpoint kemudian merespons dan halaman berhasil dibuka.
- **Saran Perbaikan Defensif:** Tambahkan health-check sebelum E2E dan gunakan supervisor/CI step yang menunggu `/api/health` sukses sebelum test browser dimulai.

## 4. Checklist Result

| Checklist | Hasil |
|---|---|
| Form input kosong & karakter ekstrem | WARN — rejection bekerja; feedback inline/ARIA kurang |
| Input angka negatif/ekstrem modul internal | NOT TESTED — perlu sesi QA |
| State reaktif/kalkulasi tanpa `NaN` | PARTIAL — login bersih; modul internal belum diuji |
| Modal buka/tutup/simpan | NOT TESTED — perlu sesi QA |
| Responsive desktop/mobile | PASS untuk auth surface |
| Sensitive data pada DOM | PASS untuk auth surface |
| LocalStorage/SessionStorage | NOT VERIFIED — instrumentation limitation |
| Route guarding | PASS untuk tiga route VIP |
| Network payload leak | NOT VERIFIED — instrumentation limitation |
| Console sanity | PASS pada rute yang diperiksa |
| Broken local images | PASS pada DOM yang diperiksa |
| Contrast/readability | WARN — visual baik, WCAG numerik belum final |
| Layout shift pada slider/toggle | NOT TESTED — perlu sesi QA |

## 5. Completion

Audit selesai dalam satu alur terbatas pada lima rute yang ditentukan. Tidak ada crawling eksternal dan tidak ada perubahan source code atau data aplikasi selama audit.

## 6. Internal Authenticated Audit Attempt — 2026-09-29 17:51 WIB

### Executive Update

| Tahap / Modul | Status | Total Issues | Catatan Utama |
|---|---:|---:|---|
| Login QA pada `/` | FAIL | 1 | Kredensial QA dikirim satu kali melalui form lokal, tetapi aplikasi menolak login dengan pesan yang tidak menjelaskan penyebab sebenarnya. |
| `/dashboard` | BLOCKED | 0 | Tidak dapat dicapai karena autentikasi gagal. |
| Audit Mandiri | BLOCKED | 0 | Tidak dapat dicapai karena autentikasi gagal. |
| TVM Future Goals | BLOCKED | 0 | Tidak dapat dicapai karena autentikasi gagal. |
| `/master-budget` | BLOCKED | 0 | Tidak dapat dicapai karena autentikasi gagal. |
| Sinking Funds | BLOCKED | 0 | Tidak dapat dicapai karena autentikasi gagal. |
| `/portfolio` | BLOCKED | 0 | Tidak dapat dicapai karena autentikasi gagal. |
| `/wealth-ledger` | BLOCKED | 0 | Tidak dapat dicapai karena autentikasi gagal. |
| Advisory & KPR Restructuring | BLOCKED | 0 | Tidak dapat dicapai karena autentikasi gagal. |
| Smart Travel Budget | BLOCKED | 0 | Tidak dapat dicapai karena autentikasi gagal. |
| Executive Report | BLOCKED | 0 | Tidak dapat dicapai karena autentikasi gagal. |
| Modal Edit Profil | BLOCKED | 0 | Tidak dapat dicapai karena autentikasi gagal. |

### QA-06 — Kredensial QA ditolak dengan pesan autentikasi yang menyesatkan

- **Lokasi / Rute:** `/` — Client Portal VIP login
- **Severity:** High
- **Status:** FAIL
- **Deskripsi Masalah:** Email dan kode VIP yang diberikan untuk audit dimasukkan ke field yang sesuai. Submit melalui tombol tidak memicu proses; submit keyboard kemudian memulai state `Memverifikasi Akses VIP...`, dan setelah sekitar lima detik aplikasi kembali ke form dengan status `Gagal Autentikasi`. Pesan detail yang tampil adalah `Diagnostik berhasil tercatat rapi.`, bukan penjelasan autentikasi yang dapat ditindaklanjuti.
- **Bukti DOM/UI:**
  - Tombol berubah menjadi disabled dengan label `Memverifikasi Akses VIP...`.
  - Sesudah respons: heading `Gagal Autentikasi` dan detail `Diagnostik berhasil tercatat rapi.`.
  - URL tetap `http://127.0.0.1:5173/`; tidak terjadi redirect ke dashboard.
  - Console browser tidak mencatat error atau warning.
- **Bukti privasi:** Password tetap menggunakan `input[type=password]`; nilai password tidak muncul pada `document.body.innerText` dan tidak ditulis ke laporan.
- **Saran Perbaikan Defensif:**
  1. Pisahkan response autentikasi dari response endpoint diagnostik/telemetri; jangan menganggap pesan sukses diagnostik sebagai hasil login.
  2. Validasi kontrak respons login secara eksplisit, misalnya `success === true`, session/token terverifikasi, dan profil tenant tersedia sebelum mengubah state authenticated.
  3. Tampilkan error generik yang aman seperti `Email atau kode akses tidak valid` untuk invalid credential dan pesan berbeda untuk timeout/koneksi backend.
  4. Tambahkan correlation ID non-sensitif untuk troubleshooting tanpa menampilkan payload atau credential.
  5. Tambahkan regression test E2E login dengan akun QA nonproduksi sebelum audit internal dijalankan.

### Security Observations pada Login Attempt

- **PASS:** Password tidak tampil sebagai plain text di DOM visible.
- **PASS:** Field password tetap bertipe `password`.
- **PASS:** Tidak ditemukan credential, token, TypeError, unhandled rejection, atau data pribadi pada console browser.
- **WARN:** Tidak ditemukan `aria-invalid` setelah autentikasi gagal; hubungan programatis antara banner error dan input belum terdeteksi.
- **NOT VERIFIED:** Isi request/response Network serta LocalStorage/SessionStorage tetap tidak dapat dibaca melalui instrumentation sandbox yang tersedia.

### Scope Decision

Audit internal dihentikan setelah kegagalan autentikasi sesuai aturan single-pass dan no-retry. Tidak dilakukan bypass, manipulasi session/storage, login berulang, atau perubahan source code. Seluruh pengujian slider, kalkulasi, modal, PDF, dan security pada halaman internal tetap berstatus **BLOCKED**, bukan PASS.

**Timestamp selesai attempt internal:** 2026-09-29 17:51:34 WIB (`+07:00`).

## 7. Authenticated Internal Audit — 2026-09-29 19:28 WIB

> Sesi login berhasil disiapkan manual oleh pengguna. Bagian ini menggantikan status `BLOCKED` pada attempt sebelumnya untuk modul yang berhasil diperiksa.

### Executive Summary Internal

| Modul | Status | Issues | Catatan Utama |
|---|---:|---:|---|
| Overview Dashboard | FAIL | 2 | Tidak blank dan console bersih, tetapi Saving & Invest Rate tampil `45.000.000%`; skor dashboard `0` tidak konsisten dengan report `58/100`. |
| Master 4-Pos Budget | WARN | 1 | Halaman serta form tambah pos dapat dibuka/ditutup. Saat pendapatan Rp0, UI tetap menampilkan surplus 100% walau ada defisit Rp450.000. |
| Portfolio Planning | WARN | 1 | Halaman tampil baik, enam slider terdeteksi dan tanpa NaN. Perubahan slider melalui automation tidak menghasilkan perubahan teks yang dapat diverifikasi. |
| Wealth Ledger | FAIL | 1 | Tetap pada skeleton `Memuat data Google Sheets...` setelah batas tunggu 5 detik, pada desktop dan mobile. |
| Executive Report | FAIL | 3 | Skor berbeda dengan dashboard, logo dokumen masih placeholder `JR`, dan field tanggal berisi label non-tanggal. |
| Edit Profile Modal | WARN | 1 | Buka/tutup bekerja dan email read-only, tetapi modal tidak memiliki semantic dialog yang terdeteksi. |

### Baseline Stability

- Tidak ditemukan blank/white screen pada modul yang berhasil dibuka.
- Tidak ditemukan teks `NaN` atau `undefined`.
- Tidak ditemukan gambar gagal dimuat (`naturalWidth = 0`).
- Tidak ditemukan overflow horizontal tingkat dokumen pada desktop `1440×900` maupun halaman yang berhasil diperiksa pada mobile `390×844`.
- Tidak ditemukan `TypeError`, unhandled rejection, uncaught exception, error merah, atau warning console selama pass authenticated.
- Session authenticated tetap aktif selama perpindahan seluruh menu.

### QA-07 — Wealth Ledger berhenti pada loading skeleton

- **Lokasi:** Wealth Ledger (`/wealth-ledger` melalui menu internal)
- **Severity:** High
- **Status:** FAIL
- **Deskripsi:** Modul menampilkan `Memuat data Google Sheets...`, badge `Belum tersinkron`, dan skeleton kartu. Setelah satu kali batas tunggu 5 detik, state tidak berubah.
- **Bukti visual/DOM:** Heading `Wealth Ledger`; teks `Agungnatalia2025 · Memuat data Google Sheets...`; container `Memuat data Wealth Ledger`; screenshot audit menunjukkan skeleton penuh.
- **Reproduksi:** Klik menu Wealth Ledger → tunggu 5 detik → skeleton tetap aktif. Kondisi sama teramati pada viewport `390×844`.
- **Console:** Tidak ada error/warning, sehingga kegagalan kemungkinan tertahan pada promise/fetch yang tidak menyelesaikan state loading atau error state tidak dirender.
- **Saran:** Tambahkan timeout eksplisit untuk fetch, `finally` yang selalu mengakhiri loading, error banner dengan tombol retry, dan log terstruktur non-sensitif untuk status HTTP/parse/tenant email.

### QA-08 — Saving & Invest Rate menghasilkan `45.000.000%`

- **Lokasi:** Overview Dashboard
- **Severity:** High
- **Status:** FAIL
- **Deskripsi:** Dashboard menampilkan `SAVING & INVEST RATE 45000000 % Optimal (≥20%)` ketika pemasukan/cashflow dasar bernilai nol sementara portfolio investasi bernilai sekitar Rp141,5 juta. Ini bukan rasio yang bermakna dan berpotensi menyesatkan keputusan finansial.
- **Bukti DOM:** Teks dashboard `SAVING & INVEST RATE 45000000 %` bersamaan dengan kas bersih/pemasukan Rp0.
- **Saran:** Jangan membagi nominal investasi dengan pendapatan nol. Jika denominator `<= 0`, tampilkan `N/A`/`Belum tersedia`; bedakan investment balance dari monthly saving contribution.

### QA-09 — Skor kesehatan tidak konsisten antar modul

- **Lokasi:** Overview Dashboard vs Executive Report
- **Severity:** High
- **Status:** FAIL
- **Deskripsi:** Overview menampilkan skor awal dan skor terkini `0`, sedangkan Executive Report menampilkan `SKOR KESEHATAN 58/100 Waspada` pada sesi/data yang sama.
- **Bukti DOM:** Dashboard: `SKOR AWAL 0`, `SKOR TERKINI 0`; report: `SKOR KESEHATAN 58 /100`.
- **Saran:** Gunakan satu selector/calculation source untuk skor terkini. Sertakan timestamp dan versi perhitungan, lalu tambahkan regression assertion bahwa dashboard dan report selalu identik.

### QA-10 — Cashflow zero-income menampilkan surplus 100%

- **Lokasi:** Master 4-Pos Budget
- **Severity:** Medium
- **Status:** WARN
- **Deskripsi:** Dengan pemasukan Rp0 dan Sinking Funds Rp450.000, layar menampilkan `Defisit Alokasi: -Rp450.000` sekaligus progress `100.0% Surplus / Investasi`.
- **Bukti DOM:** Kedua indikator muncul bersamaan pada modul Master Budget.
- **Saran:** Saat pendapatan `<= 0`, progress surplus harus 0%/N/A dan status utama harus defisit. Hindari fallback persentase 100 untuk denominator nol.

### QA-11 — Branding dan metadata Executive Report belum final

- **Lokasi:** Executive Report A4 view
- **Severity:** Medium
- **Status:** FAIL
- **Deskripsi:** Header dokumen menggunakan kotak `JR`, bukan logo resmi aplikasi. Field `Tanggal Terbit` berisi `Audit Homepage Terintegrasi`, bukan tanggal.
- **Bukti visual/DOM:** Header A4 menampilkan `JR`; metadata `Tanggal Terbit: Audit Homepage Terintegrasi`.
- **Saran:** Gunakan `/logo-jr.png` dengan ukuran proporsional dan isi tanggal terbit dari formatter tanggal Indonesia yang valid.

### QA-12 — Modal Edit Profile tidak memiliki semantic dialog

- **Lokasi:** Menu profil → `Profil Akun Klien`
- **Severity:** Low
- **Status:** WARN
- **Deskripsi:** Modal tampil dan tombol `Tutup` berhasil menutupnya, tetapi query `[role=dialog],[aria-modal=true]` menghasilkan nol.
- **Bukti:** Accessibility tree melihat container dan tombol `Tutup Modal`, tetapi tidak ada role dialog.
- **Saran:** Terapkan `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, dan pengembalian fokus ke tombol profil ketika modal ditutup.

### QA-13 — Verifikasi reaktivitas slider Portfolio tidak konklusif

- **Lokasi:** Portfolio Planning
- **Severity:** Low
- **Status:** WARN
- **Deskripsi:** Enam slider terdeteksi. Nilai awal valid dan total alokasi 100%, tetapi perubahan horizon/alokasi melalui automation tidak menghasilkan perubahan teks DOM yang dapat diverifikasi. Nilai kemudian dikembalikan ke posisi awal.
- **Saran:** Tambahkan automated test berbasis event `input` + `change` dengan assertion terhadap horizon, total allocation, expected return, dan future value. Pastikan controlled input merespons keyboard serta assistive technology.

### Responsive Spot Check

- **PASS:** Portfolio Planning mobile `390×844` tidak overflow, tidak blank, tidak NaN, dan tidak memiliki broken image.
- **FAIL:** Wealth Ledger mobile tetap loading skeleton setelah 5 detik.
- **WARN:** Pada mobile, Overview, Master Budget, dan Executive Report tidak ditemukan sebagai tombol langsung setelah nav berubah menjadi mode ringkas/horizontal. Tidak dilakukan retry atau tebakan koordinat sesuai aturan single-pass. Screenshot Wealth Ledger menunjukkan nav horizontal dan tombol menu global/hamburger tersedia.

### Security Check Authenticated Surface

- **PASS:** Tidak ada credential/password yang terlihat pada halaman internal atau console.
- **PASS:** Email profil ditampilkan hanya di area authenticated dan bersifat read-only.
- **PASS:** Tidak ditemukan error console yang mencetak state finansial atau token.
- **WARN:** Menu profil menampilkan email dan client ID; ini wajar untuk akun sendiri, tetapi pastikan response cache menggunakan `Cache-Control: no-store` dan UI tidak dapat dirender setelah logout/back navigation.
- **NOT VERIFIED:** Isi LocalStorage/SessionStorage serta payload Network tidak tersedia melalui instrumentation sandbox; status ini tetap bukan PASS.

### Interaction Results

| Interaksi | Hasil |
|---|---|
| Navigasi antar lima modul | PASS desktop |
| Form `Tambah Pos Pokok` buka/tutup | PASS; tidak ada data disimpan |
| Portfolio slider basic interaction | WARN; perubahan tidak terverifikasi, nilai dikembalikan |
| Modal Edit Profile buka/tutup | PASS secara fungsional; WARN semantik accessibility |
| PDF/A4 view render | PASS render; FAIL konsistensi data/branding |
| Console sanity | PASS |

**Timestamp selesai audit authenticated:** 2026-09-29 19:28:46 WIB (`+07:00`).

---

## 8. Verifikasi Perbaikan Temuan Prioritas

Enam temuan prioritas telah diperbaiki dan diverifikasi pada 29 September 2026.

| Temuan | Status Setelah Fix | Verifikasi |
|---|---|---|
| QA-07 — Wealth Ledger skeleton hang | FIXED | Fetch memakai timeout 45 detik per percobaan, maksimal 3 percobaan dengan exponential backoff; `isLoading` dihentikan pada seluruh hasil. Data kosong menampilkan empty state dan kegagalan remote memakai cache tenant terakhir. |
| QA-08 — Saving rate divide-by-zero | FIXED | Pendapatan `<= 0` menghasilkan saving/investment rate `0%`; tidak ada pembagian dengan denominator nol. |
| QA-09 — Skor kesehatan tidak konsisten | FIXED | Dashboard dan Executive Report memakai `resolveDisplayHealthScore` dari satu helper yang sama. |
| QA-10 — Surplus 100% saat defisit | FIXED | Kondisi defisit atau pendapatan nol memaksa persentase surplus menjadi `0%` dan menampilkan badge merah `Defisit Kas`. |
| QA-11 — Branding/tanggal report | FIXED | Placeholder `JR` diganti `/logo-jr.png`; tanggal terbit memakai format Indonesia dinamis. |
| QA-12 — Semantik modal profil | FIXED | Modal memakai `role="dialog"`, `aria-modal="true"`, dan `aria-labelledby`. |

### Hasil Pemeriksaan Otomatis

- `npm run lint`: **PASS** — TypeScript `tsc --noEmit` tanpa error.
- `npm run test:regression`: **PASS** — login, sinkronisasi ledger, dan guard keenam QA priority fixes OK.
- `npm run build`: **PASS / BUILT** — Vite berhasil mentransformasi 1.734 modul dan menghasilkan bundle production.
- Catatan non-blocking: bundler masih melaporkan peringatan ukuran chunk utama dan peringatan `import.meta` pada output server CommonJS; tidak menggagalkan build dan tidak berasal dari enam fix ini.

**Timestamp verifikasi perbaikan:** 29 September 2026 (WIB).

### Hotfix Ketahanan Koneksi Google Sheets

- Timeout transport Google Apps Script dinaikkan menjadi **45 detik per percobaan**.
- GET ledger melakukan maksimal **3 percobaan** dengan exponential backoff **750 ms → 1.500 ms**.
- Timeout 3 detik di komponen UI dihapus agar tidak memotong request service.
- Snapshot remote terakhir disimpan di `localStorage` memakai key tenant terisolasi; jika seluruh retry gagal, UI tetap menampilkan nilai terakhir dalam status **Mode cache**.
- Operasi repair orphan berjalan secara best-effort dan tidak lagi menahan fetch utama.
- Verifikasi ulang: TypeScript lint, regression check, dan production build seluruhnya **PASS**.

### Hotfix Race Condition Login

- Form login memakai single-flight guard sehingga klik ganda tidak dapat membuat request autentikasi paralel.
- Handler menunggu hasil `login(...)` secara penuh dan hanya menampilkan error setelah hasil final benar-benar gagal.
- Timeout autentikasi browser, proxy development, dan proxy server dinaikkan menjadi **45 detik** agar cold start Google Apps Script tidak dipotong prematur.
- Respons autentikasi bertingkat (`data.user`, `data.data.user`, token, dan `portal_data`) dinormalisasi sebelum validasi.
- Setelah sesi tersimpan, portal langsung dibuka dan URL diselaraskan ke `/dashboard`; hidrasi data cloud lanjutan berjalan di background.
- Password/kode VIP mentah tidak lagi disalin ke objek session di `localStorage`.
- Verifikasi: `npm run lint`, `npm run test:regression`, dan `npm run build` seluruhnya **PASS**.

### Hotfix Proteksi Master Kantong

- `sync_ledger_pockets` melakukan lookup berdasarkan kombinasi tenant aktif (`userEmail`) dan `id/pocketId` sebelum menulis.
- ID yang sudah ada di-update; ID yang benar-benar baru saja yang di-insert.
- Proses sync tidak memakai `appendRow`, tidak menjalankan `deleteRow`, dan tidak menghapus kantong yang tidak tercantum dalam payload.
- Duplikat lama hanya boleh dibersihkan melalui action eksplisit `dedupe_ledger_pockets`, bukan sebagai efek samping sync biasa.
- Frontend melakukan deduplikasi `Map` berdasarkan `id` atau alias `pocketId` sebelum data masuk ke state kartu.
