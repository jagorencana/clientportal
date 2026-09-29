import React from 'react';
import { KprSimulationState } from '../types';
import { AdvisoryKprView } from './views/AdvisoryKprView';

interface KprRestructuringProps {
  kpr: KprSimulationState;
  onUpdateKpr: (newKpr: KprSimulationState) => void;
  onOpenAdvisorModal: () => void;
  onOpenDeliverable: (type: 'mfund') => void;
}

export const KprRestructuring: React.FC<KprRestructuringProps> = ({
  kpr,
  onUpdateKpr,
  onOpenAdvisorModal,
  onOpenDeliverable,
}) => {
  return (
    <AdvisoryKprView
      kpr={kpr}
      onUpdateKpr={onUpdateKpr}
      onOpenAdvisorModal={onOpenAdvisorModal}
      onOpenDeliverable={onOpenDeliverable}
    />
  );
};

export default KprRestructuring;
