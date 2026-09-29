import React from 'react';
import { JagoPortfolio, JagoPortfolioProps } from './JagoPortfolio';

/**
 * PortfolioPlanningView
 * Linear stepping workflow (Langkah 1 -> 2 -> 3) for portfolio capital,
 * multi-asset compact allocation table, and future value compounding simulation.
 */
export const PortfolioPlanningView: React.FC<JagoPortfolioProps> = (props) => {
  return <JagoPortfolio {...props} />;
};

export default PortfolioPlanningView;
export * from './JagoPortfolio';
