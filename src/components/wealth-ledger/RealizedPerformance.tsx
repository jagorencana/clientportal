import React from 'react';
import type { LedgerTransaction } from '../../types/ledger';
import { realizationDetails } from '../../utils/wealthPresentation';
import { formatIdr } from '../../utils/formatters';

export function RealizedPerformance({transactions,floating}:{transactions:LedgerTransaction[];floating:number}) {
  const {rows,total,unclassified}=realizationDetails(transactions);
  const amount=(value:number)=> <strong className={`text-xl tabular-nums ${value<0?'text-rose-700':'text-emerald-700'}`}>{formatIdr(value)}</strong>;
  return <section aria-label="Penjelasan untung rugi" className="my-4 space-y-3">
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold">Belum direalisasikan · Floating P/L</p>{amount(floating)}<p className="text-[11px] text-slate-600">Nilai aset tersisa dikurangi modal tersisa. Berubah mengikuti valuasi.</p></div>
      <div className="rounded-xl bg-teal-50 p-3"><p className="text-xs font-semibold">Hasil terealisasi tercatat</p>{rows.length?amount(total):<strong className="text-xl">Belum tersedia</strong>}<p className="text-[11px] text-slate-600">Hasil jual/cair dikurangi modal yang dilepas. Nominal pencairan bukan seluruhnya keuntungan.</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold">Total P/L tercatat</p>{amount(floating+total)}<p className="text-[11px] text-slate-600">Floating + realisasi yang sudah tercatat. Bukan saldo tambahan dan tidak ditambahkan lagi ke nilai kekayaan.</p></div>
    </div>
    <p className="text-xs text-slate-600">Realisasi dihitung otomatis saat mencatat penjualan/pencairan investasi. Memperbarui nilai pasar tidak merealisasikan keuntungan. Memindahkan kas biasa juga tidak merealisasikan keuntungan.</p>
    <p className="text-[11px] text-slate-500">Untuk investasi nominal rupiah, modal dilepas dihitung secara proporsional dari valuasi acuan. Hasilnya estimasi pembukuan; cocokkan dengan laporan penyedia investasi. Dividen, bunga, biaya, dan pajak belum dicatat sebagai jenis transaksi tersendiri.</p>
    <p className="text-[11px] text-amber-800">Cakupan riwayat: seluruh transaksi yang tersedia, bukan hanya bulan ini. {rows.length?`${rows.length} pencairan memiliki modal dilepas.`:'Belum ada pencairan dengan modal dilepas yang dapat dihitung.'} {unclassified>0?`${unclassified} transaksi keluar belum diklasifikasikan untuk realisasi (termasuk pengeluaran kas dan riwayat lama).`:''} Total tercatat belum membuktikan hasil investasi sepanjang masa lengkap.</p>
    <details className="rounded-xl border border-slate-200 p-3">
      <summary className="cursor-pointer text-xs font-semibold text-teal-800">Lihat rincian perhitungan realisasi ({rows.length})</summary>
      {rows.length?<div className="mt-3 max-h-72 overflow-auto"><table className="w-full min-w-[540px] text-xs"><thead><tr><th className="py-2 text-left">Tanggal / transaksi</th><th className="text-right">Hasil pencairan</th><th className="text-right">Modal dilepas</th><th className="text-right">Untung/rugi</th></tr></thead><tbody>{rows.map(t=><tr key={t.id} className="border-t border-slate-100"><td className="py-2">{t.date}<br/>{t.description||'Pencairan'}</td><td className="text-right">{formatIdr(t.proceeds)}</td><td className="text-right">{formatIdr(t.cost)}</td><td className={`text-right ${t.pnl<0?'text-rose-700':'text-emerald-700'}`}>{formatIdr(t.pnl)}</td></tr>)}</tbody></table></div>:<p className="mt-2 text-xs text-slate-600">Realisasi akan tampil setelah pencairan dengan modal yang dapat dihitung disimpan. Jangan menambahkan transaksi keuntungan lagi untuk pencairan yang sama.</p>}
    </details>
  </section>;
}
