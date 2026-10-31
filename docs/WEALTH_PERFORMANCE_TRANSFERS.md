# Kinerja aset, kurs FX, dan perpindahan antar kantong

## Perubahan yang perlu ditinjau bersama

- Nilai seluruh aset dan modal tersisa dipisahkan dari hasil investasi. Dashboard merinci floating P/L dan hasil terealisasi tercatat per kelas: kas rupiah, valas, investasi, sinking fund, emas, dan aset fisik.
- Total P/L tercatat adalah floating saat ini ditambah hasil terealisasi yang tersedia. Ini bukan return berbobot waktu/arus dana. Hasil lama yang tidak memiliki alokasi modal tidak direkonstruksi atau dianggap lengkap.
- Dashboard menunjukkan rentang pencatatan dan waktu acuan FX. Laporan menunjukkan cut-off posisi, hasil terealisasi pada bulan terpilih, total hasil tercatat hingga cut-off, dan tanggal valuasi per kantong. Histori harga harian belum tersedia; laporan lampau tetap merupakan estimasi memakai acuan terakhir yang dijelaskan pada laporan.

## Koreksi kolom kurs pada laporan

Sebelumnya `marketValueIdr / balanceNative` ditampilkan sebagai "Rate Valuasi". Untuk investasi, rasio tersebut mengandung perubahan nilai aset dan bukan kurs mata uang. Dua kantong USD dapat terlihat memiliki "kurs" berbeda walau benchmark USD/IDR sama.

Sekarang kolom **Kurs FX ke IDR** mengambil satu rate map pusat untuk semua kantong dengan mata uang sama. Harga aset, modal historis, dan FX dipisahkan. Kurs historis transaksi tidak dipaksa mengikuti kurs sekarang. Bila FX tidak tersedia, tampilkan tanda kosong, bukan menebak dari nilai investasi. Kartu aset juga menampilkan FX secara terpisah dari harga unit.

Nilai pasar manual IDR yang lama tetap dipertahankan. Bila nilai USD asli belum tersimpan, angka USD hasil pembagian dengan FX diberi label **ekuivalen**, bukan disajikan sebagai saldo broker. Bila nilai pasar native USD tersedia, konversi ke IDR memakai benchmark FX pusat yang sama.

## Perpindahan dan integritas data

Tahap ini mendukung perpindahan **mata uang sama** untuk kantong kas/valas dan investasi nominal IDR. Konversi mata uang, fee, atau perpindahan unit saham/emas belum didukung oleh form ini. Ini pencatatan ledger, bukan pengiriman uang di bank.

- Satu permintaan menghasilkan dua sisi jurnal. Kas valas membawa modal perolehan asal agar perpindahan internal tidak menciptakan keuntungan/setoran baru. Pencairan investasi IDR melepas modal proporsional dan dapat merealisasikan keuntungan; penerimaan pada kantong tujuan memperoleh modal sebesar nominal penerimaan.
- Arus internal dikecualikan dari alokasi bulanan/setoran eksternal serta rekap arus masuk/keluar seluruh portofolio. Jurnal per kantong tetap menampilkan kedua gerakan tersebut.
- Satu event disimpan di tab **LEDGER_TRANSFERS** dengan kolom `id`, `userEmail`, `payload`, `voidedAt`, `createdAt`. Payload memiliki input dan kedua sisi jurnal. Satu penulisan event menghindari kondisi satu sisi berhasil dan sisi lainnya gagal. Kedua sisi ditambahkan oleh loader tanpa menyalin transaksi ke LEDGER_TRANSACTIONS.
- Retry dengan ID dan input identik mengembalikan event yang sama. ID yang sudah dipakai dengan isi berbeda ditolak. Cancel menandai satu event sebagai void sehingga kedua sisi hilang dari posisi aktif sekaligus; riwayat event tetap ada.
- Penghapusan salah satu sisi diarahkan menjadi pembatalan pasangan. Edit setengah transaksi ditolak dengan arahan membatalkan pasangan lalu mencatat ulang. Mutasi/valuasi berikutnya yang bergantung pada perpindahan harus direkonsiliasi sebelum pembatalan.
- Kantong yang masih terhubung ke perpindahan aktif tidak dapat dihapus atau diubah model/mata uangnya. Riwayat sebelum perpindahan tidak dapat diubah sehingga modal pasangan menjadi tidak konsisten.
- Impor JSON per baris tidak boleh memecah event transfer. Menu menolak impor yang melibatkan transfer sebelum mengubah data dan menunggu konfirmasi untuk impor biasa. Pemulihan event transfer belum disediakan melalui menu impor JSON lama.

## Validasi

Jalankan:

```text
npm run lint
npm run build
node scripts/build-transfer-engine.mjs <folder-kandidat-apps-script>
ACTIVE_GAS_FIXTURE=<folder-kandidat-apps-script> npm run test:active-gas
```

Tes mencakup FX USD seragam dengan rasio hasil investasi yang berbeda; total aset/P&L tetap saat perpindahan; modal kas USD dibawa ke tujuan; kantong investasi baru dengan sel nol; saldo tidak cukup; mata uang berbeda; kegagalan penulisan event; retry; tenant lain; larangan edit setengah transfer; cancel setelah mutasi berikutnya; cancel kedua sisi dan audit void. Handler reference dan salinan engine aktif diuji melalui route GET/POST memakai Sheets sintetis. Form React diuji di browser lokal dengan data sintetis: gagal simpan mempertahankan input, lalu berhasil menghasilkan saldo asal Rp756.482, tujuan Rp10.000.000, total tetap Rp10.756.482. Pratinjau dashboard/laporan diperiksa; pencetakan PDF dari akun produksi belum diuji.

## Penerapan oleh pemilik

1. PR #3 adalah paket terpadu dan sudah memuat seluruh commit hotfix PR #2. Tinjau/terapkan PR #3; tidak perlu menggabungkan kedua PR secara terpisah.
2. Cadangkan kode Apps Script dan workbook lengkap. Data akun lama tidak perlu direset.
3. Paket Apps Script terdiri dari `Kode.js`, `InvestmentAccounting.js`, **`TransferHandlers.js`**, **`TransferEngine.js`**, serta manifest proyek aktif yang tidak diubah. File engine dihasilkan dari source TypeScript, bukan diedit manual.
4. Setelah pemilik mengaktifkan backend versi baru pada deployment yang sama, muat ulang data. `ledgerTransferVersion: 1` dari respons remote mengaktifkan tombol perpindahan pada frontend baru; cache atau backend lama tidak mengaktifkannya.
5. Terapkan website dari PR fitur dan lakukan uji staging/akun QA sebelum memakai pencatatan nyata. Tidak ada transaksi uji yang dijalankan terhadap data produksi dalam pekerjaan ini.

**Backup, migrasi, dan rollback:** sertakan tab LEDGER_TRANSFERS saat mengekspor workbook atau migrasi Supabase; event void juga merupakan audit. Setelah transfer nyata tercatat, jangan menurunkan backend ke versi yang tidak membaca event transfer karena kedua sisi akan hilang dari tampilan meskipun event masih tersimpan. Rollback harus mempertahankan loader/handler transfer atau merekonsiliasi event lebih dahulu. Menu impor per-baris bukan jalur pemulihan event transfer. Fitur ini memerlukan review perubahan penyimpanan, bukan sekadar penggantian label.

## Pemeriksaan paket terpadu

| Pembahasan | Perbaikan dalam paket | Bukti pengujian |
| --- | --- | --- |
| Nilai pasar gagal tersimpan | Payload lama tanpa anchor tetap diterima; anchor dihitung di bawah lock | Simpan Rp30.113.208, muat ulang, tolak anchor usang |
| Input kosong setelah gagal simpan | Draft dipertahankan, kegagalan ditampilkan, loading dipulihkan | Peninjauan form dan simulasi gagal simpan lokal |
| WD Rp10 juta dari Junior Vault | Batas memakai nilai investasi; modal dilepas proporsional | Rp756.482 tersisa, modal Rp479.876,72, realized Rp3.656.468,72 |
| Edit/hapus terkunci | Koreksi nominal/hapus mutasi terakhir yang belum menjadi dasar transaksi/valuasi lain; memo-only tidak mengubah angka | Edit Rp10 juta ke Rp9 juta, edit memo setelah valuasi baru, hapus dan muat ulang posisi awal |
| Floating merah membingungkan | Pisahkan floating, realized tercatat, total P/L, dan kelas aset | Pemeriksaan rumus, SSR, dan pratinjau browser |
| Transfer internal | Satu event untuk kedua sisi, modal kas dibawa, cancel berpasangan | Total aset/P&L tetap, failure/retry, pembatalan, batas tenant |
| Kurs USD berbeda | Kolom FX memakai satu benchmark, bukan nilai aset dibagi saldo | Beberapa kantong USD berbeda valuasi memakai FX sama; harga emas tetap dipertahankan |
| Periode dan tanggal valuasi | Cut-off laporan, realized bulan terpilih, tanggal per kantong dan acuan FX | Filter tanggal, pratinjau laporan |

Belum diklaim: uji tulis pada akun produksi, PDF hasil dialog cetak akun produksi, rekonstruksi realized historis yang datanya tidak ada, transfer beda mata uang/fee/unit saham, impor event transfer melalui JSON lama, atau migrasi Supabase. Perubahan ekonomi pada riwayat yang memiliki transaksi/valuasi dependen tetap memerlukan rekonsiliasi; mengedit teks tidak mengubah modal, saldo, atau hasil investasi.
