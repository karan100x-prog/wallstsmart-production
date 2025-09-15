// StockHealthMetrics.tsx - Complete Self-Contained Version
import React, { useEffect, useState } from 'react';
import { 
  getCompanyOverview,
  fetchIncomeStatement, 
  fetchBalanceSheet,
  fetchCashFlow,
  getGlobalQuote 
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
  tooltip?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface PiotroskilDetail {
  category: string;
  criteria: string;
  passed: boolean;
  value?: string;
}

// Individual Metric Card Component with Progress Bar
const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  maxValue = 10, 
  interpretation, 
  showProgress = false,
  benchmark,
  tooltip,
  trend
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  const progressPercent = maxValue ? (Math.min(numValue / maxValue * 100, 100)) : 0;
  
  const getProgressColor = () => {
    if (title === 'Current Ratio' || title === 'Quick Ratio') {
      if (numValue >= 2) return 'bg-green-500';
      if (numValue >= 1) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    if (title === 'Debt/Equity') {
      if (numValue <= 0.5) return 'bg-green-500';
      if (numValue <= 1) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    if (title === 'ROIC' || title === 'FCF Yield') {
      if (numValue >= 15) return 'bg-green-500';
      if (numValue >= 8) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    return 'bg-blue-500';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg relative">
      {tooltip && (
        <div 
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 cursor-help"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          {showTooltip && (
            <div className="absolute right-0 top-6 w-64 p-2 bg-gray-900 text-xs text-gray-300 rounded shadow-xl z-10 border border-gray-700">
              {tooltip}
            </div>
          )}
        </div>
      )}
      
      <div className="flex justify-between items-start mb-2">
        <div className="text-gray-400 text-sm">{title}</div>
        {benchmark && (
          <div className="text-xs text-gray-500">Target: {benchmark}</div>
        )}
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <div className="text-2xl font-bold text-white">
          {value || 'N/A'}
        </div>
        {trend && (
          <div className={`text-sm ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
          </div>
        )}
      </div>
      
      {showProgress && !isNaN(numValue) && (
        <div className="mb-2">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${progressPercent}%` }}
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
          interpretation.includes('Strong') || interpretation.includes('Safe') || 
          interpretation.includes('Excellent') || interpretation.includes('Positive') || 
          interpretation.includes('Low Leverage')
            ? 'text-green-400' 
            : interpretation.includes('Moderate') || interpretation.includes('Grey') || 
              interpretation.includes('Average')
            ? 'text-yellow-400' 
            : 'text-red-400'
        }`}>
          {interpretation}
        </div>
      )}
    </div>
  );
};

// Enhanced Gauge Component for Altman Z-Score
const GaugeChart: React.FC<{ value: number; title: string; breakdown?: any }> = ({ value, title, breakdown }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  // Normalize value for display (cap at 10 for visual purposes)
  const displayValue = Math.min(value, 10);
  const rotation = Math.min(Math.max((displayValue / 10) * 180, 0), 180);
  
  const getZoneColor = (val: number) => {
    if (val > 3) return '#22c55e'; // Green
    if (val > 1.8) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };
  
  const getZoneText = (val: number) => {
    if (val > 3) return 'Safe Zone';
    if (val > 1.8) return 'Grey Zone';
    return 'Distress Zone';
  };
  
  return (
    <div className="relative w-full">
      <div className="relative w-full h-32">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#374151"
            strokeWidth="15"
          />
          {/* Red zone (0-1.8) */}
          <path
            d="M 20 100 A 80 80 0 0 1 52 50"
            fill="none"
            stroke="#ef4444"
            strokeWidth="15"
          />
          {/* Yellow zone (1.8-3.0) */}
          <path
            d="M 52 50 A 80 80 0 0 1 74 35"
            fill="none"
            stroke="#eab308"
            strokeWidth="15"
          />
          {/* Green zone (3.0+) */}
          <path
            d="M 74 35 A 80 80 0 0 1 180 100"
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
          {/* Zone labels */}
          <text x="30" y="115" fill="#9ca3af" fontSize="10">0</text>
          <text x="50" y="45" fill="#9ca3af" fontSize="10">1.8</text>
          <text x="72" y="30" fill="#9ca3af" fontSize="10">3.0</text>
          <text x="165" y="115" fill="#9ca3af" fontSize="10">10</text>
        </svg>
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <div className="text-3xl font-bold" style={{ color: getZoneColor(value) }}>
            {value.toFixed(2)}
          </div>
          <div className="text-xs text-gray-400">{title}</div>
          <div className="text-xs mt-1" style={{ color: getZoneColor(value) }}>
            {getZoneText(value)}
          </div>
        </div>
      </div>
      
      {breakdown && (
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showBreakdown ? 'Hide' : 'Show'} Calculation Details
        </button>
      )}
      
      {showBreakdown && breakdown && (
        <div className="mt-3 p-3 bg-gray-900 rounded text-xs space-y-1">
          <div className="text-gray-400 mb-2">Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E</div>
          <div className="space-y-1 text-gray-300">
            <div>A (Working Capital/Assets): {breakdown.A?.toFixed(3) || 'N/A'}</div>
            <div>B (Retained Earnings/Assets): {breakdown.B?.toFixed(3) || 'N/A'}</div>
            <div>C (EBIT/Assets): {breakdown.C?.toFixed(3) || 'N/A'}</div>
            <div>D (Market Value/Liabilities): {breakdown.D?.toFixed(3) || 'N/A'}</div>
            <div>E (Sales/Assets): {breakdown.E?.toFixed(3) || 'N/A'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Piotroski Score Display with Breakdown
const PiotroskilScore: React.FC<{ score: number; details: PiotroskilDetail[] }> = ({ score, details }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const categories = {
    Profitability: details.filter(d => d.category === 'Profitability'),
    Leverage: details.filter(d => d.category === 'Leverage'),
    Efficiency: details.filter(d => d.category === 'Efficiency')
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="text-center">
        <div className="text-6xl font-bold text-white mb-2">
          {score}/9
        </div>
        <div className="text-sm text-gray-400 mb-3">Piotroski F-Score</div>
        
        {/* Visual indicator bars */}
        <div className="flex justify-center gap-1 mb-3">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className={`w-8 h-2 rounded transition-all duration-300 ${
                i < score
                  ? 'bg-green-500 shadow-lg shadow-green-500/30'
                  : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
        
        <div className={`text-sm mb-3 ${
          score >= 8 ? 'text-green-400' : 
          score >= 6 ? 'text-yellow-400' : 
          'text-red-400'
        }`}>
          {score >= 8 ? 'Excellent Fundamentals' : 
           score >= 6 ? 'Good Fundamentals' : 
           score >= 4 ? 'Average Fundamentals' : 
           'Weak Fundamentals'}
        </div>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showDetails ? 'Hide' : 'Show'} Scoring Details
        </button>
      </div>
      
      {showDetails && (
        <div className="mt-4 space-y-3 text-xs">
          {Object.entries(categories).map(([category, items]) => (
            <div key={category} className="bg-gray-900 rounded p-2">
              <div className="font-semibold text-gray-300 mb-2">
                {category} ({items.filter(i => i.passed).length}/{items.length})
              </div>
              <div className="space-y-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-gray-400">{item.criteria}</span>
                    <span className={item.passed ? 'text-green-400' : 'text-red-400'}>
                      {item.passed ? '✓' : '✗'} {item.value && `(${item.value})`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const StockHealthMetrics: React.FC<HealthMetricsProps> = ({ symbol }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [industryAvg, setIndustryAvg] = useState<any>(null);
  const [piotroskilDetails, setPiotroskilDetails] = useState<PiotroskilDetail[]>([]);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        
        const [overview, income, balance, cashFlow, quote] = await Promise.all([
          getCompanyOverview(symbol),
          fetchIncomeStatement(symbol),
          fetchBalanceSheet(symbol),
          fetchCashFlow(symbol),
          getGlobalQuote(symbol)
        ]);

        // Calculate all metrics inline
        const latestBalance = balance.annualReports?.[0] || {};
        const latestIncome = income.annualReports?.[0] || {};
        const latestCashFlow = cashFlow.annualReports?.[0] || {};
        
        // Calculate Altman Z-Score components
        const totalAssets = parseFloat(latestBalance.totalAssets) || 1;
        const totalLiabilities = parseFloat(latestBalance.totalLiabilities) || 1;
        const currentAssets = parseFloat(latestBalance.totalCurrentAssets) || 0;
        const currentLiabilities = parseFloat(latestBalance.totalCurrentLiabilities) || 0;
        const retainedEarnings = parseFloat(latestBalance.retainedEarnings) || 0;
        const ebit = parseFloat(latestIncome.ebit) || parseFloat(latestIncome.operatingIncome) || 0;
        const revenue = parseFloat(latestIncome.totalRevenue) || 0;
        const marketCap = parseFloat(overview.MarketCapitalization) || 0;
        
        const altmanComponents = {
          A: (currentAssets - currentLiabilities) / totalAssets,
          B: retainedEarnings / totalAssets,
          C: ebit / totalAssets,
          D: marketCap / totalLiabilities,
          E: revenue / totalAssets
        };
        
        const altmanZScore = 
          1.2 * altmanComponents.A + 
          1.4 * altmanComponents.B + 
          3.3 * altmanComponents.C + 
          0.6 * altmanComponents.D + 
          1.0 * altmanComponents.E;
        
        // Calculate Free Cash Flow
        const operatingCashFlow = parseFloat(latestCashFlow.operatingCashflow) || 0;
        const capitalExpenditure = parseFloat(latestCashFlow.capitalExpenditures) || 0;
        const freeCashFlow = operatingCashFlow - Math.abs(capitalExpenditure);
        
        // Calculate FCF Yield
        const fcfYield = marketCap > 0 ? (freeCashFlow / marketCap) * 100 : 0;
        
        // Calculate Current Ratio
        const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
        
        // Calculate Quick Ratio
        const inventory = parseFloat(latestBalance.inventory) || 0;
        const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;
        
        // Calculate Debt to Equity
        const totalDebt = parseFloat(latestBalance.totalDebt) || 
                         (parseFloat(latestBalance.shortTermDebt) || 0) + (parseFloat(latestBalance.longTermDebt) || 0);
        const totalEquity = parseFloat(latestBalance.totalShareholderEquity) || 1;
        const debtToEquity = totalEquity > 0 ? totalDebt / totalEquity : 0;
        
        // Calculate ROIC
        const netIncome = parseFloat(latestIncome.netIncome) || 0;
        const investedCapital = totalAssets - currentLiabilities;
        const roic = investedCapital > 0 ? (netIncome / investedCapital) * 100 : 0;
        
        // Calculate Piotroski Score with details
        const piotroskilResult = calculatePiotroskilWithDetails(income, balance, cashFlow);

        setMetrics({
          altmanZ: { score: altmanZScore, components: altmanComponents },
          freeCashFlow,
          fcfYield: fcfYield.toFixed(2),
          currentRatio: currentRatio.toFixed(2),
          quickRatio: quickRatio.toFixed(2),
          debtToEquity: debtToEquity.toFixed(2),
          piotroskiScore: piotroskilResult.score,
          roic: roic.toFixed(2),
          industry: overview.Industry,
          sector: overview.Sector,
          marketCap: overview.MarketCapitalization
        });
        
        setPiotroskilDetails(piotroskilResult.details);

        // Mock industry averages (in production, fetch from database)
        setIndustryAvg({
          altmanZ: 3.2,
          piotroskiScore: 6,
          currentRatio: 1.8,
          quickRatio: 1.2,
          debtToEquity: 0.8,
          roic: 12,
          fcfYield: 5
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

  // Helper function for detailed Piotroski calculation
  const calculatePiotroskilWithDetails = (income: any, balance: any, cashFlow: any) => {
    const details: PiotroskilDetail[] = [];
    let score = 0;
    
    try {
      const currentIncome = income.annualReports?.[0] || {};
      const previousIncome = income.annualReports?.[1] || {};
      const currentBalance = balance.annualReports?.[0] || {};
      const previousBalance = balance.annualReports?.[1] || {};
      const currentCashFlow = cashFlow.annualReports?.[0] || {};
      
      // Profitability checks
      const netIncome = parseFloat(currentIncome.netIncome) || 0;
      if (netIncome > 0) {
        score++;
        details.push({ category: 'Profitability', criteria: 'Positive Net Income', passed: true, value: `$${(netIncome/1e9).toFixed(2)}B` });
      } else {
        details.push({ category: 'Profitability', criteria: 'Positive Net Income', passed: false });
      }
      
      const totalAssets = parseFloat(currentBalance.totalAssets) || 1;
      const prevTotalAssets = parseFloat(previousBalance.totalAssets) || 1;
      const roa = netIncome / totalAssets;
      if (roa > 0) {
        score++;
        details.push({ category: 'Profitability', criteria: 'Positive ROA', passed: true, value: `${(roa * 100).toFixed(2)}%` });
      } else {
        details.push({ category: 'Profitability', criteria: 'Positive ROA', passed: false });
      }
      
      const operatingCashFlow = parseFloat(currentCashFlow.operatingCashflow) || 0;
      if (operatingCashFlow > 0) {
        score++;
        details.push({ category: 'Profitability', criteria: 'Positive Operating Cash Flow', passed: true, value: `$${(operatingCashFlow/1e9).toFixed(2)}B` });
      } else {
        details.push({ category: 'Profitability', criteria: 'Positive Operating Cash Flow', passed: false });
      }
      
      if (operatingCashFlow > netIncome) {
        score++;
        details.push({ category: 'Profitability', criteria: 'Quality of Earnings (OCF > NI)', passed: true });
      } else {
        details.push({ category: 'Profitability', criteria: 'Quality of Earnings (OCF > NI)', passed: false });
      }
      
      // Leverage checks
      const longTermDebt = parseFloat(currentBalance.longTermDebt) || 0;
      const prevLongTermDebt = parseFloat(previousBalance.longTermDebt) || 0;
      if (longTermDebt <= prevLongTermDebt) {
        score++;
        details.push({ category: 'Leverage', criteria: 'Decreasing Long-term Debt', passed: true });
      } else {
        details.push({ category: 'Leverage', criteria: 'Decreasing Long-term Debt', passed: false });
      }
      
      const currentRatio = (parseFloat(currentBalance.totalCurrentAssets) || 0) / (parseFloat(currentBalance.totalCurrentLiabilities) || 1);
      const prevCurrentRatio = (parseFloat(previousBalance.totalCurrentAssets) || 0) / (parseFloat(previousBalance.totalCurrentLiabilities) || 1);
      if (currentRatio > prevCurrentRatio) {
        score++;
        details.push({ category: 'Leverage', criteria: 'Improving Current Ratio', passed: true, value: `${currentRatio.toFixed(2)}` });
      } else {
        details.push({ category: 'Leverage', criteria: 'Improving Current Ratio', passed: false });
      }
      
      const shares = parseFloat(currentBalance.commonStockSharesOutstanding) || 0;
      const prevShares = parseFloat(previousBalance.commonStockSharesOutstanding) || 0;
      if (shares <= prevShares) {
        score++;
        details.push({ category: 'Leverage', criteria: 'No Share Dilution', passed: true });
      } else {
        details.push({ category: 'Leverage', criteria: 'No Share Dilution', passed: false });
      }
      
      // Efficiency checks
      const grossMargin = (parseFloat(currentIncome.grossProfit) || 0) / (parseFloat(currentIncome.totalRevenue) || 1);
      const prevGrossMargin = (parseFloat(previousIncome.grossProfit) || 0) / (parseFloat(previousIncome.totalRevenue) || 1);
      if (grossMargin > prevGrossMargin) {
        score++;
        details.push({ category: 'Efficiency', criteria: 'Improving Gross Margin', passed: true, value: `${(grossMargin * 100).toFixed(2)}%` });
      } else {
        details.push({ category: 'Efficiency', criteria: 'Improving Gross Margin', passed: false });
      }
      
      const assetTurnover = (parseFloat(currentIncome.totalRevenue) || 0) / totalAssets;
      const prevAssetTurnover = (parseFloat(previousIncome.totalRevenue) || 0) / prevTotalAssets;
      if (assetTurnover > prevAssetTurnover) {
        score++;
        details.push({ category: 'Efficiency', criteria: 'Improving Asset Turnover', passed: true, value: `${assetTurnover.toFixed(2)}x` });
      } else {
        details.push({ category: 'Efficiency', criteria: 'Improving Asset Turnover', passed: false });
      }
      
    } catch (error) {
      console.error('Error calculating Piotroski details:', error);
    }
    
    return { score, details };
  };

  const formatCurrency = (value: number) => {
    if (!value || isNaN(value)) return 'N/A';
    const billions = value / 1000000000;
    if (Math.abs(billions) >= 1) {
      return `$${billions.toFixed(2)}B`;
    }
    const millions = value / 1000000;
    return `$${millions.toFixed(2)}M`;
  };

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
          <GaugeChart 
            value={parseFloat(metrics?.altmanZ?.score || 0)} 
            title="Altman Z-Score"
            breakdown={metrics?.altmanZ?.components}
          />
          
          <PiotroskilScore 
            score={metrics?.piotroskiScore || 0}
            details={piotroskilDetails}
          />
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <MetricCard
            title="Free Cash Flow"
            value={formatCurrency(metrics?.freeCashFlow)}
            interpretation={metrics?.freeCashFlow > 0 ? 'Positive' : 'Negative'}
            tooltip="Cash generated after capital expenditures. Positive FCF indicates the company can fund operations and growth."
          />
          
          <MetricCard
            title="FCF Yield"
            value={metrics?.fcfYield ? `${parseFloat(metrics.fcfYield).toFixed(2)}%` : 'N/A'}
            interpretation={parseFloat(metrics?.fcfYield) > 5 ? 'Strong' : parseFloat(metrics?.fcfYield) > 3 ? 'Moderate' : 'Weak'}
            tooltip="Free Cash Flow / Market Cap. Higher yields suggest better value."
            benchmark="5%+"
          />
          
          <MetricCard
            title="ROIC"
            value={metrics?.roic ? `${parseFloat(metrics.roic).toFixed(2)}%` : 'N/A'}
            benchmark="15%"
            showProgress={true}
            maxValue={30}
            tooltip="Return on Invested Capital. Measures how efficiently a company uses investor capital."
            interpretation={parseFloat(metrics?.roic) > 15 ? 'Excellent' : parseFloat(metrics?.roic) > 10 ? 'Good' : 'Poor'}
          />
          
          <MetricCard
            title="Current Ratio"
            value={parseFloat(metrics?.currentRatio).toFixed(2) || 'N/A'}
            benchmark="2.0"
            showProgress={true}
            maxValue={3}
            tooltip="Current Assets / Current Liabilities. Measures ability to pay short-term obligations."
            interpretation={parseFloat(metrics?.currentRatio) > 2 ? 'Strong' : parseFloat(metrics?.currentRatio) > 1 ? 'Adequate' : 'Weak'}
          />
          
          <MetricCard
            title="Quick Ratio"
            value={parseFloat(metrics?.quickRatio).toFixed(2) || 'N/A'}
            benchmark="1.0"
            showProgress={true}
            maxValue={2}
            tooltip="(Current Assets - Inventory) / Current Liabilities. More conservative liquidity measure."
            interpretation={parseFloat(metrics?.quickRatio) > 1 ? 'Strong' : parseFloat(metrics?.quickRatio) > 0.5 ? 'Adequate' : 'Weak'}
          />
          
          <MetricCard
            title="Debt/Equity"
            value={parseFloat(metrics?.debtToEquity).toFixed(2) || 'N/A'}
            benchmark="< 1.0"
            tooltip="Total Debt / Total Equity. Lower ratios indicate less financial risk."
            interpretation={parseFloat(metrics?.debtToEquity) < 0.5 ? 'Low Leverage' : parseFloat(metrics?.debtToEquity) < 1 ? 'Moderate' : 'High Leverage'}
          />
        </div>
      </div>

      {/* Industry Comparison */}
      {industryAvg && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            Industry Comparison
          </h3>
          <div className="space-y-3">
            {Object.entries(industryAvg).map(([key, industryValue]) => {
              const companyValue = 
                key === 'altmanZ' ? parseFloat(metrics?.altmanZ?.score || 0) :
                key === 'piotroskiScore' ? metrics?.piotroskiScore || 0 :
                key === 'currentRatio' ? parseFloat(metrics?.currentRatio || 0) :
                key === 'quickRatio' ? parseFloat(metrics?.quickRatio || 0) :
                key === 'debtToEquity' ? parseFloat(metrics?.debtToEquity || 0) :
                key === 'roic' ? parseFloat(metrics?.roic || 0) :
                key === 'fcfYield' ? parseFloat(metrics?.fcfYield || 0) : 0;
              
              const performance = ((companyValue - industryValue) / industryValue * 100).toFixed(1);
              const isPositive = parseFloat(performance) > 0;
              
              // For debt/equity, lower is better
              const isGood = key === 'debtToEquity' ? !isPositive : isPositive;
              
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-800 rounded hover:bg-gray-750 transition-colors">
                  <span className="text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-white font-semibold">{companyValue.toFixed(2)}</span>
                    <span className="text-gray-500">vs</span>
                    <span className="text-gray-400">{industryValue}</span>
                    <span className={`font-semibold min-w-[60px] text-right ${
                      isGood ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {isPositive ? '+' : ''}{performance}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 p-3 bg-gray-800 rounded">
            <div className="text-sm text-gray-400">
              Overall Performance Score
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {(() => {
                let betterCount = 0;
                Object.entries(industryAvg).forEach(([key, industryValue]) => {
                  const companyValue = 
                    key === 'altmanZ' ? parseFloat(metrics?.altmanZ?.score || 0) :
                    key === 'piotroskiScore' ? metrics?.piotroskiScore || 0 :
                    key === 'currentRatio' ? parseFloat(metrics?.currentRatio || 0) :
                    key === 'quickRatio' ? parseFloat(metrics?.quickRatio || 0) :
                    key === 'debtToEquity' ? parseFloat(metrics?.debtToEquity || 0) :
                    key === 'roic' ? parseFloat(metrics?.roic || 0) :
                    key === 'fcfYield' ? parseFloat(metrics?.fcfYield || 0) : 0;
                  
                  if (key === 'debtToEquity' ? companyValue < industryValue : companyValue > industryValue) {
                    betterCount++;
                  }
                });
                const percentage = (betterCount / Object.keys(industryAvg).length * 100).toFixed(0);
                return (
                  <>
                    <span className={betterCount > Object.keys(industryAvg).length / 2 ? 'text-green-400' : 'text-yellow-400'}>
                      {percentage}%
                    </span>
                    <span className="text-sm text-gray-400 ml-2">
                      Better than industry average ({betterCount}/{Object.keys(industryAvg).length} metrics)
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
