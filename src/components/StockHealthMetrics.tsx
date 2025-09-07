import React, { useEffect, useState } from 'react';
import metricsCalculator from '../services/metricsCalculator';
import { 
  getCompanyOverview,  // Changed from fetchCompanyOverview
  fetchIncomeStatement, 
  fetchBalanceSheet,
  fetchCashFlow 
} from '../services/alphaVantage';

interface HealthMetricsProps {
  symbol: string;
}

export const StockHealthMetrics: React.FC<HealthMetricsProps> = ({ symbol }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        
        // Fetch all required data
        const [overview, income, balance, cashFlow] = await Promise.all([
          getCompanyOverview(symbol),  // Changed from fetchCompanyOverview
          fetchIncomeStatement(symbol),
          fetchBalanceSheet(symbol),
          fetchCashFlow(symbol)
        ]);

        // Calculate all metrics
        const altmanZ = metricsCalculator.calculateAltmanZScore(overview, income, balance);
        const fcf = metricsCalculator.calculateFreeCashFlow(cashFlow);
        const fcfYield = metricsCalculator.calculateFCFYield(overview, cashFlow);
        const currentRatio = metricsCalculator.calculateCurrentRatio(balance);
        const quickRatio = metricsCalculator.calculateQuickRatio(balance);
        const debtToEquity = metricsCalculator.calculateDebtToEquity(balance);
        const piotroskiScore = metricsCalculator.calculatePiotroskiScore(income, balance, cashFlow);
        const roic = metricsCalculator.calculateROIC(income, balance);

        setMetrics({
          altmanZ,
          freeCashFlow: fcf,
          fcfYield,
          currentRatio,
          quickRatio,
          debtToEquity,
          piotroskiScore,
          roic
        });
      } catch (error) {
        console.error('Error loading metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      loadMetrics();
    }
  }, [symbol]);

  // Rest of the component remains the same...
  // (Keep all the JSX/return statement from the previous version)
};
