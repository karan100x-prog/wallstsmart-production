// StockHealthMetrics.tsx - Without Altman Z-Score Gauge
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

interface MetricCardProps {
  title: string;
  value: string | number;
  maxValue?: number;
  interpretation?: string;
  showProgress?: boolean;
  benchmark?: string;
}

// Metric Card Component with Progress Bar
const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  maxValue = 10, 
  interpretation, 
  showProgress = false,
  benchmark
}) => {
  const isValidValue = value !== 'N/A' && value !== 'Negative Equity' && 
                      value !== null && value !== undefined && 
                      (typeof value === 'number' || !isNaN(parseFloat(String(value))));
  
  const numValue = isValidValue ? (typeof value === 'string' ? parseFloat(value) : value) : 0;
  const progressPercent = isValidValue && maxValue ? (Math.abs(numValue) / maxValue) * 100 : 0;
  
  const getProgressColor = () => {
    if (!isValidValue) return 'bg-gray-600';
    
    if (title === 'Altman Z-Score') {
      if (numValue > 3) return 'bg-green-500';
      if (numValue > 1.8) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    if (title === 'Piotroski F-Score') {
      if (numValue >= 7) return 'bg-green-500';
      if (numValue >= 5) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    if (title === 'ROIC' || title === 'FCF Yield') {
      if (numValue > 15) return 'bg-green-500';
      if (numValue > 5) return 'bg-yellow-500';
      if (numValue > 0) return 'bg-orange-500';
      return 'bg-red-500';
    }
    if (title === 'Current Ratio' || title === 'Quick Ratio') {
      if (numValue > 1.5) return 'bg-green-500';
      if (numValue > 1.0) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    if (title === 'Debt/Equity') {
      if (numValue < 0.5) return 'bg-green-500';
      if (numValue < 1.0) return 'bg-yellow-500';
      if (numValue < 2.0) return 'bg-orange-500';
      return 'bg-red-500';
    }
    return 'bg-blue-500';
  };

  const getInterpretationColor = () => {
    if (!isValidValue || value === 'Negative Equity') return 'text-red-500';
    if (!interpretation) return 'text-gray-400';
    
    if (interpretation.includes('Strong') || interpretation.includes('Safe') || 
        interpretation.includes('Excellent') || interpretation.includes('Positive') ||
        interpretation.includes('Low Leverage')) {
      return 'text-green-400';
    }
    if (interpretation.includes('Moderate') || interpretation.includes('Grey')) {
      return 'text-yellow-400';
    }
    if (interpretation.includes('Weak') || interpretation.includes('Distress') ||
        interpretation.includes('High Leverage') || interpretation.includes('Negative')) {
      return 'text-red-400';
    }
    return 'text-gray-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <div className="text-gray-400 text-sm">{title}</div>
        {benchmark && isValidValue && (
          <div className="text-xs text-gray-500">Target: {benchmark}</div>
        )}
      </div>
      
      <div className={`text-2xl font-bold mb-2 ${!isValidValue ? 'text-gray-500' : 'text-white'}`}>
        {value || 'N/A'}
      </div>
      
      {showProgress && isValidValue && !isNaN(numValue) && (
        <div className="mb-2">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>{maxValue}</span>
          </div>
        </div>
      )}
      
      {(interpretation || !isValidValue || value === 'Negative Equity') && (
        <div className={`text-sm mt-2 ${getInterpretationColor()}`}>
          {!isValidValue ? 'Data unavailable' : interpretation}
        </div>
      )}
    </div>
  );
};

export const StockHealthMetrics: React.FC<HealthMetricsProps> = ({ symbol }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [industryAvg, setIndustryAvg] = useState<any>(null);

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

        // Calculate current metrics
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
          roic,
          industry: overview.Industry,
          sector: overview.Sector
        });

        // Mock industry averages (in production, fetch from a database or API)
        setIndustryAvg({
          altmanZ: 3.2,
          piotroskiScore: 6,
          currentRatio: 1.8,
          debtToEquity: 0.8,
          roic: 12
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (!value || isNaN(value)) return 'N/A';
    const billions = value / 1000000000;
    if (Math.abs(billions) >= 1) {
      return `$${billions.toFixed(2)}B`;
    }
    const millions = value / 1000000;
    return `$${millions.toFixed(2)}M`;
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Main Metrics Dashboard */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">
            Advanced Financial Health Metrics
          </h3>
          <div className="text-sm text-gray-400">
            Industry: {metrics?.industry || 'N/A'}
          </div>
        </div>

        {/* All Metrics Grid - 8 cards including Piotroski */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Piotroski F-Score Card */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg">
            <div className="text-gray-400 text-sm mb-2">Piotroski F-Score</div>
            <div className="text-2xl font-bold text-white mb-2">
              {metrics?.piotroskiScore?.score || 0}/9
            </div>
            <div className="flex gap-1 mb-2">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded ${
                    i < (metrics?.piotroskiScore?.score || 0)
                      ? 'bg-green-500'
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <div className={`text-sm ${
              (metrics?.piotroskiScore?.score || 0) >= 7 ? 'text-green-400' :
              (metrics?.piotroskiScore?.score || 0) >= 5 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {metrics?.piotroskiScore?.interpretation || 'N/A'}
            </div>
          </div>
          
          <MetricCard
            title="Altman Z-Score"
            value={metrics?.altmanZ?.score || 'N/A'}
            interpretation={metrics?.altmanZ?.interpretation}
            showProgress={true}
            maxValue={6}
          />
          
          <MetricCard
            title="Free Cash Flow"
            value={formatCurrency(metrics?.freeCashFlow)}
            interpretation={metrics?.freeCashFlow > 0 ? 'Positive' : 'Negative'}
          />
          
          <MetricCard
            title="FCF Yield"
            value={metrics?.fcfYield === 'N/A' ? 'N/A' : `${metrics.fcfYield}%`}
            interpretation={parseFloat(metrics?.fcfYield) > 5 ? 'Strong' : 'Moderate'}
          />
          
          <MetricCard
            title="ROIC"
            value={metrics?.roic === 'N/A' ? 'N/A' : `${metrics.roic}%`}
            benchmark="15%"
            showProgress={true}
            maxValue={30}
          />
          
          <MetricCard
            title="Current Ratio"
            value={metrics?.currentRatio || 'N/A'}
            benchmark="2.0"
            showProgress={true}
            maxValue={3}
          />
          
          <MetricCard
            title="Quick Ratio"
            value={metrics?.quickRatio || 'N/A'}
            benchmark="1.0"
            showProgress={true}
            maxValue={2}
          />
          
          <MetricCard
            title="Debt/Equity"
            value={metrics?.debtToEquity || 'N/A'}
            benchmark="< 1.0"
            interpretation={
              metrics?.debtToEquity === 'Negative Equity' ? 'Negative Equity' :
              metrics?.debtToEquity === 'N/A' ? undefined :
              parseFloat(metrics?.debtToEquity) < 1 ? 'Low Leverage' : 'High Leverage'
            }
          />
        </div>
      </div>

      {/* Industry Comparison */}
      {industryAvg && metrics && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            Industry Comparison
          </h3>
          <div className="space-y-4">
            {Object.keys(industryAvg).map(key => {
              const companyValue = 
                key === 'altmanZ' ? (metrics?.altmanZ?.score === 'N/A' ? 0 : parseFloat(metrics?.altmanZ?.score || 0)) :
                key === 'piotroskiScore' ? metrics?.piotroskiScore?.score || 0 :
                key === 'currentRatio' ? (metrics?.currentRatio === 'N/A' ? 0 : parseFloat(metrics?.currentRatio || 0)) :
                key === 'debtToEquity' ? (metrics?.debtToEquity === 'N/A' || metrics?.debtToEquity === 'Negative Equity' ? 0 : parseFloat(metrics?.debtToEquity || 0)) :
                key === 'roic' ? (metrics?.roic === 'N/A' ? 0 : parseFloat(metrics?.roic || 0)) : 0;
              
              const industryValue = industryAvg[key];
              const isValidComparison = companyValue !== 0 && 
                                       metrics?.[key] !== 'N/A' && 
                                       metrics?.[key] !== 'Negative Equity' &&
                                       (key !== 'altmanZ' || metrics?.altmanZ?.score !== 'N/A');
              
              const performance = isValidComparison ? ((companyValue - industryValue) / industryValue * 100).toFixed(1) : 'N/A';
              
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <span className="text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className={`${isValidComparison ? 'text-white' : 'text-gray-500'}`}>
                      {isValidComparison ? companyValue.toFixed(2) : 'N/A'}
                    </span>
                    <span className="text-gray-500">vs</span>
                    <span className="text-gray-400">{industryValue}</span>
                    <span className={`font-semibold ${
                      performance === 'N/A' ? 'text-gray-500' :
                      parseFloat(performance) > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {performance === 'N/A' ? 'N/A' : `${parseFloat(performance) > 0 ? '+' : ''}${performance}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
