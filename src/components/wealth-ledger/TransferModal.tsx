import React,{useState} from 'react';
import type {AssetPocket,LedgerTransaction} from '../../types/ledger';
import {prepareTransfer,transferSupported,TransferInput} from '../../utils/ledgerTransfers';
import {parseIdNumber} from '../../utils/numberInput';
import {formatIdr} from '../../utils/formatters';

export function TransferModal({pockets,transactions,onClose,onSave}:{pockets:AssetPocket[];transactions:LedgerTransaction[];onClose:()=>void;onSave:(input:TransferInput)=>Promise<boolean>}){
  const eligible=pockets.filter(transferSupported);
  const [from,setFrom]=useState(eligible[0]?.id||''),[to,setTo]=useState(''),[amount,setAmount]=useState('');
  const [date,setDate]=useState(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'}));
  const [memo,setMemo]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [id]=useState('transfer-'+Date.now()+'-'+crypto.randomUUID());
  const source=pockets.find(p=>p.id===from);
  const choices=eligible.filter(p=>p.id!==from&&p.currencyCode===source?.currencyCode);
  let preview:LedgerTransaction[]|undefined;
  let validation='';
  const input={id,fromPocketId:from,toPocketId:to,amount:parseIdNumber(amount),date,description:memo};
  try{preview=prepareTransfer(pockets,transactions.filter(t=>t.transferId!==id),input);}catch(e:any){validation=e.message;}
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4"><form role="dialog" aria-modal="true" aria-label="Pindahkan antar kantong" className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5" onSubmit={async e=>{e.preventDefault();if(validation||busy)return;setBusy(true);setError('');try{if(await onSave(input))onClose();else setError('Belum tersimpan. Periksa pesan kesalahan dan coba lagi dengan data yang sama.');}catch(e:any){setError(e?.message||'Perpindahan belum tersimpan. Coba lagi dengan data yang sama.');}finally{setBusy(false);}}}>
    <h2 className="text-lg font-bold">Pindahkan antar kantong</h2>
    <p className="text-xs text-slate-500">Mata uang sama. Kedua sisi dicatat bersama; perpindahan tidak dihitung sebagai setoran dari luar atau pengeluaran. Dari investasi ke kas berarti penjualan/pencairan: untung/rugi dihitung otomatis. Antar rekening kas hanya memindahkan aset. Gunakan nilai pasar tepat sebelum pencairan; pembagian modal investasi berbasis nominal merupakan estimasi proporsional.</p>
    <label className="block text-sm">Dari<select disabled={busy} value={from} onChange={e=>{setFrom(e.target.value);setTo('');}} className="mt-1 w-full rounded-lg border p-2">{eligible.map(p=><option key={p.id} value={p.id}>{p.name} ({p.currencyCode})</option>)}</select></label>
    <label className="block text-sm">Ke<select disabled={busy} value={to} onChange={e=>setTo(e.target.value)} className="mt-1 w-full rounded-lg border p-2"><option value="">Pilih kantong tujuan</option>{choices.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label className="block text-sm">Nominal ({source?.currencyCode})<input disabled={busy} inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 w-full rounded-lg border p-2" required/></label>
    <label className="block text-sm">Tanggal<input disabled={busy} type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full rounded-lg border p-2" required/></label>
    <label className="block text-sm">Keterangan<input disabled={busy} value={memo} onChange={e=>setMemo(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
    {preview?.[0].costBasisReleasedIdr!==undefined&&<p className="rounded-lg bg-teal-50 p-3 text-xs">Modal dilepas: {formatIdr(preview[0].costBasisReleasedIdr)} · Untung/rugi terealisasi (estimasi): {formatIdr(Math.abs(preview[0].costIdr)-preview[0].costBasisReleasedIdr)}</p>}
    {(error||validation)&&<p role="alert" className="text-xs text-rose-700">{error||validation}</p>}
    <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-3 py-2">Batal</button><button disabled={busy||!!validation} className="rounded-lg bg-teal-600 px-3 py-2 text-white disabled:opacity-40">{busy?'Menyimpan kedua sisi…':'Catat perpindahan'}</button></div>
  </form></div>;
}
