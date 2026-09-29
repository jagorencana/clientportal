import React from 'react';
import { JagoPortfolio, JagoPortfolioProps } from './JagoPortfolio';

/**
 * PortfolioPlanning View
 * Pure reactive multi-asset simulation, compounding & future value engine
 */
export const PortfolioPlanning: React.FC<JagoPortfolioProps> = (props) => {
  return <JagoPortfolio {...props} />;
};

export default PortfolioPlanning;
export * from './JagoPortfolio';
