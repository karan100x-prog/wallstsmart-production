// StockHealthMetrics.tsx - Fixed Version
import React, { useEffect, useState } from 'react';
import metricsCalculator from '../services/metricsCalculator';
import RevenueAnalysis from './RevenueAnalysis';
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

// Individual Metric Card Component with Progress Bar
const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  maxValue = 10, 
  interpretation, 
  showProgress = false,
  benchmark
}) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const progressPercent = maxValue ? (numValue / maxValue) * 100 : 0;
  
  const getProgressColor = () => {
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
    return 'bg-blue-500';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <div className="text-gray-400 text-sm">{title}</div>
        {benchmark && (
          <div className="text-xs text-gray-500">Target: {benchmark}</div>
        )}
      </div>
      
      <div className="text-2xl font-bold text-white mb-2">
        {value || 'N/A'}
      </div>
      
      {showProgress && !isNaN(numValue) && (
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
      
      {interpretation && (
        <div className={`text-sm mt-2 ${
          interpretation.includes('Strong') || interpretation.includes('Safe') || interpretation.includes('Excellent') 
            ? 'text-green-400' 
            : interpretation.includes('Moderate') || interpretation.includes('Grey') 
            ? 'text-yellow-400' 
            : 'text-red-400'
        }`}>
          {interpretation}
        </div>
      )}
    </div>
  );
};

// Gauge Component for Altman Z-Score
const GaugeChart: React.FC<{ value: number; title: string }> = ({ value, title }) => {
  const rotation = Math.min(Math.max((value / 6) * 180, 0), 180); // Map 0-6 to 0-180 degrees
  
  return (
    <div className="relative w-full h-32">
      <svg viewBox="0 0 200 120" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#374151"
          strokeWidth="15"
        />
        {/* Red zone */}
        <path
          d="M 20 100 A 80 80 0 0 1 80 40"
          fill="none"
          stroke="#ef4444"
          strokeWidth="15"
        />
        {/* Yellow zone */}
        <path
          d="M 80 40 A 80 80 0 0 1 120 40"
          fill="none"
          stroke="#eab308"
          strokeWidth="15"
        />
        {/* Green zone */}
        <path
          d="M 120 40 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#22c55e"
          strokeWidth="15"
        />
        {/* Needle */}
        <g transform={`rotate(${rotation} 100 100)`}>
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="30"
            stroke="white"
            strokeWidth="3"
          />
          <circle cx="100" cy="100" r="5" fill="white" />
        </g>
      </svg>
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <div className="text-2xl font-bold">{value.toFixed(2)}</div>
        <div className="text-xs text-gray-400">{title}</div>
      </div>
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
    if (!value) return 'N/A';
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

        {/* Key Gauges Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <GaugeChart 
              value={parseFloat(metrics?.altmanZ?.score || 0)} 
              title="Altman Z-Score"
            />
            <div className="text-center mt-2 text-sm text-gray-400">
              Bankruptcy Risk Assessment
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-center">
              <div className="text-6xl font-bold text-white mb-2">
                {metrics?.piotroskiScore?.score || 0}/9
              </div>
              <div className="text-sm text-gray-400 mb-3">Piotroski F-Score</div>
              <div className="flex justify-center gap-1">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-2 rounded ${
                      i < (metrics?.piotroskiScore?.score || 0)
                        ? 'bg-green-500'
                        : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm text-gray-400 mt-2">
                Fundamental Strength
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <MetricCard
            title="Free Cash Flow"
            value={formatCurrency(metrics?.freeCashFlow)}
            interpretation={metrics?.freeCashFlow > 0 ? 'Positive' : 'Negative'}
          />
          
          <MetricCard
            title="FCF Yield"
            value={metrics?.fcfYield ? `${metrics.fcfYield}%` : 'N/A'}
            interpretation={parseFloat(metrics?.fcfYield) > 5 ? 'Strong' : 'Moderate'}
          />
          
          <MetricCard
            title="ROIC"
            value={metrics?.roic ? `${metrics.roic}%` : 'N/A'}
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
            interpretation={parseFloat(metrics?.debtToEquity) < 1 ? 'Low Leverage' : 'High Leverage'}
          />
        </div>
      </div>

      {/* Industry Comparison */}
      {industryAvg && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            Industry Comparison
          </h3>
          <div className="space-y-4">
            {Object.keys(industryAvg).map(key => {
              const companyValue = 
                key === 'altmanZ' ? parseFloat(metrics?.altmanZ?.score || 0) :
                key === 'piotroskiScore' ? metrics?.piotroskiScore?.score || 0 :
                key === 'currentRatio' ? parseFloat(metrics?.currentRatio || 0) :
                key === 'debtToEquity' ? parseFloat(metrics?.debtToEquity || 0) :
                key === 'roic' ? parseFloat(metrics?.roic || 0) : 0;
              
              const industryValue = industryAvg[key];
              const performance = ((companyValue - industryValue) / industryValue * 100).toFixed(1);
              
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <span className="text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-white">{companyValue.toFixed(2)}</span>
                    <span className="text-gray-500">vs</span>
                    <span className="text-gray-400">{industryValue}</span>
                    <span className={`font-semibold ${
                      parseFloat(performance) > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {parseFloat(performance) > 0 ? '+' : ''}{performance}%
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
