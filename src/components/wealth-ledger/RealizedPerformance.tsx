import React from 'react';
import type { LedgerTransaction } from '../../types/ledger';
import { realizationDetails } from '../../utils/wealthPresentation';
import { formatIdr } from '../../utils/formatters';

export function RealizedPerformance({transactions,floating,estimated=false}:{transactions:LedgerTransaction[];floating:number;estimated?:boolean}) {
  const {rows,total}=realizationDetails(transactions);
  const amount=(value:number)=> <strong className={`text-xl tabular-nums ${value<0?'text-rose-700':'text-emerald-700'}`}>{formatIdr(value)}</strong>;
  return <section aria-label="Penjelasan untung rugi" className="my-4 space-y-3">
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold">Laba/Rugi Belum Dicairkan</p>{amount(floating)}<p className="text-[11px] text-slate-600">Nilai aset − modal tersisa.</p></div>
      <div className="rounded-xl bg-teal-50 p-3"><p className="text-xs font-semibold">Laba/Rugi Pencairan</p>{rows.length?amount(total):<strong className="text-xl">Belum ada data</strong>}<p className="text-[11px] text-slate-600">Pencairan dikurangi modal yang dicairkan.</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold">Total Hasil</p>{amount(floating+total)}<p className="text-[11px] text-slate-600">Belum dicairkan + laba/rugi pencairan. Tidak ditambahkan lagi ke saldo.</p></div>
    </div>
    <p className="text-[11px] text-slate-500">Sejak awal pencatatan.{estimated ? ' * Sebagian nilai masih perkiraan.' : ''} Dividen, bunga, biaya, dan pajak terpisah belum termasuk.</p>
    {!rows.length && <p className="text-[11px] text-slate-500">Belum ada data laba/rugi pencairan.</p>}
    {rows.length>0 && <div className="max-h-72 overflow-auto rounded-xl border border-slate-200 p-3"><table className="w-full min-w-[540px] text-xs"><thead><tr><th className="py-2 text-left">Tanggal / Keterangan</th><th className="text-right">Hasil pencairan</th><th className="text-right">Modal Dicairkan</th><th className="text-right">Laba/Rugi</th></tr></thead><tbody>{rows.map(t=><tr key={t.id} className="border-t border-slate-100"><td className="py-2">{t.date}<br/>{t.description||'Pencairan'}</td><td className="text-right">{formatIdr(t.proceeds)}</td><td className="text-right">{formatIdr(t.cost)}</td><td className={`text-right ${t.pnl<0?'text-rose-700':'text-emerald-700'}`}>{formatIdr(t.pnl)}</td></tr>)}</tbody></table></div>}
  </section>;
}
