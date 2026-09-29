import { AssetPocket, LedgerTransaction } from '../types/ledger';
import { getPocketTypeLabel } from '../utils/formatters';

const CSV_HEADERS = [
  'Tanggal',
  'ID Transaksi',
  'Nama Kantong',
  'Kategori',
  'Tipe',
  'Mutasi Valas',
  'Currency',
  'Kurs FX',
  'Ekuivalen IDR',
  'Keterangan',
];

const escapeCsvCell = (value: unknown): string => {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return `"${text}"`;
};

export function buildLedgerTransactionsCsv(
  transactions: LedgerTransaction[],
  pockets: AssetPocket[]
): string {
  const pocketMap = new Map(
    pockets.map((pocket) => [String(pocket.id || '').trim(), pocket])
  );
  const rows = transactions.map((transaction) => {
    const pocket = pocketMap.get(String(transaction.pocketId || '').trim());
    const isCredit = transaction.type === 'CREDIT' || String(transaction.type) === 'IN';
    const amount = Math.abs(Number(transaction.nativeAmount ?? transaction.amount ?? 0));
    const rate = Number(transaction.exchangeRate ?? transaction.rate ?? 1);
    const equivalentIdr = Math.abs(
      Number(transaction.costIdr ?? transaction.totalIdr ?? amount * rate)
    );
    const currency = transaction.currency || pocket?.currencyCode || 'IDR';

    return [
      transaction.date,
      transaction.id,
      pocket?.name || 'Kantong Tidak Ditemukan',
      pocket?.category || getPocketTypeLabel(currency, pocket?.instrumentType),
      isCredit ? 'MASUK' : 'KELUAR',
      isCredit ? amount : -amount,
      currency,
      rate,
      isCredit ? equivalentIdr : -equivalentIdr,
      transaction.description || transaction.note || transaction.notes || '',
    ].map(escapeCsvCell).join(',');
  });

  return [CSV_HEADERS.map(escapeCsvCell).join(','), ...rows].join('\r\n');
}

export function exportLedgerTransactionsToCsv(
  transactions: LedgerTransaction[],
  pockets: AssetPocket[]
): void {
  const csvContent = buildLedgerTransactionsCsv(transactions, pockets);
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `JagoWealthLedger_Mutasi_${new Date().toISOString().split('T')[0]}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Beri browser waktu memulai unduhan sebelum Object URL dibebaskan.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
