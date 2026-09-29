import React from 'react';
import { MasterBudgeting } from '../components/MasterBudgeting';
import { BudgetState, SinkingFundGoal } from '../types';
import { usePortal } from '../context/PortalContext';

export interface Master4PosBudgetViewProps {
  budget?: BudgetState;
  goals?: SinkingFundGoal[];
  onUpdateBudget?: (newBudget: BudgetState) => void;
  onNavigateToGoals?: () => void;
  onNavigateToPortfolio?: () => void;
}

/**
 * Master4PosBudgetView (views alias)
 * Visualisasi alokasi 4 pos anggaran (Kebutuhan Pokok, Cicilan Utang, Sinking Funds, Lifestyle)
 * Dilengkapi defensive optional chaining untuk siklus anggaran (currentPeriod & budgetStatus).
 */
export const Master4PosBudgetView: React.FC<Master4PosBudgetViewProps> = (props) => {
  const { portalData, masterBudget, sinkingFunds, updateMasterBudget } = usePortal();

  // Defensive Optional Chaining and Fallback Default
  const currentPeriod = portalData?.budgetCycle?.currentPeriod || portalData?.currentPeriod || '2026-09';
  const budgetStatus = portalData?.budgetStatusPerPeriod?.[currentPeriod] || portalData?.budgetCycle?.status || 'DRAFT';

  const safeBudget = props.budget || masterBudget || {
    monthlyNetIncome: 0,
    livingExpenses: [],
    debtObligations: [],
    lifestyleExpenses: [],
    budgetCycle: { currentPeriod, status: budgetStatus },
    currentPeriod,
  };

  const safeGoals = props.goals || sinkingFunds || [];
  const safeOnUpdate = props.onUpdateBudget || updateMasterBudget;

  return (
    <MasterBudgeting
      budget={safeBudget}
      goals={safeGoals}
      onUpdateBudget={safeOnUpdate}
      onNavigateToGoals={props.onNavigateToGoals || (() => {})}
      onNavigateToPortfolio={props.onNavigateToPortfolio}
    />
  );
};

export default Master4PosBudgetView;
