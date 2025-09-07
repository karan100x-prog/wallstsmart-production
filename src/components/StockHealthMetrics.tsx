import React, { useEffect, useState } from 'react';
import metricsCalculator from '../services/metricsCalculator';
import { 
  getCompanyOverview,
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
        
        const [overview, income, balance, cashFlow] = await Promise.all([
          getCompanyOverview(symbol),
          fetchIncomeStatement(symbol),
          fetchBalanceSheet(symbol),
          fetchCashFlow(symbol)
        ]);

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

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="h-24 bg-gray-700 rounded"></div>
            <div className="h-24 bg-gray-700 rounded"></div>
            <div className="h-24 bg-gray-700 rounded"></div>
            <div className="h-24 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (!value) return 'N/A';
    const billions = value / 1000000000;
    if (Math.abs(billions) >= 1) {
      return `$${billions.toFixed(2)}B`;
    }
    const millions = value / 1000000;
    return `$${millions.toFixed(2)}M`;
  };

  const getScoreColor = (score: string, type: string) => {
    if (type === 'altman') {
      const value = parseFloat(score);
      if (value > 3) return 'text-green-400';
      if (value > 1.8) return 'text-yellow-400';
      return 'text-red-400';
    }
    return 'text-white';
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
      <h3 className="text-xl font-bold text-white mb-6">
        🏥 Advanced Financial Health Metrics
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        
        {/* Altman Z-Score */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
          <div className="text-gray-400 text-sm mb-1">Altman Z-Score</div>
          <div className={`text-2xl font-bold ${getScoreColor(metrics?.altmanZ?.score || '0', 'altman')}`}>
            {metrics?.altmanZ?.score || 'N/A'}
          </div>
          <div className={`text-sm mt-1 ${
            metrics?.altmanZ?.color === 'green' ? 'text-green-400' :
            metrics?.altmanZ?.color === 'yellow' ? 'text-yellow-400' :
            metrics?.altmanZ?.color === 'red' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {metrics?.altmanZ?.interpretation || ''}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            &gt;3 Safe | 1.8-3 Caution | &lt;1.8 Risk
          </div>
        </div>

        {/* Piotroski F-Score */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
          <div className="text-gray-400 text-sm mb-1">Piotroski F-Score</div>
          <div className="text-2xl font-bold text-white">
            {metrics?.piotroskiScore?.score !== null && metrics?.piotroskiScore?.score !== undefined 
              ? `${metrics.piotroskiScore.score}/9` 
              : 'N/A'}
          </div>
          <div className={`text-sm mt-1 ${
            metrics?.piotroskiScore?.score >= 7 ? 'text-green-400' :
            metrics?.piotroskiScore?.score >= 5 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {metrics?.piotroskiScore?.interpretation || ''}
          </div>
        </div>

        {/* Free Cash Flow */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
          <div className="text-gray-400 text-sm mb-1">Free Cash Flow</div>
          <div className={`text-2xl font-bold ${metrics?.freeCashFlow > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(metrics?.freeCashFlow)}
          </div>
          <div className="text-sm text-gray-400 mt-1">TTM</div>
        </div>

        {/* FCF Yield */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
          <div className="text-gray-400 text-sm mb-1">FCF Yield</div>
          <div className="text-2xl font-bold text-white">
            {metrics?.fcfYield ? `${metrics.fcfYield}%` : 'N/A'}
          </div>
          <div className="text-sm text-gray-400 mt-1">FCF/Market Cap</div>
        </div>

        {/* ROIC */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
          <div className="text-gray-400 text-sm mb-1">ROIC</div>
          <div className="text-2xl font-bold text-white">
            {metrics?.roic ? `${metrics.roic}%` : 'N/A'}
          </div>
          <div className="text-sm text-gray-400 mt-1">Return on Capital</div>
        </div>

        {/* Current Ratio */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
          <div className="text-gray-400 text-sm mb-1">Current Ratio</div>
          <div className="text-2xl font-bold text-white">
            {metrics?.currentRatio || 'N/A'}
          </div>
          <div className={`text-sm mt-1 ${
            parseFloat(metrics?.currentRatio) > 1.5 ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {parseFloat(metrics?.currentRatio) > 1.5 ? 'Healthy' : 'Monitor'}
          </div>
        </div>

        {/* Quick Ratio */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
          <div className="text-gray-400 text-sm mb-1">Quick Ratio</div>
          <div className="text-2xl font-bold text-white">
            {metrics?.quickRatio || 'N/A'}
          </div>
          <div className={`text-sm mt-1 ${
            parseFloat(metrics?.quickRatio) > 1 ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {parseFloat(metrics?.quickRatio) > 1 ? 'Strong' : 'Low'}
          </div>
        </div>

        {/* Debt to Equity */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
          <div className="text-gray-400 text-sm mb-1">Debt/Equity</div>
          <div className="text-2xl font-bold text-white">
            {metrics?.debtToEquity || 'N/A'}
          </div>
          <div className={`text-sm mt-1 ${
            parseFloat(metrics?.debtToEquity) < 1 ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {parseFloat(metrics?.debtToEquity) < 1 ? 'Low Leverage' : 'Leveraged'}
          </div>
        </div>
      </div>
    </div>
  );
};
