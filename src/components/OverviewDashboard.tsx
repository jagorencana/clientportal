import React from 'react';
import { ExecutiveSummary } from './ExecutiveSummary';

/**
 * OverviewDashboard Component
 * Dashboard ikhtisar keuangan terpadu Jago Rencana Wealth OS:
 * - Skor Kesehatan Finansial & Live Reactive Score
 * - Estimasi Total Kekayaan Bersih (Reactive Net Worth riil: Kas Likuid + Investasi + Aset Fisik - Total Liabilitas)
 * - 4-Pos Alokasi Anggaran & Checklist Pendampingan 30 Hari
 */
export const OverviewDashboard = ExecutiveSummary;

export default OverviewDashboard;
export * from './ExecutiveSummary';
