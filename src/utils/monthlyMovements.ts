import type { LedgerTransaction } from '../types/ledger';

export function monthlyMovements(transactions:LedgerTransaction[],now=new Date()) {
  const today=now.toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});
  const month=today.slice(0,7);
  const incoming:{transaction:LedgerTransaction;amountIdr:number}[]=[];
  const outgoing:{transaction:LedgerTransaction;amountIdr:number}[]=[];
  let transfers=0;
  let invalid=0;
  for(const transaction of transactions){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)||!transaction.date.startsWith(month)||transaction.date>today)continue;
    if(transaction.transferId||transaction.transferLeg){transfers++;continue;}
    const type=String(transaction.type);
    if(!['CREDIT','IN','DEBET','OUT'].includes(type))continue;
    const amountIdr=Math.abs(Number(transaction.costIdr??transaction.totalIdr??Number(transaction.nativeAmount??transaction.amount)*Number(transaction.exchangeRate??transaction.rate??1)));
    if(!Number.isFinite(amountIdr)||amountIdr<=0){invalid++;continue;}
    (type==='CREDIT'||type==='IN'?incoming:outgoing).push({transaction,amountIdr});
  }
  const order=(a:typeof incoming[number],b:typeof incoming[number])=>b.amountIdr-a.amountIdr||b.transaction.date.localeCompare(a.transaction.date)||a.transaction.id.localeCompare(b.transaction.id);
  const totalIn=incoming.reduce((sum,row)=>sum+row.amountIdr,0);
  const totalOut=outgoing.reduce((sum,row)=>sum+row.amountIdr,0);
  return {period:now.toLocaleDateString('id-ID',{month:'long',year:'numeric',timeZone:'Asia/Jakarta'}),today,
    topIn:incoming.sort(order).slice(0,5),topOut:outgoing.sort(order).slice(0,5),
    totalIn,totalOut,net:totalIn-totalOut,countIn:incoming.length,countOut:outgoing.length,transfers,invalid};
}

export type MonthlyMovements=ReturnType<typeof monthlyMovements>;
