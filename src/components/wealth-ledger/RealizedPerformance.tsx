import React from 'react';
import type { LedgerTransaction } from '../../types/ledger';
import { realizationDetails } from '../../utils/wealthPresentation';
import { formatIdr } from '../../utils/formatters';

export function RealizedPerformance({transactions,floating}:{transactions:LedgerTransaction[];floating:number}) {
  const {rows,total,unclassified}=realizationDetails(transactions);
  const amount=(value:number)=> <strong className={`text-xl tabular-nums ${value<0?'text-rose-700':'text-emerald-700'}`}>{formatIdr(value)}</strong>;
  return <section aria-label="Penjelasan untung rugi" className="my-4 space-y-3">
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold">Belum direalisasikan · Floating P/L</p>{amount(floating)}<p className="text-[11px] text-slate-600">Nilai aset − modal tersisa.</p></div>
      <div className="rounded-xl bg-teal-50 p-3"><p className="text-xs font-semibold">Hasil terealisasi tercatat</p>{rows.length?amount(total):<strong className="text-xl">Belum tersedia</strong>}<p className="text-[11px] text-slate-600">Hasil pencairan − modal dilepas.</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold">Total P/L tercatat</p>{amount(floating+total)}<p className="text-[11px] text-slate-600">Floating + realisasi; tidak ditambahkan lagi ke nilai kekayaan.</p></div>
    </div>
    <p className="text-[11px] text-slate-500">Sejak awal pencatatan · Realisasi otomatis saat jual/cair · Modal nominal rupiah memakai estimasi pembukuan proporsional.</p>
    <p className="text-[11px] text-amber-800">{rows.length ? `${rows.length} pencairan tercatat.` : 'Belum ada realisasi yang dapat dihitung.'} {unclassified>0 ? `${unclassified} transaksi keluar belum diklasifikasikan; riwayat realisasi belum tentu lengkap.` : 'Riwayat lama belum tentu lengkap.'} Belum mencakup dividen, bunga, biaya, dan pajak terpisah.</p>
    {rows.length>0 && <div className="max-h-72 overflow-auto rounded-xl border border-slate-200 p-3"><table className="w-full min-w-[540px] text-xs"><thead><tr><th className="py-2 text-left">Tanggal / transaksi</th><th className="text-right">Hasil pencairan</th><th className="text-right">Modal dilepas</th><th className="text-right">Untung/rugi</th></tr></thead><tbody>{rows.map(t=><tr key={t.id} className="border-t border-slate-100"><td className="py-2">{t.date}<br/>{t.description||'Pencairan'}</td><td className="text-right">{formatIdr(t.proceeds)}</td><td className="text-right">{formatIdr(t.cost)}</td><td className={`text-right ${t.pnl<0?'text-rose-700':'text-emerald-700'}`}>{formatIdr(t.pnl)}</td></tr>)}</tbody></table></div>}
  </section>;
}
