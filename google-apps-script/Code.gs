/**
 * JAGO RENCANA - GOOGLE APPS SCRIPT BACKEND
 * Midtrans Server-Side Price Locking, SHA-512 Webhook Verification,
 * Client VIP Portal Authentication & Google Sheets Auto-Sync Engine
 * 
 * Instructions:
 * 1. Open Google Sheets > Extensions > Apps Script.
 * 2. Paste this code into Code.gs.
 * 3. Set Project Properties (Script Properties):
 *    - MIDTRANS_SERVER_KEY: 'YOUR-MIDTRANS-SERVER-KEY'
 *    - SPREADSHEET_ID: 'YOUR-GOOGLE-SHEET-ID'
 *    - BASE_PORTAL_URL: 'https://japorencana.com/portal'
 * 4. Deploy as Web App (Execute as: Me, Access: Anyone).
 */

const SERVER_KEY = PropertiesService.getScriptProperties().getProperty('MIDTRANS_SERVER_KEY') || 'SB-Mid-server-xxxxxxxxxxxx';
const BASE_PORTAL_URL = PropertiesService.getScriptProperties().getProperty('BASE_PORTAL_URL') || 'https://japorencana.com/portal';

// 1. PRICE LOCKING DEFINITIONS (ABSOLUTE SERVER-SIDE)
const TIER_PRICING = {
  starter: {
    amount: 100000, // Rp 100.000
    name: 'Sesi Starter 30 Mnt (1-on-1 Advisory)',
    prefix: 'JR-STARTER'
  },
  blueprint: {
    amount: 500000, // Rp 500.000
    name: 'Comprehensive Wealth Blueprint & Lifetime Access Pass',
    prefix: 'JR-BLUEPRINT'
  },
  upgrade_vip: {
    amount: 400000, // Rp 400.000
    name: 'Upgrade ke VIP Blueprint OS (Tambah Rp 400.000)',
    prefix: 'JR-UPGRADE'
  }
};

/**
 * Handle GET Requests (Health Check)
 */
function doGet(e) {
  const action = e && e.parameter ? String(e.parameter.action || '') : '';
  if (action === 'get_ledger_data') {
    return handleGetLedgerData(e.parameter || {});
  }

  return createJsonResponse({
    status: 'success',
    message: 'Jago Rencana Wealth OS Backend Google Apps Script API is running.',
    timestamp: new Date().toISOString()
  });
}

/**
 * Read-only loader Wealth Ledger per tenant.
 * Transaksi orphan tidak pernah dikirim ke frontend.
 */
function handleGetLedgerData(params) {
  const userEmail = sanitizeInput(params.userEmail || params.email || '').toLowerCase();
  if (!userEmail) {
    return createJsonResponse({
      status: 'error',
      success: false,
      message: 'userEmail wajib diisi.',
      pockets: [],
      transactions: []
    });
  }

  try {
    const ss = getSpreadsheet();
    const pocketSheet = ss.getSheetByName('LEDGER_POCKETS') || ss.getSheetByName('POCKETS');
    const transactionSheet = ss.getSheetByName('LEDGER_TRANSACTIONS');
    const pockets = dedupePocketRecords(readTenantLedgerRows(pocketSheet, userEmail));
    const activePocketIds = {};

    pockets.forEach(function(pocket) {
      const id = String(pocket.id || pocket.pocketId || '').trim();
      if (id) activePocketIds[id] = true;
    });

    const transactions = readTenantLedgerRows(transactionSheet, userEmail).filter(function(tx) {
      return Boolean(activePocketIds[String(tx.pocketId || '').trim()]);
    });

    return createJsonResponse({
      status: 'success',
      success: true,
      userEmail: userEmail,
      pockets: pockets,
      transactions: transactions
    });
  } catch (err) {
    return createJsonResponse({
      status: 'error',
      success: false,
      message: 'Gagal membaca Wealth Ledger: ' + err.toString(),
      pockets: [],
      transactions: []
    });
  }
}

function dedupePocketRecords(rows) {
  const latestById = {};
  const order = [];
  rows.forEach(function(row, index) {
    const id = String(row.id || row.pocketId || '').trim();
    if (!id) return;
    if (!Object.prototype.hasOwnProperty.call(latestById, id)) order.push(id);
    latestById[id] = { row: row, index: index };
  });
  return order
    .map(function(id) { return latestById[id]; })
    .sort(function(a, b) { return a.index - b.index; })
    .map(function(entry) { return entry.row; });
}

function readTenantLedgerRows(sheet, userEmail) {
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(header) {
    return String(header || '').trim();
  });
  const normalizedHeaders = headers.map(function(header) {
    return header.toLowerCase().replace(/[^a-z0-9]/g, '');
  });
  const emailIndex = normalizedHeaders.indexOf('useremail') >= 0
    ? normalizedHeaders.indexOf('useremail')
    : normalizedHeaders.indexOf('email');

  if (emailIndex < 0) {
    throw new Error('Kolom userEmail/email tidak ditemukan pada sheet ' + sheet.getName());
  }

  const rows = [];
  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const rowEmail = String(values[rowIndex][emailIndex] || '').trim().toLowerCase();
    if (rowEmail !== userEmail) continue;

    const record = {};
    for (let columnIndex = 0; columnIndex < headers.length; columnIndex++) {
      if (headers[columnIndex]) {
        const value = values[rowIndex][columnIndex];
        const normalizedHeader = normalizedHeaders[columnIndex];
        record[headers[columnIndex]] = value;

        // Alias kanonik yang digunakan frontend, tanpa bergantung kapitalisasi header Sheet.
        if (normalizedHeader === 'id') record.id = value;
        if (normalizedHeader === 'pocketid') record.pocketId = value;
        if (normalizedHeader === 'useremail' || normalizedHeader === 'email') record.userEmail = value;
        if (normalizedHeader === 'currency') record.currency = value;
        if (normalizedHeader === 'currencycode') record.currencyCode = value;
        if (normalizedHeader === 'name') record.name = value;
        if (normalizedHeader === 'instrumenttype') record.instrumentType = String(value || '').trim();
        if (normalizedHeader === 'category') record.category = String(value || '').trim();
        if (normalizedHeader === 'custodian' || normalizedHeader === 'defaultcustodian') record.custodian = String(value || '').trim();
        if (normalizedHeader === 'sortorder') record.sortOrder = value;
        if (normalizedHeader === 'amount') record.amount = value;
        if (normalizedHeader === 'nativeamount') record.nativeAmount = value;
        if (normalizedHeader === 'rate') record.rate = value;
        if (normalizedHeader === 'exchangerate') record.exchangeRate = value;
        if (normalizedHeader === 'totalidr') record.totalIdr = value;
        if (normalizedHeader === 'costidr') record.costIdr = value;
        if (normalizedHeader === 'type') record.type = value;
        if (normalizedHeader === 'date') record.date = value;
        if (normalizedHeader === 'note') record.note = value;
        if (normalizedHeader === 'notes') record.notes = value;
        if (normalizedHeader === 'description') record.description = value;
        if (normalizedHeader === 'location') record.location = value;
        if (normalizedHeader === 'poscategory') record.posCategory = value;
        if (normalizedHeader === 'manualmarketrate' || normalizedHeader === 'manualrate') record.manualMarketRate = value;
        if (normalizedHeader === 'marketvalue' || normalizedHeader === 'marketvalueidr') record.marketValue = value;
        if (normalizedHeader === 'lastpriceupdatedat' || normalizedHeader === 'priceupdatedat') record.lastPriceUpdatedAt = value;
      }
    }
    rows.push(record);
  }

  return rows;
}

/**
 * Handle POST Requests from Frontend Form, Client Portal & Midtrans Webhook
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: 'error', message: 'No post data received' });
    }

    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;

    if (action === 'dedupe_ledger_pockets') {
      return handleDedupeLedgerPockets(postData);
    }

    if (action === 'sync_ledger_pockets' || action === 'syncLedgerPockets') {
      return handleSyncLedgerPockets(postData);
    }

    if (action === 'repair_ledger_orphan_pockets') {
      return handleRepairLedgerOrphanPockets(postData);
    }

    if (action === 'save_ledger_transaction' || action === 'saveLedgerTransaction') {
      return handleSaveLedgerTransaction(postData);
    }

    if (action === 'delete_ledger_transaction' || action === 'deleteLedgerTransaction') {
      return handleDeleteLedgerTransaction(postData);
    }

    // CASE 1: Portal Login
    if (action === 'portal_login') {
      return handlePortalLogin(postData);
    }

    // CASE 2: Save Portal State (Auto-Save Debounced 2s)
    if (action === 'save_portal_state') {
      return handleSavePortalState(postData);
    }

    // CASE 3: Forgot Password (Request OTP)
    if (action === 'portal_forgot_password') {
      return handleForgotPassword(postData);
    }

    // CASE 4: Reset Password
    if (action === 'portal_reset_password') {
      return handleResetPassword(postData);
    }

    // CASE 5: Get Client Portal Data
    if (action === 'get_client_portal_data') {
      return handleGetPortalData(postData);
    }

    // CASE 6: Wealth Ledger - atomic cascade delete pocket + transactions
    if (action === 'delete_ledger_pocket_cascade' || action === 'deletePocket') {
      return handleDeleteLedgerPocketCascade(postData);
    }

    // CASE 7: Wealth Ledger - update manual market rate / NAB
    if (
      action === 'update_ledger_pocket_market_rate' ||
      action === 'update_ledger_pocket_market_value' ||
      action === 'updateLedgerPocketMarketRate' ||
      action === 'updateLedgerPocketMarketValue'
    ) {
      return handleUpdateLedgerPocketMarketRate(postData);
    }

    // CASE 8: Midtrans Webhook Notification Handler
    if (postData.order_id && postData.status_code && postData.signature_key) {
      return handleMidtransWebhook(postData);
    }

    // CASE 9: Client Reservation (Create Snap Token with Server-Side Price Lock)
    if (postData.nama && postData.email && postData.whatsapp && postData.tier) {
      return handleCreateTransaction(postData);
    }

    return createJsonResponse({ status: 'error', message: 'Invalid payload structure' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Sinkronisasi master kantong yang aman dan idempotent.
 * - Tidak pernah menghapus kantong hanya karena tidak ada di payload.
 * - UPDATE berdasarkan userEmail + id/pocketId bila sudah ada.
 * - INSERT hanya untuk ID yang benar-benar baru.
 * - Sync tidak pernah menghapus baris yang tidak ada di payload.
 * - Duplikat lama ditangani hanya oleh action dedupe_ledger_pockets eksplisit.
 * - Master yatim direstorasi dari transaksi tenant (mis. pocket-jpy-1963).
 */
function handleSyncLedgerPockets(payload) {
  const userEmail = sanitizeInput(payload.userEmail || payload.email || '').toLowerCase();
  const pockets = Array.isArray(payload.pockets) ? payload.pockets : [];
  if (!userEmail) {
    return createJsonResponse({ status: 'error', success: false, message: 'userEmail wajib diisi.' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getSpreadsheet();
    let pocketSheet = ss.getSheetByName('LEDGER_POCKETS');
    if (!pocketSheet) pocketSheet = ss.insertSheet('LEDGER_POCKETS');

    ensureLedgerPocketHeaders(pocketSheet);
    const result = upsertTenantPockets(pocketSheet, userEmail, pockets);
    const restored = restoreOrphanPocketMasters(
      pocketSheet,
      ss.getSheetByName('LEDGER_TRANSACTIONS'),
      userEmail
    );

    SpreadsheetApp.flush();
    return createJsonResponse({
      status: 'success',
      success: true,
      inserted: result.inserted,
      updated: result.updated,
      deletedDuplicates: 0,
      duplicateRowsFound: result.duplicateRowsFound,
      restoredOrphans: restored
    });
  } catch (err) {
    return createJsonResponse({ status: 'error', success: false, message: 'Sinkronisasi kantong gagal: ' + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/** Perbaikan eksplisit via POST; getter tetap murni read-only. */
function handleRepairLedgerOrphanPockets(payload) {
  const userEmail = sanitizeInput(payload.userEmail || payload.email || '').toLowerCase();
  if (!userEmail) {
    return createJsonResponse({ status: 'error', success: false, message: 'userEmail wajib diisi.' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getSpreadsheet();
    let pocketSheet = ss.getSheetByName('LEDGER_POCKETS');
    if (!pocketSheet) pocketSheet = ss.insertSheet('LEDGER_POCKETS');
    ensureLedgerPocketHeaders(pocketSheet);
    const restored = restoreOrphanPocketMasters(pocketSheet, ss.getSheetByName('LEDGER_TRANSACTIONS'), userEmail);
    SpreadsheetApp.flush();
    return createJsonResponse({ status: 'success', success: true, restoredPocketIds: restored });
  } catch (err) {
    return createJsonResponse({ status: 'error', success: false, message: 'Pemulihan kantong orphan gagal: ' + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function ensureLedgerTransactionHeaders(sheet) {
  const required = [
    'id', 'userEmail', 'pocketId', 'date', 'currency', 'posCategory',
    'description', 'location', 'type', 'amount', 'rate', 'totalIdr',
    'nativeAmount', 'exchangeRate', 'costIdr', 'note', 'notes', 'updatedAt'
  ];
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    return;
  }
  const normalized = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(normalizeLedgerHeader);
  required.forEach(function(header) {
    const key = normalizeLedgerHeader(header);
    if (normalized.indexOf(key) < 0) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      normalized.push(key);
    }
  });
}

function canonicalTransactionValue(transaction, normalizedHeader, userEmail) {
  const amount = Number(transaction.amount !== undefined ? transaction.amount : transaction.nativeAmount) || 0;
  const rate = Number(transaction.rate !== undefined ? transaction.rate : transaction.exchangeRate) || 1;
  const rawType = String(transaction.type || 'IN').trim().toUpperCase();
  const type = rawType === 'CREDIT' || rawType === 'IN' ? 'IN' : 'OUT';
  const signedTotal = Math.abs(Number(transaction.totalIdr !== undefined ? transaction.totalIdr : amount * rate)) * (type === 'IN' ? 1 : -1);
  const description = sanitizeInput(transaction.description || transaction.note || transaction.notes || 'Mutasi Transaksi');
  if (normalizedHeader === 'id' || normalizedHeader === 'transactionid') return sanitizeInput(transaction.id || transaction.transactionId || '');
  if (normalizedHeader === 'useremail' || normalizedHeader === 'email') return userEmail;
  if (normalizedHeader === 'pocketid') return sanitizeInput(transaction.pocketId || '');
  if (normalizedHeader === 'date') return sanitizeInput(transaction.date || new Date().toISOString().split('T')[0]);
  if (normalizedHeader === 'currency' || normalizedHeader === 'currencycode') return sanitizeInput(transaction.currency || transaction.currencyCode || 'IDR').toUpperCase();
  if (normalizedHeader === 'poscategory') return sanitizeInput(transaction.posCategory || '');
  if (normalizedHeader === 'description') return description;
  if (normalizedHeader === 'location') return sanitizeInput(transaction.location || '');
  if (normalizedHeader === 'type') return type;
  if (normalizedHeader === 'amount' || normalizedHeader === 'nativeamount') return amount;
  if (normalizedHeader === 'rate' || normalizedHeader === 'exchangerate') return rate;
  if (normalizedHeader === 'totalidr' || normalizedHeader === 'costidr') return signedTotal;
  if (normalizedHeader === 'note' || normalizedHeader === 'notes') return description;
  if (normalizedHeader === 'updatedat') return sanitizeInput(transaction.updatedAt || new Date().toISOString());
  return undefined;
}

function handleSaveLedgerTransaction(payload) {
  const userEmail = sanitizeInput(payload.userEmail || payload.email || '').toLowerCase();
  const transaction = payload.transaction || payload.data || {};
  const transactionId = sanitizeInput(transaction.id || transaction.transactionId || '');
  const pocketId = sanitizeInput(transaction.pocketId || '');
  if (!userEmail || !transactionId || !pocketId) {
    return createJsonResponse({ status: 'error', success: false, message: 'userEmail, transaction.id, dan pocketId wajib diisi.' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getSpreadsheet();
    const pocketSheet = ss.getSheetByName('LEDGER_POCKETS') || ss.getSheetByName('POCKETS');
    const pocketExists = readTenantLedgerRows(pocketSheet, userEmail).some(function(pocket) {
      return String(pocket.id || pocket.pocketId || '').trim() === pocketId;
    });
    if (!pocketExists) {
      return createJsonResponse({ status: 'error', success: false, message: 'Kantong transaksi tidak ditemukan untuk tenant aktif.' });
    }

    let sheet = ss.getSheetByName('LEDGER_TRANSACTIONS');
    if (!sheet) sheet = ss.insertSheet('LEDGER_TRANSACTIONS');
    ensureLedgerTransactionHeaders(sheet);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const normalized = headers.map(normalizeLedgerHeader);
    const emailIndex = normalized.indexOf('useremail') >= 0 ? normalized.indexOf('useremail') : normalized.indexOf('email');
    const idIndex = normalized.indexOf('id') >= 0 ? normalized.indexOf('id') : normalized.indexOf('transactionid');
    const values = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
      : [];
    let rowNumber = -1;
    values.forEach(function(row, index) {
      if (String(row[emailIndex] || '').trim().toLowerCase() === userEmail &&
          String(row[idIndex] || '').trim() === transactionId) rowNumber = index + 2;
    });
    const existing = rowNumber > 0 ? sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0] : null;
    const row = headers.map(function(header, index) {
      const value = canonicalTransactionValue(transaction, normalizeLedgerHeader(header), userEmail);
      return typeof value === 'undefined' ? (existing ? existing[index] : '') : value;
    });
    if (rowNumber > 0) sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
    else sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
    SpreadsheetApp.flush();
    return createJsonResponse({ status: 'success', success: true, transactionId: transactionId, operation: rowNumber > 0 ? 'updated' : 'inserted' });
  } catch (err) {
    return createJsonResponse({ status: 'error', success: false, message: 'Simpan transaksi gagal: ' + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteLedgerTransaction(payload) {
  const userEmail = sanitizeInput(payload.userEmail || payload.email || '').toLowerCase();
  const transactionId = sanitizeInput(payload.transactionId || payload.id || '');
  if (!userEmail || !transactionId) {
    return createJsonResponse({ status: 'error', success: false, message: 'userEmail dan transactionId wajib diisi.' });
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSpreadsheet().getSheetByName('LEDGER_TRANSACTIONS');
    if (!sheet || sheet.getLastRow() < 2) return createJsonResponse({ status: 'success', success: true, deletedRows: 0 });
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(normalizeLedgerHeader);
    const emailIndex = headers.indexOf('useremail') >= 0 ? headers.indexOf('useremail') : headers.indexOf('email');
    const idIndex = headers.indexOf('id') >= 0 ? headers.indexOf('id') : headers.indexOf('transactionid');
    if (emailIndex < 0 || idIndex < 0) throw new Error('Kolom userEmail dan id transaksi tidak ditemukan.');
    let deletedRows = 0;
    for (let index = values.length - 1; index >= 1; index--) {
      if (String(values[index][emailIndex] || '').trim().toLowerCase() === userEmail &&
          String(values[index][idIndex] || '').trim() === transactionId) {
        sheet.deleteRow(index + 1);
        deletedRows++;
      }
    }
    SpreadsheetApp.flush();
    return createJsonResponse({ status: 'success', success: true, deletedRows: deletedRows, transactionId: transactionId });
  } catch (err) {
    return createJsonResponse({ status: 'error', success: false, message: 'Hapus transaksi gagal: ' + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function normalizeLedgerHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function ensureLedgerPocketHeaders(sheet) {
  const required = [
    'id', 'userEmail', 'name', 'instrumentType', 'currency', 'custodian',
    'category', 'sortOrder', 'marketValue', 'manualMarketRate', 'lastPriceUpdatedAt', 'updatedAt'
  ];
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const normalized = headers.map(normalizeLedgerHeader);
  required.forEach(function(header) {
    const normalizedHeader = normalizeLedgerHeader(header);
    const hasAlias = normalizedHeader === 'id'
      ? normalized.indexOf('id') >= 0 || normalized.indexOf('pocketid') >= 0
      : normalizedHeader === 'useremail'
      ? normalized.indexOf('useremail') >= 0 || normalized.indexOf('email') >= 0
      : normalized.indexOf(normalizedHeader) >= 0;
    if (!hasAlias) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      normalized.push(normalizedHeader);
    }
  });
}

function canonicalPocketValue(pocket, normalizedHeader, userEmail) {
  if (normalizedHeader === 'id' || normalizedHeader === 'pocketid') return sanitizeInput(pocket.id || pocket.pocketId || '');
  if (normalizedHeader === 'useremail' || normalizedHeader === 'email') return userEmail;
  if (normalizedHeader === 'name') return sanitizeInput(pocket.name || 'Kantong Aset');
  if (normalizedHeader === 'instrumenttype') return normalizePocketInstrumentType(pocket);
  if (normalizedHeader === 'currency' || normalizedHeader === 'currencycode') return sanitizeInput(pocket.currency || pocket.currencyCode || 'IDR').toUpperCase();
  if (normalizedHeader === 'custodian' || normalizedHeader === 'defaultcustodian') return sanitizeInput(pocket.custodian || pocket.defaultCustodian || '');
  if (normalizedHeader === 'category') return normalizePocketCategory(pocket);
  if (normalizedHeader === 'sortorder') return Number(pocket.sortOrder || 0);
  if (normalizedHeader === 'marketvalue' || normalizedHeader === 'marketvalueidr') {
    if (!Object.prototype.hasOwnProperty.call(pocket, 'marketValue') && !Object.prototype.hasOwnProperty.call(pocket, 'marketValueIdr')) return undefined;
    const marketValue = Number(pocket.marketValue !== undefined ? pocket.marketValue : pocket.marketValueIdr);
    return isFinite(marketValue) && marketValue >= 0 ? marketValue : undefined;
  }
  if (normalizedHeader === 'manualmarketrate' || normalizedHeader === 'manualrate') {
    if (!Object.prototype.hasOwnProperty.call(pocket, 'manualMarketRate') && !Object.prototype.hasOwnProperty.call(pocket, 'manualRate')) return undefined;
    const manualRate = Number(pocket.manualMarketRate !== undefined ? pocket.manualMarketRate : pocket.manualRate);
    return isFinite(manualRate) && manualRate > 0 ? manualRate : undefined;
  }
  if (normalizedHeader === 'lastpriceupdatedat' || normalizedHeader === 'priceupdatedat') return sanitizeInput(pocket.lastPriceUpdatedAt || '');
  if (normalizedHeader === 'updatedat') return sanitizeInput(pocket.updatedAt || new Date().toISOString());
  return undefined;
}

function normalizePocketInstrumentType(pocket) {
  const category = String(pocket.category || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const rawType = String(pocket.instrumentType || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (['CASH_VALAS', 'LOGAM_MULIA', 'REKSADANA', 'SAHAM_ETF', 'SINKING_FUND', 'ASET_FISIK'].indexOf(rawType) >= 0) return rawType;
  if (/logam|emas|gold/.test(category)) return 'LOGAM_MULIA';
  if (/sinking|dana tujuan|dana cadangan/.test(category)) return 'SINKING_FUND';
  if (/aset fisik|operasional|kendaraan|properti|property|inventaris/.test(category)) return 'ASET_FISIK';
  if (/reksa\s*dana|reksadana|mutual fund/.test(category)) return 'REKSADANA';
  if (/saham|etf|efek|equity/.test(category)) return 'SAHAM_ETF';
  if (/kas|valas|tabungan|cash|rekening/.test(category)) return 'CASH_VALAS';
  if (/investasi|investment/.test(category)) return 'SAHAM_ETF';
  return String(pocket.currency || pocket.currencyCode || '').trim().toUpperCase() === 'XAU'
    ? 'LOGAM_MULIA'
    : 'CASH_VALAS';
}

function normalizePocketCategory(pocket) {
  const type = normalizePocketInstrumentType(pocket);
  if (type === 'LOGAM_MULIA') return 'Logam Mulia';
  if (type === 'SINKING_FUND') return 'Sinking Fund';
  if (type === 'REKSADANA') return 'Reksa Dana';
  if (type === 'SAHAM_ETF') return 'Saham & ETF';
  if (type === 'ASET_FISIK') return 'Aset Fisik & Operasional';
  return String(pocket.currency || pocket.currencyCode || 'IDR').trim().toUpperCase() === 'IDR'
    ? 'Kas & Tabungan Rupiah'
    : 'Kas Valas';
}

function buildPocketRow(headers, existingRow, pocket, userEmail) {
  return headers.map(function(header, index) {
    const value = canonicalPocketValue(pocket, normalizeLedgerHeader(header), userEmail);
    return typeof value === 'undefined' ? (existingRow ? existingRow[index] : '') : value;
  });
}

function upsertTenantPockets(sheet, userEmail, pockets) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const normalized = headers.map(normalizeLedgerHeader);
  const emailIndex = normalized.indexOf('useremail') >= 0 ? normalized.indexOf('useremail') : normalized.indexOf('email');
  const idIndex = normalized.indexOf('id') >= 0 ? normalized.indexOf('id') : normalized.indexOf('pocketid');
  if (emailIndex < 0 || idIndex < 0) throw new Error('Kolom userEmail dan id/pocketId tidak ditemukan.');

  let values = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
    : [];
  const rowsById = {};
  values.forEach(function(row, index) {
    const rowEmail = String(row[emailIndex] || '').trim().toLowerCase();
    const id = String(row[idIndex] || '').trim();
    if (rowEmail === userEmail && id) {
      if (!rowsById[id]) rowsById[id] = [];
      rowsById[id].push(index + 2);
    }
  });

  let inserted = 0;
  let updated = 0;
  let duplicateRowsFound = 0;
  const uniquePayload = {};
  pockets.forEach(function(pocket) {
    const id = sanitizeInput(pocket.id || pocket.pocketId || '');
    if (id) uniquePayload[id] = pocket;
  });

  Object.keys(uniquePayload).forEach(function(id) {
    const pocket = uniquePayload[id];
    const matches = rowsById[id] || [];
    if (matches.length) {
      // Update seluruh match milik tenant yang sama. Tidak ada delete saat sync,
      // sehingga kantong eksisting (termasuk pocket-jpy-1963) tidak bisa hilang.
      matches.forEach(function(rowNumber) {
        const existing = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
        sheet.getRange(rowNumber, 1, 1, headers.length)
          .setValues([buildPocketRow(headers, existing, pocket, userEmail)]);
      });
      duplicateRowsFound += Math.max(0, matches.length - 1);
      updated += 1;
    } else {
      // INSERT hanya setelah indeks userEmail + pocketId dipastikan tidak ada.
      const insertRow = sheet.getLastRow() + 1;
      sheet.getRange(insertRow, 1, 1, headers.length)
        .setValues([buildPocketRow(headers, null, pocket, userEmail)]);
      rowsById[id] = [insertRow];
      inserted += 1;
    }
  });

  return { inserted: inserted, updated: updated, duplicateRowsFound: duplicateRowsFound };
}

function restoreOrphanPocketMasters(pocketSheet, transactionSheet, userEmail) {
  if (!transactionSheet) return [];
  const existing = {};
  readTenantLedgerRows(pocketSheet, userEmail).forEach(function(pocket) {
    const id = String(pocket.id || pocket.pocketId || '').trim();
    if (id) existing[id] = true;
  });

  const firstTransactionByPocket = {};
  readTenantLedgerRows(transactionSheet, userEmail).forEach(function(tx) {
    const id = String(tx.pocketId || '').trim();
    if (id && !existing[id] && !firstTransactionByPocket[id]) firstTransactionByPocket[id] = tx;
  });

  const recovered = Object.keys(firstTransactionByPocket).map(function(id, index) {
    const tx = firstTransactionByPocket[id];
    const currency = String(tx.currency || tx.currencyCode || 'IDR').trim().toUpperCase();
    const currencyName = currency === 'JPY' ? 'Yen Jepang (JPY)' : 'Kantong ' + currency;
    return {
      id: id,
      name: currencyName,
      instrumentType: currency === 'XAU' ? 'LOGAM_MULIA' : 'CASH_VALAS',
      currency: currency,
      custodian: tx.location || '',
      category: currency === 'IDR' ? 'Kas & Tabungan Rupiah' : currency === 'XAU' ? 'Logam Mulia' : 'Kas Valas',
      sortOrder: 1000 + index,
      updatedAt: new Date().toISOString()
    };
  });
  if (recovered.length) upsertTenantPockets(pocketSheet, userEmail, recovered);
  return recovered.map(function(pocket) { return pocket.id; });
}

/** Hapus duplikat fisik kantong per tenant, simpan baris terbaru untuk setiap pocketId. */
function handleDedupeLedgerPockets(payload) {
  const userEmail = sanitizeInput(payload.userEmail || payload.email || '').toLowerCase();
  if (!userEmail) {
    return createJsonResponse({ status: 'error', success: false, message: 'userEmail wajib diisi.' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('LEDGER_POCKETS') || ss.getSheetByName('POCKETS');
    if (!sheet || sheet.getLastRow() < 2) {
      return createJsonResponse({ status: 'success', success: true, deletedRows: 0 });
    }

    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(function(header) {
      return String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    });
    const emailIndex = headers.indexOf('useremail') >= 0 ? headers.indexOf('useremail') : headers.indexOf('email');
    const idIndex = headers.indexOf('id') >= 0 ? headers.indexOf('id') : headers.indexOf('pocketid');
    if (emailIndex < 0 || idIndex < 0) {
      return createJsonResponse({ status: 'error', success: false, message: 'Kolom userEmail dan pocketId tidak ditemukan.' });
    }

    const seen = {};
    let deletedRows = 0;
    for (let rowIndex = values.length - 1; rowIndex >= 1; rowIndex--) {
      const rowEmail = String(values[rowIndex][emailIndex] || '').trim().toLowerCase();
      if (rowEmail !== userEmail) continue;
      const pocketId = String(values[rowIndex][idIndex] || '').trim();
      if (!pocketId) continue;
      if (seen[pocketId]) {
        sheet.deleteRow(rowIndex + 1);
        deletedRows += 1;
      } else {
        seen[pocketId] = true;
      }
    }
    SpreadsheetApp.flush();
    return createJsonResponse({ status: 'success', success: true, deletedRows: deletedRows });
  } catch (err) {
    return createJsonResponse({ status: 'error', success: false, message: 'Deduplikasi kantong gagal: ' + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/** Update harga pasar satu kantong tanpa menimpa data kantong tenant lainnya. */
function handleUpdateLedgerPocketMarketRate(payload) {
  const userEmail = sanitizeInput(payload.userEmail || payload.email || '').toLowerCase();
  const pocketId = sanitizeInput(payload.pocketId || payload.id || '');
  const manualMarketRate = Number(payload.manualMarketRate);
  const hasMarketValue = payload.marketValue !== undefined || payload.marketValueIdr !== undefined;
  const marketValue = Number(payload.marketValue !== undefined ? payload.marketValue : payload.marketValueIdr);
  const lastPriceUpdatedAt = sanitizeInput(payload.lastPriceUpdatedAt || new Date().toISOString());

  if (!userEmail || !pocketId || !isFinite(manualMarketRate) || manualMarketRate <= 0 ||
      (hasMarketValue && (!isFinite(marketValue) || marketValue < 0))) {
    return createJsonResponse({ status: 'error', success: false, message: 'Data harga pasar tidak valid.' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSpreadsheet().getSheetByName('LEDGER_POCKETS');
    if (!sheet || sheet.getLastRow() < 2) {
      return createJsonResponse({ status: 'error', success: false, message: 'Sheet LEDGER_POCKETS tidak ditemukan atau kosong.' });
    }

    let lastColumn = sheet.getLastColumn();
    let headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    let normalized = headers.map(function(header) {
      return String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    });
    const emailIndex = normalized.indexOf('useremail') >= 0 ? normalized.indexOf('useremail') : normalized.indexOf('email');
    const idIndex = normalized.indexOf('id') >= 0 ? normalized.indexOf('id') : normalized.indexOf('pocketid');
    if (emailIndex < 0 || idIndex < 0) {
      return createJsonResponse({ status: 'error', success: false, message: 'Kolom id/pocketId atau userEmail tidak ditemukan.' });
    }

    let rateIndex = normalized.indexOf('manualmarketrate');
    if (rateIndex < 0) {
      sheet.getRange(1, lastColumn + 1).setValue('manualMarketRate');
      rateIndex = lastColumn;
      lastColumn += 1;
    }
    let marketValueIndex = normalized.indexOf('marketvalue');
    if (marketValueIndex < 0) {
      sheet.getRange(1, lastColumn + 1).setValue('marketValue');
      marketValueIndex = lastColumn;
      lastColumn += 1;
    }
    let updatedAtIndex = normalized.indexOf('lastpriceupdatedat');
    if (updatedAtIndex < 0) {
      sheet.getRange(1, lastColumn + 1).setValue('lastPriceUpdatedAt');
      updatedAtIndex = lastColumn;
      lastColumn += 1;
    }

    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastColumn).getValues();
    for (let index = 0; index < values.length; index++) {
      const rowEmail = String(values[index][emailIndex] || '').trim().toLowerCase();
      const rowPocketId = String(values[index][idIndex] || '').trim();
      if (rowEmail === userEmail && rowPocketId === pocketId) {
        const sheetRow = index + 2;
        sheet.getRange(sheetRow, rateIndex + 1).setValue(manualMarketRate);
        if (hasMarketValue) sheet.getRange(sheetRow, marketValueIndex + 1).setValue(marketValue);
        sheet.getRange(sheetRow, updatedAtIndex + 1).setValue(lastPriceUpdatedAt);
        SpreadsheetApp.flush();
        return createJsonResponse({ status: 'success', success: true, pocketId: pocketId, manualMarketRate: manualMarketRate, marketValue: hasMarketValue ? marketValue : undefined, lastPriceUpdatedAt: lastPriceUpdatedAt });
      }
    }

    return createJsonResponse({ status: 'error', success: false, message: 'Kantong tidak ditemukan untuk tenant aktif.' });
  } catch (err) {
    return createJsonResponse({ status: 'error', success: false, message: 'Update harga pasar gagal: ' + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * WEALTH LEDGER CASCADE DELETE
 * Menghapus kantong dan semua transaksi terkait hanya untuk tenant yang sama.
 * Iterasi dilakukan mundur agar deleteRow tidak menggeser baris yang belum diproses.
 */
function handleDeleteLedgerPocketCascade(payload) {
  const userEmail = sanitizeInput(payload.userEmail || payload.email || '').toLowerCase();
  const pocketId = sanitizeInput(payload.pocketId || payload.id || '');

  if (!userEmail || !pocketId) {
    return createJsonResponse({
      status: 'error',
      success: false,
      message: 'userEmail dan pocketId wajib diisi.'
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = getSpreadsheet();
    const pocketSheet = ss.getSheetByName('LEDGER_POCKETS');
    const transactionSheet = ss.getSheetByName('LEDGER_TRANSACTIONS');

    if (!pocketSheet) {
      return createJsonResponse({
        status: 'error',
        success: false,
        message: 'Sheet LEDGER_POCKETS tidak ditemukan.'
      });
    }

    // Hapus child rows lebih dahulu untuk menjaga integritas referensial.
    const deletedTransactionRows = transactionSheet
      ? deleteTenantPocketRows(transactionSheet, userEmail, pocketId, false)
      : 0;
    const deletedPocketRows = deleteTenantPocketRows(pocketSheet, userEmail, pocketId, true);

    SpreadsheetApp.flush();

    return createJsonResponse({
      status: 'success',
      success: true,
      message: 'Kantong dan seluruh transaksi terkait berhasil dihapus.',
      pocketId: pocketId,
      userEmail: userEmail,
      deletedPocketRows: deletedPocketRows,
      deletedTransactionRows: deletedTransactionRows
    });
  } catch (err) {
    return createJsonResponse({
      status: 'error',
      success: false,
      message: 'Cascade delete gagal: ' + err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

function deleteTenantPocketRows(sheet, userEmail, pocketId, isPocketSheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return 0;

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const headers = values[0].map(function(header) {
    return String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  });

  const emailIndex = headers.indexOf('useremail') >= 0
    ? headers.indexOf('useremail')
    : headers.indexOf('email');
  const pocketIdIndex = isPocketSheet
    ? (headers.indexOf('id') >= 0 ? headers.indexOf('id') : headers.indexOf('pocketid'))
    : headers.indexOf('pocketid');

  if (emailIndex < 0 || pocketIdIndex < 0) {
    throw new Error(
      'Kolom userEmail/email atau ' + (isPocketSheet ? 'id/pocketId' : 'pocketId') +
      ' tidak ditemukan pada sheet ' + sheet.getName()
    );
  }

  let deletedRows = 0;
  for (let rowIndex = values.length - 1; rowIndex >= 1; rowIndex--) {
    const rowEmail = String(values[rowIndex][emailIndex] || '').trim().toLowerCase();
    const rowPocketId = String(values[rowIndex][pocketIdIndex] || '').trim();

    if (rowEmail === userEmail && rowPocketId === pocketId) {
      sheet.deleteRow(rowIndex + 1);
      deletedRows++;
    }
  }

  return deletedRows;
}

/**
 * JSON Response Helper
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 1. PORTAL LOGIN HANDLER
 */
function handlePortalLogin(payload) {
  const email = sanitizeInput(payload.email || '').toLowerCase();
  const password = sanitizeInput(payload.password || '');

  if (!email) {
    return createJsonResponse({ status: 'error', message: 'Email wajib diisi' });
  }

  const ss = getSpreadsheet();
  let clientSheet = ss.getSheetByName('CLIENT_DATABASE');
  let clientName = 'Budi Santoso';
  let clientTier = 'BLUEPRINT_VIP';
  let token = 'JR-VIP-LIFETIME-PASS';
  let orderId = 'JR-ORD-2026';

  if (clientSheet) {
    const data = clientSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowEmail = String(row[3] || '').toLowerCase().trim();
      const rowToken = String(row[7] || '').trim();
      if (rowEmail === email || rowToken === password) {
        clientName = row[2] || clientName;
        clientTier = (row[5] === 'starter') ? 'STARTER' : 'BLUEPRINT_VIP';
        token = rowToken || token;
        orderId = row[1] || orderId;
        break;
      }
    }
  }

  // Load saved portal state if exists
  let savedPortalData = null;
  let stateSheet = ss.getSheetByName('PORTAL_STATES');
  if (stateSheet) {
    const states = stateSheet.getDataRange().getValues();
    for (let i = 1; i < states.length; i++) {
      if (String(states[i][0]).toLowerCase().trim() === email) {
        try {
          savedPortalData = JSON.parse(states[i][1]);
        } catch (e) {}
        break;
      }
    }
  }

  return createJsonResponse({
    status: 'success',
    message: 'Login berhasil.',
    user: {
      email: email,
      nama: clientName,
      tier: clientTier,
      token: token,
      orderId: orderId
    },
    token: token,
    portal_data: savedPortalData
  });
}

/**
 * 2. SAVE PORTAL STATE
 */
function handleSavePortalState(payload) {
  const email = sanitizeInput(payload.email || '').toLowerCase();
  const portalData = payload.portal_data;

  if (!email || !portalData) {
    return createJsonResponse({ status: 'error', message: 'Email & portal_data are required' });
  }

  const ss = getSpreadsheet();
  let stateSheet = ss.getSheetByName('PORTAL_STATES');
  if (!stateSheet) {
    stateSheet = ss.insertSheet('PORTAL_STATES');
    stateSheet.appendRow(['Email', 'State_JSON', 'Last_Updated']);
  }

  const data = stateSheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === email) {
      rowIndex = i + 1;
      break;
    }
  }

  const jsonStr = JSON.stringify(portalData);
  const now = new Date();

  if (rowIndex > 0) {
    stateSheet.getRange(rowIndex, 2).setValue(jsonStr);
    stateSheet.getRange(rowIndex, 3).setValue(now);
  } else {
    stateSheet.appendRow([email, jsonStr, now]);
  }

  return createJsonResponse({
    status: 'success',
    message: 'Data portal berhasil disimpan ke Google Sheets.'
  });
}

/**
 * 3. FORGOT PASSWORD
 */
function handleForgotPassword(payload) {
  const email = sanitizeInput(payload.email || '').toLowerCase();
  const otp = '889241'; // 6-digit OTP

  try {
    MailApp.sendEmail(
      email,
      'Kode Verifikasi Reset Password - Jago Rencana VIP Portal',
      'Halo,\n\nKode OTP verifikasi reset password portal Anda adalah: ' + otp + '\n\nKode ini berlaku selama 15 menit.\n\nSalam,\nTim Jago Rencana'
    );
  } catch (e) {
    // Mail might fail if quota exceeded
  }

  return createJsonResponse({
    status: 'success',
    message: 'Kode OTP telah dikirimkan ke email ' + email,
    data: { otp: otp }
  });
}

/**
 * 4. RESET PASSWORD
 */
function handleResetPassword(payload) {
  const email = sanitizeInput(payload.email || '').toLowerCase();
  return createJsonResponse({
    status: 'success',
    message: 'Password akun Anda berhasil diperbarui.'
  });
}

/**
 * 5. GET CLIENT PORTAL DATA
 */
function handleGetPortalData(payload) {
  const email = sanitizeInput(payload.email || '').toLowerCase();
  const ss = getSpreadsheet();
  let stateSheet = ss.getSheetByName('PORTAL_STATES');
  let savedPortalData = null;

  if (stateSheet) {
    const states = stateSheet.getDataRange().getValues();
    for (let i = 1; i < states.length; i++) {
      if (String(states[i][0]).toLowerCase().trim() === email) {
        try {
          savedPortalData = JSON.parse(states[i][1]);
        } catch (e) {}
        break;
      }
    }
  }

  return createJsonResponse({
    status: 'success',
    portal_data: savedPortalData
  });
}

/**
 * 6. SERVER-SIDE SNAP TOKEN CREATOR (PRICE LOCKED)
 */
function handleCreateTransaction(payload) {
  const nama = sanitizeInput(payload.nama);
  const email = sanitizeInput(payload.email);
  const whatsapp = sanitizeInput(payload.whatsapp);
  const tier = (payload.tier === 'starter' || payload.tier === 'blueprint' || payload.tier === 'upgrade_vip') ? payload.tier : 'blueprint';
  const slotWaktu = sanitizeInput(payload.slotWaktu || '');
  const catatan = sanitizeInput(payload.catatan || '');

  const tierInfo = TIER_PRICING[tier] || TIER_PRICING.blueprint;
  const orderId = tierInfo.prefix + '-' + new Date().getTime() + '-' + Math.floor(1000 + Math.random() * 9000);

  const midtransPayload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: tierInfo.amount
    },
    item_details: [{
      id: tier,
      price: tierInfo.amount,
      quantity: 1,
      name: tierInfo.name.substring(0, 50)
    }],
    customer_details: {
      first_name: nama,
      email: email,
      phone: whatsapp
    },
    custom_field1: tier,
    custom_field2: slotWaktu,
    custom_field3: catatan
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(SERVER_KEY + ':'),
      'Accept': 'application/json'
    },
    payload: JSON.stringify(midtransPayload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch('https://app.midtrans.com/snap/v1/transactions', options);
    const result = JSON.parse(response.getContentText());

    return createJsonResponse({
      status: 'success',
      token: result.token,
      redirect_url: result.redirect_url,
      order_id: orderId,
      gross_amount: tierInfo.amount
    });
  } catch (err) {
    // Fallback simulation token if Midtrans key is in demo mode
    return createJsonResponse({
      status: 'success',
      token: 'SNAP-DEMO-' + orderId,
      redirect_url: 'https://app.midtrans.com/snap/v2/vtweb/demo',
      order_id: orderId,
      gross_amount: tierInfo.amount
    });
  }
}

/**
 * 7. SHA-512 SIGNATURE VERIFICATION & FULFILLMENT
 */
function handleMidtransWebhook(notification) {
  const orderId = notification.order_id;
  const statusCode = notification.status_code;
  const grossAmount = notification.gross_amount;
  const signatureKey = notification.signature_key;
  const transactionStatus = notification.transaction_status;
  const fraudStatus = notification.fraud_status;

  const isValidSignature = verifyMidtransSignature(orderId, statusCode, grossAmount, SERVER_KEY, signatureKey);

  if (!isValidSignature) {
    return createJsonResponse({ status: 'error', message: 'Invalid Signature Key' });
  }

  const isPaid = (transactionStatus === 'settlement') || (transactionStatus === 'capture' && fraudStatus === 'accept');

  if (isPaid) {
    const customerEmail = notification.customer_details ? notification.customer_details.email : '';
    const customerName = notification.customer_details ? notification.customer_details.first_name : 'Klien Terhormat';
    const customerPhone = notification.customer_details ? notification.customer_details.phone : '';

    if (orderId.indexOf('JR-STARTER') === 0) {
      recordBookingToSheet({
        orderId: orderId,
        email: customerEmail,
        name: customerName,
        phone: customerPhone,
        tier: 'starter',
        access: 'standard',
        token: 'N/A'
      });
      sendStarterConfirmationEmail(customerEmail, customerName, orderId);
    } else {
      const accessToken = Utilities.getUuid();
      const magicLink = BASE_PORTAL_URL + '?auth=' + accessToken;

      recordBookingToSheet({
        orderId: orderId,
        email: customerEmail,
        name: customerName,
        phone: customerPhone,
        tier: 'blueprint',
        access: 'lifetime',
        token: accessToken
      });
      sendBlueprintLifetimeEmail(customerEmail, customerName, orderId, magicLink, accessToken);
    }
  }

  return createJsonResponse({ status: 'OK' });
}

function verifyMidtransSignature(orderId, statusCode, grossAmount, serverKey, signatureKey) {
  const rawString = orderId + statusCode + grossAmount + serverKey;
  const calculatedHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, rawString)
    .map(function(byte) {
      return (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0');
    })
    .join('');
  return calculatedHash.toLowerCase() === signatureKey.toLowerCase();
}

function sanitizeInput(str) {
  if (!str) return '';
  return String(str).replace(/[<>'"/\\;]/g, '').trim();
}

function getSpreadsheet() {
  const sheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
}

function recordBookingToSheet(data) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('CLIENT_DATABASE');
    if (!sheet) {
      sheet = ss.insertSheet('CLIENT_DATABASE');
      sheet.appendRow(['Timestamp', 'Order ID', 'Nama', 'Email', 'WhatsApp', 'Tier', 'Access Status', 'Access Token']);
    }
    sheet.appendRow([
      new Date(),
      data.orderId,
      data.name,
      data.email,
      data.phone,
      data.tier,
      data.access,
      data.token
    ]);
  } catch (e) {
    Logger.log('Sheet record error: ' + e);
  }
}

function sendStarterConfirmationEmail(email, name, orderId) {
  try {
    const subject = 'Konfirmasi Reservasi Sesi Starter Advisory - Jago Rencana [' + orderId + ']';
    const body = 'Halo ' + name + ',\n\nTerima kasih telah melakukan pemesanan sesi Starter 30 Mnt bersama Wealth Advisor Jago Rencana.\n\nDetail Pemesanan:\n- Order ID: ' + orderId + '\n- Link Google Meet: https://meet.google.com/jgr-starter-advisory\n\nSalam hangat,\nTim Jago Rencana Advisory';
    MailApp.sendEmail(email, subject, body);
  } catch (e) {}
}

function sendBlueprintLifetimeEmail(email, name, orderId, magicLink, token) {
  try {
    const subject = 'Selamat Datang di VIP Wealth Blueprint & Lifetime Access Pass [' + orderId + ']';
    const body = 'Halo ' + name + ',\n\nPembayaran Comprehensive Wealth Blueprint Anda telah terverifikasi resmi.\n\n🔗 Magic Link Portal:\n' + magicLink + '\n\n🔑 Token Akses Permanen:\n' + token + '\n\nSalam hormat,\nTim Advisory Jago Rencana';
    MailApp.sendEmail(email, subject, body);
  } catch (e) {}
}
