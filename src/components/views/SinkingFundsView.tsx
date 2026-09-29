import React from 'react';
import { GoalSinkingFund } from '../GoalSinkingFund';
import { SinkingFundGoal, BudgetState } from '../../types';

export interface SinkingFundsViewProps {
  goals: SinkingFundGoal[];
  budget: BudgetState;
  onUpdateGoals: (newGoals: SinkingFundGoal[]) => void;
  onNavigateToBudgeting: () => void;
  onNavigateTab?: (tab: string) => void;
}

/**
 * SinkingFundsView
 * View terstruktur untuk perencanaan multi-sinking funds, manajemen target impian,
 * edit target real-time, simulasi timeline, dan alokasi tabungan bulanan.
 */
export const SinkingFundsView: React.FC<SinkingFundsViewProps> = (props) => {
  return <GoalSinkingFund {...props} />;
};

export default SinkingFundsView;
