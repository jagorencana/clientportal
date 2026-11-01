import React from 'react';
import type {CurrencyPocketSummary} from '../../types/ledger';
import type {MonthlyMovements} from '../../utils/monthlyMovements';
import {formatDate,formatIdr} from '../../utils/formatters';

export function MonthlyHighlights({data,pockets}:{data:MonthlyMovements;pockets:CurrencyPocketSummary[]}) {
  const names=new Map(pockets.map(p=>[p.pocketId,p.name||p.currencyName]));
  return <section aria-label="Mutasi terbesar bulan ini" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <h2 className="text-sm font-bold text-slate-900">Mutasi Bulan Ini · {data.period}</h2>
    <p className="mt-1 text-xs text-slate-500">Sampai {formatDate(data.today)}. Dana keluar termasuk pencairan investasi.</p>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {([{key:'in',title:'5 Dana Masuk Terbesar',rows:data.topIn,total:data.totalIn,count:data.countIn},{key:'out',title:'5 Dana Keluar Terbesar',rows:data.topOut,total:data.totalOut,count:data.countOut}] as const).map(group=><article key={group.key} className="rounded-xl border border-slate-200 p-3 sm:p-4">
        <h3 className={`text-sm font-bold ${group.key==='in'?'text-emerald-700':'text-rose-700'}`}>{group.title}</h3>
        <p className="mt-1 text-xs text-slate-500">Total bulan ini: <strong className="text-slate-800">{formatIdr(group.total)}</strong> · {group.count} transaksi</p>
        {group.rows.length?<ol className="mt-3 divide-y divide-slate-100">{group.rows.map(({transaction:t,amountIdr},index)=><li key={t.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] gap-2 py-3 text-xs">
          <span className="font-semibold text-slate-400">{index+1}.</span>
          <div className="min-w-0"><p className="break-words font-semibold text-slate-800">{t.description||t.note||'Tanpa keterangan'}</p><p className="mt-1 break-words text-[11px] text-slate-500">{formatDate(t.date)} · {names.get(t.pocketId)||t.posCategory||'Kantong tidak ditemukan'}</p></div>
          <strong className={`whitespace-nowrap tabular-nums ${group.key==='in'?'text-emerald-700':'text-rose-700'}`}>{formatIdr(amountIdr)}</strong>
        </li>)}</ol>:<p className="py-6 text-center text-xs text-slate-500">Belum ada dana {group.key==='in'?'masuk':'keluar'} bulan ini.</p>}
      </article>)}
    </div>
    <p className="mt-3 text-[11px] text-slate-500">Nominal rupiah mengikuti kurs saat transaksi. Transfer antar kantong yang tercatat berpasangan tidak dihitung.</p>
    {data.invalid>0&&<p className="mt-1 text-[11px] text-amber-800">{data.invalid} transaksi perlu diperiksa karena nominal belum valid.</p>}
  </section>;
}
