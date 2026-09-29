import type { FinancialHealthMetrics } from '../types';
import type { HomepageAuditData } from './auditData';

export interface HealthScoreBreakdown {
  dsrScore: number;
  emergencyFundScore: number;
  savingScore: number;
  cashflowScore: number;
}

export interface DisplayHealthScore {
  score: number;
  status: string;
  color: string;
  pointDiff: number;
}

export const calculateHealthScore = ({
  dsrScore,
  emergencyFundScore,
  savingScore,
  cashflowScore,
}: HealthScoreBreakdown): number => {
  const rawScore = dsrScore + emergencyFundScore + savingScore + cashflowScore;
  return Math.min(100, Math.max(10, Math.round(rawScore)));
};

/**
 * Satu sumber kebenaran untuk skor yang ditampilkan di Dashboard dan Report.
 * Sebelum pengguna melakukan optimasi, keduanya menampilkan baseline audit.
 */
export const resolveDisplayHealthScore = (
  metrics: FinancialHealthMetrics,
  baselineAudit: Pick<HomepageAuditData, 'baselineScore' | 'baselineStatus'> | undefined,
  hasUserOptimized: boolean
): DisplayHealthScore => {
  const baselineScore = Number.isFinite(Number(baselineAudit?.baselineScore))
    ? Math.min(100, Math.max(0, Number(baselineAudit?.baselineScore)))
    : 0;
  const liveScore = Number.isFinite(Number(metrics.healthScore))
    ? Math.min(100, Math.max(0, Number(metrics.healthScore)))
    : 0;

  if (!hasUserOptimized) {
    return {
      score: baselineScore,
      status: baselineAudit?.baselineStatus || 'Belum Diaudit',
      color: '#D97706',
      pointDiff: 0,
    };
  }

  return {
    score: liveScore,
    status: metrics.status,
    color: metrics.statusColor,
    pointDiff: liveScore - baselineScore,
  };
};
