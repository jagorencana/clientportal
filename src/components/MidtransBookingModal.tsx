import React from 'react';
import { UpgradeModal } from './UpgradeModal';
import { VipSessionData } from '../utils/security';

interface MidtransBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTier?: string;
  onPaymentSuccess?: (session: VipSessionData) => void;
}

/**
 * Legacy wrapper forwarding to Duitku UpgradeModal
 */
export const MidtransBookingModal: React.FC<MidtransBookingModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  return (
    <UpgradeModal
      isOpen={isOpen}
      onClose={onClose}
      onUpgradeSuccess={onPaymentSuccess}
    />
  );
};
