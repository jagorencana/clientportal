// One event row owns both legs. Creating or voiding an event is a single Sheet write.
function transferEvents(ss,email,includeVoided) {
  const sheet=ss.getSheetByName('LEDGER_TRANSFERS');
  if(!sheet||sheet.getLastRow()<2)return [];
  return sheet.getDataRange().getValues().slice(1).map(function(r,index){
    if(String(r[1]).trim().toLowerCase()!==email || (!includeVoided&&r[3]))return null;
    try{return {id:String(r[0]),payload:JSON.parse(String(r[2])),voidedAt:r[3],row:index+2};}catch(e){throw Error('Data perpindahan tidak valid; perlu rekonsiliasi.');}
  }).filter(Boolean);
}
function loadTransferTransactions(ss,email){
  return transferEvents(ss,email,false).reduce(function(rows,event){return rows.concat(event.payload.legs);},[]);
}
function handleLedgerTransfer(data,ss){
  const email=String(data.userEmail||'').trim().toLowerCase();
  if(!email||email.indexOf('@')<0)return transferResponse({success:false,status:'error',message:'Akun wajib valid.'});
  const input=data.transfer||{};
  const lock=LockService.getScriptLock();
  try{
    lock.waitLock(20000);
    const existing=transferEvents(ss,email,true).find(function(e){return e.id===input.id;});
    if(existing){
      if(existing.voidedAt||JSON.stringify(existing.payload.input)!==JSON.stringify(input))throw Error('ID perpindahan sudah dipakai atau dibatalkan.');
      return transferResponse({success:true,status:'success',transactions:existing.payload.legs});
    }
    const current=transferAccountingData(ss,email);
    const legs=LedgerTransferEngine.prepareTransfer(current.pockets,current.transactions,input);
    let sheet=ss.getSheetByName('LEDGER_TRANSFERS');
    if(!sheet){sheet=ss.insertSheet('LEDGER_TRANSFERS');sheet.getRange(1,1,1,5).setValues([['id','userEmail','payload','voidedAt','createdAt']]);}
    sheet.getRange(sheet.getLastRow()+1,1,1,5).setValues([[input.id,email,JSON.stringify({input:input,legs:legs}),'',new Date().toISOString()]]);
    SpreadsheetApp.flush();
    return transferResponse({success:true,status:'success',transactions:legs});
  }catch(e){return transferResponse({success:false,status:'error',message:String(e.message||e)});}
  finally{try{lock.releaseLock();}catch(e){}}
}
function handleCancelLedgerTransfer(data,ss){
  const email=String(data.userEmail||data.email||'').trim().toLowerCase();
  const id=String(data.transferId||'');
  if(!email||!id)return transferResponse({success:false,status:'error',message:'Akun dan ID perpindahan wajib diisi.'});
  const lock=LockService.getScriptLock();
  try{
    lock.waitLock(20000);
    const event=transferEvents(ss,email,true).find(function(e){return e.id===id;});
    if(!event)throw Error('Perpindahan tidak ditemukan pada akun ini.');
    if(event.voidedAt)return transferResponse({success:true,status:'success',transferId:id});
    const current=transferAccountingData(ss,email);
    for(const leg of event.payload.legs){
      const pocket=current.pockets.find(function(p){return String(p.id)===leg.pocketId;});
      const rows=current.transactions.filter(function(t){return String(t.pocketId)===leg.pocketId;}).sort(function(a,b){return String(a.date).localeCompare(String(b.date))||String(a.id).localeCompare(String(b.id));});
      if(!rows.length||rows[rows.length-1].id!==leg.id)throw Error('Batalkan mutasi berikutnya pada kedua kantong terlebih dahulu.');
      const reason=investmentServerDeletionError(pocket,current.transactions,leg.id);if(reason)throw Error(reason);
      if(pocket.lastPriceUpdatedAt){
        const day=Utilities.formatDate(new Date(pocket.lastPriceUpdatedAt),'Asia/Jakarta','yyyy-MM-dd');
        if(day>=leg.date)throw Error('Valuasi yang mencakup perpindahan ini perlu direkonsiliasi terlebih dahulu.');
      }
    }
    ss.getSheetByName('LEDGER_TRANSFERS').getRange(event.row,4).setValue(new Date().toISOString());
    SpreadsheetApp.flush();
    return transferResponse({success:true,status:'success',transferId:id});
  }catch(e){return transferResponse({success:false,status:'error',message:String(e.message||e)});}
  finally{try{lock.releaseLock();}catch(e){}}
}
function transferResponse(result){return typeof respondJson==='function'?respondJson(result):createJsonResponse(result);}
function transferDependencyError(history,candidate){
  return history.some(function(t){return String(t.pocketId)===String(candidate.pocketId)&&t.transferId&&t.id!==candidate.id&&
    (String(t.date)>String(candidate.date)||(String(t.date)===String(candidate.date)&&String(t.id).localeCompare(String(candidate.id))>0));})?
    'Batalkan perpindahan yang bergantung pada mutasi ini terlebih dahulu.':'';
}
function transferAccountingData(ss,email){
  if(typeof accountingTenantData==='function')return accountingTenantData(ss,email);
  return {pockets:readTenantLedgerRows(ss.getSheetByName('LEDGER_POCKETS'),email),
    transactions:readTenantLedgerRows(ss.getSheetByName('LEDGER_TRANSACTIONS'),email).concat(loadTransferTransactions(ss,email))};
}
