// StockHealthMetrics.tsx - Updated with Improved Gauge
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

// Improved Gauge Component with better N/A handling and extended scale
const ImprovedGaugeChart: React.FC<{ value: number | string; title: string }> = ({ value, title }) => {
  // Handle N/A or invalid values
  const isValidValue = typeof value === 'number' && !isNaN(value);
  const numericValue = isValidValue ? value : 0;
  
  // Extended scale: -4 to 8 to accommodate most real-world scores
  const minValue = -4;
  const maxValue = 8;
  const range = maxValue - minValue;
  
  // Calculate needle rotation (0-180 degrees)
  const clampedValue = Math.max(minValue, Math.min(maxValue, numericValue));
  const rotation = ((clampedValue - minValue) / range) * 180;
  
  // Determine color zones (as percentages of the 180-degree arc)
  const distressEnd = ((1.8 - minValue) / range) * 180;
  const greyEnd = ((3.0 - minValue) / range) * 180;
  
  // Format display value
  const displayValue = isValidValue ? numericValue.toFixed(2) : 'N/A';
  
  // Get interpretation based on score
  const getInterpretation = () => {
    if (!isValidValue) return 'Data Unavailable';
    if (numericValue < 0) return 'Severe Distress';
    if (numericValue < 1.8) return 'Distress Zone';
    if (numericValue < 3.0) return 'Grey Zone';
    return 'Safe Zone';
  };
  
  const interpretation = getInterpretation();
  
  // Color for the score text based on zone
  const getScoreColor = () => {
    if (!isValidValue) return '#6b7280'; // gray
    if (numericValue < 1.8) return '#ef4444'; // red
    if (numericValue < 3.0) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  return (
    <div className="relative w-full h-40">
      <svg viewBox="0 0 200 120" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#374151"
          strokeWidth="12"
        />
        
        {/* Red zone (Distress: -4 to 1.8) */}
        <path
          d="M 20 100 A 80 80 0 0 1 73 35"
          fill="none"
          stroke="#ef4444"
          strokeWidth="12"
          opacity={isValidValue ? 1 : 0.3}
        />
        
        {/* Yellow zone (Grey: 1.8 to 3.0) */}
        <path
          d="M 73 35 A 80 80 0 0 1 127 35"
          fill="none"
          stroke="#eab308"
          strokeWidth="12"
          opacity={isValidValue ? 1 : 0.3}
        />
        
        {/* Green zone (Safe: 3.0 to 8) */}
        <path
          d="M 127 35 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#22c55e"
          strokeWidth="12"
          opacity={isValidValue ? 1 : 0.3}
        />
        
        {/* Scale labels */}
        <text x="20" y="115" fill="#9ca3af" fontSize="10" textAnchor="middle">
          {minValue}
        </text>
        <text x="73" y="30" fill="#9ca3af" fontSize="10" textAnchor="middle">
          1.8
        </text>
        <text x="127" y="30" fill="#9ca3af" fontSize="10" textAnchor="middle">
          3.0
        </text>
        <text x="180" y="115" fill="#9ca3af" fontSize="10" textAnchor="middle">
          {maxValue}
        </text>
        
        {/* Needle - only show if value is valid */}
        {isValidValue && (
          <g transform={`rotate(${rotation} 100 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="35"
              stroke="white"
              strokeWidth="3"
            />
            <circle cx="100" cy="100" r="6" fill="white" />
          </g>
        )}
        
        {/* "No Data" indicator for N/A values */}
        {!isValidValue && (
          <text x="100" y="70" fill="#6b7280" fontSize="14" textAnchor="middle" fontWeight="bold">
            No Data Available
          </text>
        )}
      </svg>
      
      {/* Score display */}
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <div className={`text-3xl font-bold`} style={{ color: getScoreColor() }}>
          {displayValue}
        </div>
        <div className="text-xs text-gray-400">{title}</div>
        <div className={`text-sm mt-1`} style={{ color: getScoreColor() }}>
          {interpretation}
        </div>
      </div>
      
      {/* Out of range indicator */}
      {isValidValue && (numericValue < minValue || numericValue > maxValue) && (
        <div className="absolute top-0 right-0 bg-yellow-600 text-xs text-white px-2 py-1 rounded">
          {numericValue < minValue ? '↓ Below Range' : '↑ Above Range'}
        </div>
      )}
    </div>
  );
};

// Improved Metric Card Component
const ImprovedMetricCard: React.FC<{
  title: string;
  value: string | number;
  maxValue?: number;
  interpretation?: string;
  showProgress?: boolean;
  benchmark?: string;
}> = ({ 
  title, 
  value, 
  maxValue = 10, 
  interpretation, 
  showProgress = false,
  benchmark
}) => {
  // Check if value is valid
  const isValidValue = value !== 'N/A' && value !== 'Negative Equity' && 
                      value !== null && value !== undefined && 
                      (typeof value === 'number' || !isNaN(parseFloat(String(value))));
  
  const numValue = isValidValue ? (typeof value === 'string' ? parseFloat(value) : value) : 0;
  const progressPercent = isValidValue && maxValue ? (Math.abs(numValue) / maxValue) * 100 : 0;
  
  const getProgressColor = () => {
    if (!isValidValue) return 'bg-gray-600';
    
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
    
    if (interpretation.includes('Strong') || interpretation.includes('Positive') || 
        interpretation.includes('Low Leverage') || interpretation.includes('Safe')) {
      return 'text-green-400';
    }
    if (interpretation.includes('Moderate') || interpretation.includes('Grey')) {
      return 'text-yellow-400';
    }
    if (interpretation.includes('Negative') || interpretation.includes('Weak') || 
        interpretation.includes('High Leverage') || interpretation.includes('Distress')) {
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

  // Parse the Altman Z-Score value for the gauge
  const altmanZValue = metrics?.altmanZ?.score === 'N/A' ? 'N/A' : parseFloat(metrics?.altmanZ?.score || 0);

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
            <ImprovedGaugeChart 
              value={altmanZValue}
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
          <ImprovedMetricCard
            title="Free Cash Flow"
            value={formatCurrency(metrics?.freeCashFlow)}
            interpretation={metrics?.freeCashFlow > 0 ? 'Positive' : 'Negative'}
          />
          
          <ImprovedMetricCard
            title="FCF Yield"
            value={metrics?.fcfYield === 'N/A' ? 'N/A' : `${metrics.fcfYield}%`}
            interpretation={parseFloat(metrics?.fcfYield) > 5 ? 'Strong' : 'Moderate'}
          />
          
          <ImprovedMetricCard
            title="ROIC"
            value={metrics?.roic === 'N/A' ? 'N/A' : `${metrics.roic}%`}
            benchmark="15%"
            showProgress={true}
            maxValue={30}
          />
          
          <ImprovedMetricCard
            title="Current Ratio"
            value={metrics?.currentRatio || 'N/A'}
            benchmark="2.0"
            showProgress={true}
            maxValue={3}
          />
          
          <ImprovedMetricCard
            title="Quick Ratio"
            value={metrics?.quickRatio || 'N/A'}
            benchmark="1.0"
            showProgress={true}
            maxValue={2}
          />
          
          <ImprovedMetricCard
            title="Debt/Equity"
            value={metrics?.debtToEquity || 'N/A'}
            benchmark="< 1.0"
            interpretation={
              metrics?.debtToEquity === 'Negative Equity' ? 'Negative Equity' :
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
              const isValidComparison = companyValue !== 0 && metrics?.[key] !== 'N/A' && metrics?.[key] !== 'Negative Equity';
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
