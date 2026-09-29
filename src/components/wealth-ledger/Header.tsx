import React from 'react';

/**
 * Komponen ini dipertahankan hanya untuk kompatibilitas import lama.
 * Client Portal sudah memiliki navbar utama; seluruh aksi Wealth Ledger
 * kini dirender sebagai toolbar normal-flow di WealthLedgerView.
 */
export interface HeaderProps {
  onOpenNewTxModal?: () => void;
  onOpenMonthlyReport: () => void;
  onExportCsv: () => void;
  onOpenFxModal: () => void;
  onOpenStatementModal?: () => void;
  onTriggerLiveFxSync?: () => void;
  isFxSyncing?: boolean;
  lastFxSyncTime?: string;
  txCount?: number;
  onSyncSheets?: () => void;
  isSyncingSheets?: boolean;
  lastSheetsSyncTime?: string | null;
}

export const Header: React.FC<HeaderProps> = () => null;

export default Header;
