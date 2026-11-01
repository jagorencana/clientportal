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


## Realized P/L interaction and disclosure

Do not add a separate “realize profit” transaction. A recorded sale/redemption realizes proceeds minus released acquisition cost once; its paired incoming cash leg does not create another gain. Updating market value does not realize P/L. Ordinary cash-to-cash transfers retain acquisition basis. A redemption into an owned cash account should use the paired transfer flow rather than two unrelated entries.

The dashboard and nominal-IDR investment detail show floating, recorded realized and their combined amount together, with expandable proceeds/cost/gain lines. Realized P/L is explanatory performance, not an asset to add to wealth again. Missing released-cost history displays unavailable/unclassified rather than implying zero gain. Disclosure covers all available records; no lifetime-completeness claim or portfolio-return percentage is made.

The nominal-IDR method allocates cost proportionally from the reference market valuation. Users should refresh the investment value immediately before redemption and reconcile against provider statements; this is an estimate, not provider unit/NAV lot accounting. Dividends, interest, fees and taxes are not independently supported event types yet and are not represented as a complete total investment return.

Validation added: a positive redemption, negative realization, incoming paired leg and unknown-cost legacy debit are distinguished without double counting. The disclosure is checked in server-rendered UI output; 25 accounting/integration/UI tests pass, along with TypeScript and build checks.


## Report valuation coverage

Monthly-report asset totals retain recorded estimates so unvalued holdings do not disappear from wealth/allocation. Manual-price investments require a positive stored manual valuation and a valuation date no later than cutoff to enter the covered-valuation subtotal. Cash requires an available FX reference. Missing valuations display a dash for individual performance rather than a false 0%. Headline P/L and group/footer estimates include all holdings with the same scope as asset and cost totals, labelled when estimates exist. A separate covered/estimated bridge explains the exact reconciliation. These are latest available valuations, not historical month-end prices or period returns.

Realizations without released-cost records display unavailable, not an asserted zero. The report explicitly excludes unclassified dividend/interest income from its completeness claim. Pocket names never automatically generate income or alter transaction classification. No historical transactions or provider prices are fabricated. Users still need to supply current investment valuations and reconcile source records.

Coverage tests check cash FX, unvalued USD/IDR investments, dated manual valuations, future/undated valuations, and preservation of asset totals while excluding unknown performance. 26 tests, TypeScript and production build pass.


## Foreign money-denominated investment top-ups

For non-IDR REKSADANA/SINKING_FUND pockets with a native-currency manual valuation and an unambiguous date, later deposits increase the native snapshot before conversion at current currency FX. A deposit increases cost by its actual historical IDR cost, not by its current converted value. Repeated calculations do not mutate the snapshot or double-add deposits. Saving a later valuation absorbs earlier deposits. Unit-based shares/gold are excluded from this nominal-money rule.

Missing or mismatched snapshot currency/date, same-day transactions with unknown ordering, later withdrawals, and unavailable FX require valuation refresh instead of inventing a return. These flagged pockets retain their last estimate in wealth and in the explicitly estimated headline difference. Their contributions are separate from the covered-valuation subtotal; dashboard, cards and report disclose incomplete coverage. The valuation form uses canonical FX and pre-fills the adjusted native amount. This change does not invent current SGOV prices or dividend income and does not change persisted transactions.

27 tests pass, including post-snapshot USD deposits, FX-only change on added capital, repeated/current snapshot handling, same-day ambiguity and withdrawal coverage guards. TypeScript and production build pass. Frontend-only; no Apps Script deployment required.


## Portfolio headline reconciliation

Always preserve assets minus remaining cost equals headline unrealized/estimated difference. Coverage must never silently change this scope. Known-valuation contribution plus estimated-valuation contribution equals the same headline; class sums and report totals use identical arithmetic. Percentage uses the remaining cost of all included holdings. Unknown individual performance remains unavailable; portfolio differences are marked estimates rather than asserted current returns.

Regression fixture from the reported numbers: assets Rp632,581,626 minus cost Rp630,183,233 equals +Rp2,398,393. Covered contribution -Rp648,044 plus estimated contribution +Rp3,046,437 equals that same +Rp2,398,393. Tests also reconcile class totals, percentages and realized-plus-floating totals. 28 tests, TypeScript and production build pass. No transaction data or Apps Script changes.


## Plain-language performance UI

Use Nilai Aset, Modal Tersisa, Laba/Rugi Belum Dicairkan, Laba/Rugi Pencairan and Total Hasil consistently in summary, detail and report labels. The arithmetic is unchanged. A single short notice explains holdings needing price refresh. Remove duplicate coverage reconciliation UI; keep its arithmetic regression tests. Do not display all ordinary cash outflows as an unresolved investment-realization count. Unknown realization remains explicitly unavailable, and brief data/estimate/dividend/fee limitations remain visible.

The latest screenshot fixture also reconciles Rp633,217,153 assets minus Rp630,183,233 remaining cost to Rp3,033,920, plus Rp3,656,469 realization equals Rp6,690,389. Class sums match the same totals.
