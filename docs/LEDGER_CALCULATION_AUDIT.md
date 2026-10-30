# Audit kalkulasi Wealth Ledger — 30 Oktober 2026

Repository: jagorencana/clientportal. Basis pemeriksaan: fd3155192e9f8e0d8178ef3525d374778ab563df.

## Arsitektur dan cakupan

UI React/TypeScript berjalan dengan Vite. `WealthLedgerView` mengelola state, cache per tenant, antrean penulisan, dan rollback optimistis. `calculator.ts` menghasilkan ringkasan aset. `ledgerApiService.ts` mengirim mutasi ke Google Apps Script. `Code.gs` menyimpan kantong dan transaksi pada Google Sheets, memakai lock saat menulis.

Audit ini berfokus pada mutasi, valuasi, pencairan, laporan terkait, dan kemampuan menjalankan hasil build. Data screenshot direproduksi dengan transaksi sintetis. Tidak ada pemanggilan API ledger produksi, perubahan Google Sheets, deploy, atau pengujian menggunakan akun klien riil. Audit autentikasi/security menyeluruh dan pemeriksaan visual setelah login berada di luar verifikasi ini.

## Temuan

| Prioritas | Temuan | Status patch |
| --- | --- | --- |
| P0 | Tidak ada P0 yang terkonfirmasi dalam cakupan pengujian ini. Ini bukan kesimpulan bahwa seluruh aplikasi bebas P0. | Belum audit menyeluruh |
| P1 | Batas penarikan investasi IDR memakai setoran dikurangi penarikan, bukan nilai investasi. Akibatnya keuntungan tidak dapat dicairkan. | Diperbaiki untuk kantong nominal IDR: REKSADANA, SINKING_FUND, ASET_FISIK |
| P1 | Total nilai pasar manual tetap sama setelah mutasi. Sekadar melonggarkan batas penarikan dapat membesar-besarkan kekayaan dan menghapus modal secara keliru. | Nilai pasar dikoreksi dengan arus dana setelah snapshot; modal pencairan dialokasikan proporsional dan disimpan terpisah |
| P1 | Kolom pembaruan nilai pasar memakai format desimal titik: masukan `10.756.482` dapat berubah menjadi `10.75`, alih-alih Rp10.756.482. | Parser Indonesia yang sama digunakan pada formulir mutasi dan valuasi |
| P1 | Build selesai tetapi `node dist/server.cjs` langsung gagal: `fileURLToPath(import.meta.url)` menerima undefined pada CommonJS. | Inisialisasi lokasi berkas yang tidak dipakai dihapus; server hasil build berhasil diuji |
| P2 | Label “Saldo Tersedia”, kurs rata-rata, dan NAB membingungkan untuk investasi yang dicatat dalam rupiah. | Diganti dengan nilai investasi, modal, dan hasil terealisasi pada tampilan terkait; saldo jurnal dijelaskan sebagai saldo mutasi |
| P2 | Riwayat harga/valuasi harian tidak tersedia. Laporan periode lampau menggunakan acuan valuasi terakhir dan bukan harga aktual historis. | Keterbatasan dipertahankan dan dijelaskan; modal pencairan baru dihormati dalam laporan |
| P2 | Bundle frontend masih sekitar 917 kB sebelum gzip. | Tidak diubah dalam patch akuntansi |

## Contoh yang direproduksi

- Modal sebelum pencairan: Rp6.823.408.
- Nilai investasi sebelum pencairan: Rp10.756.482.
- Pencairan: Rp10.000.000.
- Nilai investasi sesudah pencairan: **Rp756.482**.
- Modal yang dilepas: sekitar Rp6.343.531,28.
- Modal tersisa: sekitar Rp479.876,72.
- Hasil terealisasi dari pencairan tersebut: sekitar Rp3.656.468,72.

Rumus modal yang dilepas = modal sebelum pencairan × pencairan / nilai investasi sebelum pencairan. Nilai pasar terakhir harus mencerminkan aplikasi investasi sebelum mencatat pencairan. Ini merupakan pencatatan nominal proporsional, bukan perhitungan unit/NAB, pajak, fee, atau hasil redemption yang belum diketahui. Hasil transaksi lama tidak dihitung ulang sebagai keuntungan terealisasi karena acuan pasar saat transaksi tersebut tidak tersimpan.

Saldo mutasi (setoran dikurangi seluruh penarikan) boleh negatif setelah keuntungan dicairkan; saldo tersebut bukan nilai aset atau modal tersisa.

## Penyimpanan dan pengaman

- Tambahan `costBasisReleasedIdr` pada transaksi menyimpan modal yang dilepas; `costIdr`/`totalIdr` tetap mewakili arus dana.
- Tambahan `valuationCashflowIdr` pada kantong menyimpan arus dana bersih yang sudah termasuk dalam valuasi manual. Snapshot lama dapat dibaca berdasarkan tanggal jika tidak ambigu.
- Snapshot lama dengan transaksi pada hari yang sama atau tanpa tanggal acuan memerlukan pembaruan nilai investasi; urutan kejadian tidak ditebak.
- Backend memeriksa saldo dan alokasi modal di bawah lock, menolak alokasi usang/penarikan berlebih, serta menerima pengulangan permintaan yang identik tanpa membuat duplikat.
- Frontend mengaktifkan pencairan baru hanya jika pemuatan data remote mengonfirmasi `investmentAccountingVersion: 1`; cache dan backend lama tidak dianggap cukup.
- Mutasi investasi harus berurutan. Setelah terdapat pencairan dengan modal tercatat, edit/hapus riwayat langsung diblokir karena dapat mengubah modal pencairan berikutnya. Alur koreksi/reversal memerlukan pekerjaan rekonsiliasi terpisah dan belum disediakan dalam patch ini.
- Penggantian jenis kantong yang akan mengubah model pencatatan setelah pencairan juga diblokir.
- Kas, valas, emas, dan saham/ETF tetap memakai model saldo/unit yang ada.

## Validasi

- `npm run lint`: lulus.
- `CI=true npm run build`: lulus, termasuk pemeriksaan regresi lama dan 11 tes baru.
- 11 tes mencakup parser rupiah, kasus screenshot, pencairan sebagian/penuh/rugi, top up setelah pencairan, snapshot baru/lama, alokasi usang, penarikan berlebih, retry identik, metadata Sheets, isolasi data tenant dalam fixture, dan kesetaraan perhitungan frontend/backend.
- Handler Apps Script diuji offline dengan Sheets sintetis: simpan → retry → muat ulang → penolakan penarikan lanjutan → pembaruan valuasi.
- Server hasil build: `/api/health` mengembalikan `ok`; halaman `/` mengembalikan HTTP 200 dan root React.
- Belum dilakukan: pengujian UI setelah login atau integrasi pada staging Google Apps Script sungguhan. Draft memerlukan review dan uji staging sebelum produksi.

## Sebelum penerapan

Patch frontend dan `google-apps-script/Code.gs` harus ditinjau bersama. Handler backend akan menambahkan kolom saat tindakan penyimpanan dijalankan setelah kode backend diterapkan. Tidak ada migrasi atau perubahan data produksi yang dijalankan oleh audit ini. Jangan merge ke jalur auto-deploy, memperbarui Apps Script produksi, atau mengubah Google Sheets produksi tanpa persetujuan pemilik.
