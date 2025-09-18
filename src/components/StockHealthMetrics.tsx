import React, { useEffect, useState } from 'react';
import { Activity, TrendingUp, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// Enhanced Metrics Calculator Service
class MetricsCalculatorService {
  calculateAltmanZScore(overview, income, balance) {
    try {
      // Get the most recent data
      const latestBalance = balance?.annualReports?.[0] || {};
      const latestIncome = income?.annualReports?.[0] || {};
      
      // Extract required values with proper parsing
      const totalAssets = parseFloat(latestBalance.totalAssets) || 0;
      const totalLiabilities = parseFloat(latestBalance.totalLiabilities) || 0;
      const currentAssets = parseFloat(latestBalance.totalCurrentAssets) || 0;
      const currentLiabilities = parseFloat(latestBalance.totalCurrentLiabilities) || 0;
      const retainedEarnings = parseFloat(latestBalance.retainedEarnings) || 0;
      const ebit = parseFloat(latestIncome.ebit) || parseFloat(latestIncome.operatingIncome) || 0;
      const revenue = parseFloat(latestIncome.totalRevenue) || 0;
      const marketCap = parseFloat(overview?.MarketCapitalization) || 0;
      
      // Avoid division by zero
      if (totalAssets === 0) {
        return { score: 0, interpretation: 'Insufficient Data', components: {} };
      }
      
      // Calculate Z-Score components
      const A = (currentAssets - currentLiabilities) / totalAssets; // Working Capital / Total Assets
      const B = retainedEarnings / totalAssets; // Retained Earnings / Total Assets
      const C = ebit / totalAssets; // EBIT / Total Assets
      const D = totalLiabilities > 0 ? marketCap / totalLiabilities : 0; // Market Value / Total Liabilities
      const E = revenue / totalAssets; // Sales / Total Assets
      
      // Calculate Z-Score using proper weights
      const zScore = (1.2 * A) + (1.4 * B) + (3.3 * C) + (0.6 * D) + (1.0 * E);
      
      // Determine interpretation
      let interpretation = '';
      if (zScore > 2.99) {
        interpretation = 'Safe Zone - Low Risk';
      } else if (zScore > 1.80) {
        interpretation = 'Grey Zone - Moderate Risk';
      } else {
        interpretation = 'Distress Zone - High Risk';
      }
      
      return {
        score: zScore.toFixed(2),
        interpretation,
        components: {
          A: A.toFixed(3),
          B: B.toFixed(3),
          C: C.toFixed(3),
          D: D.toFixed(3),
          E: E.toFixed(3)
        }
      };
    } catch (error) {
      console.error('Error calculating Altman Z-Score:', error);
      return { score: 0, interpretation: 'Calculation Error', components: {} };
    }
  }

  calculatePiotroskiScore(income, balance, cashFlow) {
    let score = 0;
    const criteria = [];
    
    try {
      const currentIncome = income?.annualReports?.[0] || {};
      const currentBalance = balance?.annualReports?.[0] || {};
      const prevBalance = balance?.annualReports?.[1] || {};
      const currentCashFlow = cashFlow?.annualReports?.[0] || {};
      
      // Profitability Criteria (4 points)
      // 1. Positive Net Income
      const netIncome = parseFloat(currentIncome.netIncome) || 0;
      if (netIncome > 0) {
        score++;
        criteria.push({ name: 'Positive Net Income', passed: true });
      } else {
        criteria.push({ name: 'Positive Net Income', passed: false });
      }
      
      // 2. Positive Operating Cash Flow
      const operatingCashFlow = parseFloat(currentCashFlow.operatingCashflow) || 0;
      if (operatingCashFlow > 0) {
        score++;
        criteria.push({ name: 'Positive Operating Cash Flow', passed: true });
      } else {
        criteria.push({ name: 'Positive Operating Cash Flow', passed: false });
      }
      
      // 3. Increasing ROA
      const currentROA = netIncome / (parseFloat(currentBalance.totalAssets) || 1);
      const prevNetIncome = parseFloat(income?.annualReports?.[1]?.netIncome) || 0;
      const prevROA = prevNetIncome / (parseFloat(prevBalance.totalAssets) || 1);
      if (currentROA > prevROA) {
        score++;
        criteria.push({ name: 'Improving ROA', passed: true });
      } else {
        criteria.push({ name: 'Improving ROA', passed: false });
      }
      
      // 4. Quality of Earnings (Operating Cash Flow > Net Income)
      if (operatingCashFlow > netIncome) {
        score++;
        criteria.push({ name: 'Quality Earnings', passed: true });
      } else {
        criteria.push({ name: 'Quality Earnings', passed: false });
      }
      
      // Leverage, Liquidity, and Source of Funds (3 points)
      // 5. Decreased Long-term Debt
      const currentDebt = parseFloat(currentBalance.longTermDebt) || 0;
      const prevDebt = parseFloat(prevBalance.longTermDebt) || 0;
      if (currentDebt <= prevDebt) {
        score++;
        criteria.push({ name: 'Decreasing Debt', passed: true });
      } else {
        criteria.push({ name: 'Decreasing Debt', passed: false });
      }
      
      // 6. Increased Current Ratio
      const currentRatio = (parseFloat(currentBalance.totalCurrentAssets) || 0) / 
                          (parseFloat(currentBalance.totalCurrentLiabilities) || 1);
      const prevRatio = (parseFloat(prevBalance.totalCurrentAssets) || 0) / 
                        (parseFloat(prevBalance.totalCurrentLiabilities) || 1);
      if (currentRatio > prevRatio) {
        score++;
        criteria.push({ name: 'Improving Liquidity', passed: true });
      } else {
        criteria.push({ name: 'Improving Liquidity', passed: false });
      }
      
      // 7. No New Shares Issued
      const currentShares = parseFloat(currentBalance.commonStockSharesOutstanding) || 0;
      const prevShares = parseFloat(prevBalance.commonStockSharesOutstanding) || 0;
      if (currentShares <= prevShares * 1.05) { // Allow 5% tolerance
        score++;
        criteria.push({ name: 'No Dilution', passed: true });
      } else {
        criteria.push({ name: 'No Dilution', passed: false });
      }
      
      // Operating Efficiency (2 points)
      // 8. Increased Gross Margin
      const currentGrossMargin = parseFloat(currentIncome.grossProfitRatio) || 
                                 (parseFloat(currentIncome.grossProfit) / parseFloat(currentIncome.totalRevenue));
      const prevGrossMargin = parseFloat(income?.annualReports?.[1]?.grossProfitRatio) || 
                             (parseFloat(income?.annualReports?.[1]?.grossProfit) / parseFloat(income?.annualReports?.[1]?.totalRevenue));
      if (currentGrossMargin > prevGrossMargin) {
        score++;
        criteria.push({ name: 'Improving Margins', passed: true });
      } else {
        criteria.push({ name: 'Improving Margins', passed: false });
      }
      
      // 9. Increased Asset Turnover
      const currentTurnover = (parseFloat(currentIncome.totalRevenue) || 0) / (parseFloat(currentBalance.totalAssets) || 1);
      const prevTurnover = (parseFloat(income?.annualReports?.[1]?.totalRevenue) || 0) / (parseFloat(prevBalance.totalAssets) || 1);
      if (currentTurnover > prevTurnover) {
        score++;
        criteria.push({ name: 'Improving Efficiency', passed: true });
      } else {
        criteria.push({ name: 'Improving Efficiency', passed: false });
      }
      
    } catch (error) {
      console.error('Error calculating Piotroski Score:', error);
    }
    
    return { score, criteria, max: 9 };
  }

  calculateFreeCashFlow(cashFlow) {
    const latest = cashFlow?.annualReports?.[0] || {};
    const operatingCashFlow = parseFloat(latest.operatingCashflow) || 0;
    const capitalExpenditures = Math.abs(parseFloat(latest.capitalExpenditures) || 0);
    return operatingCashFlow - capitalExpenditures;
  }

  calculateFCFYield(overview, cashFlow) {
    const fcf = this.calculateFreeCashFlow(cashFlow);
    const marketCap = parseFloat(overview?.MarketCapitalization) || 0;
    if (marketCap === 0) return '0';
    return ((fcf / marketCap) * 100).toFixed(2);
  }

  calculateROIC(income, balance) {
    const latest = income?.annualReports?.[0] || {};
    const latestBalance = balance?.annualReports?.[0] || {};
    const ebit = parseFloat(latest.ebit) || parseFloat(latest.operatingIncome) || 0;
    const taxRate = parseFloat(latest.incomeTaxExpense) / parseFloat(latest.incomeBeforeTax) || 0.21;
    const nopat = ebit * (1 - taxRate);
    const investedCapital = parseFloat(latestBalance.totalAssets) - parseFloat(latestBalance.totalCurrentLiabilities);
    if (investedCapital === 0) return '0';
    return ((nopat / investedCapital) * 100).toFixed(2);
  }

  calculateCurrentRatio(balance) {
    const latest = balance?.annualReports?.[0] || {};
    const currentAssets = parseFloat(latest.totalCurrentAssets) || 0;
    const currentLiabilities = parseFloat(latest.totalCurrentLiabilities) || 1;
    return (currentAssets / currentLiabilities).toFixed(2);
  }

  calculateQuickRatio(balance) {
    const latest = balance?.annualReports?.[0] || {};
    const currentAssets = parseFloat(latest.totalCurrentAssets) || 0;
    const inventory = parseFloat(latest.inventory) || 0;
    const currentLiabilities = parseFloat(latest.totalCurrentLiabilities) || 1;
    return ((currentAssets - inventory) / currentLiabilities).toFixed(2);
  }

  calculateDebtToEquity(balance) {
    const latest = balance?.annualReports?.[0] || {};
    const totalDebt = parseFloat(latest.shortTermDebt || 0) + parseFloat(latest.longTermDebt || 0);
    const equity = parseFloat(latest.totalShareholderEquity) || 1;
    return (totalDebt / equity).toFixed(2);
  }
}

const metricsCalculator = new MetricsCalculatorService();

// Mock API functions (replace with your actual API calls)
const mockApiCall = async (endpoint, symbol) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock data structure
  if (endpoint === 'COMPANY_OVERVIEW') {
    return {
      MarketCapitalization: '2500000000000',
      Industry: 'Technology',
      Sector: 'Information Technology'
    };
  }
  
  if (endpoint === 'INCOME_STATEMENT') {
    return {
      annualReports: [
        {
          totalRevenue: '394328000000',
          grossProfit: '169148000000',
          operatingIncome: '114301000000',
          ebit: '114301000000',
          netIncome: '96995000000',
          incomeTaxExpense: '16741000000',
          incomeBeforeTax: '113736000000'
        },
        {
          totalRevenue: '365817000000',
          grossProfit: '152836000000',
          operatingIncome: '108949000000',
          netIncome: '94680000000'
        }
      ]
    };
  }
  
  if (endpoint === 'BALANCE_SHEET') {
    return {
      annualReports: [
        {
          totalAssets: '352755000000',
          totalCurrentAssets: '143566000000',
          totalCurrentLiabilities: '145308000000',
          totalLiabilities: '290437000000',
          totalShareholderEquity: '62146000000',
          retainedEarnings: '14966000000',
          longTermDebt: '106550000000',
          shortTermDebt: '15807000000',
          inventory: '6331000000',
          commonStockSharesOutstanding: '15550061000'
        },
        {
          totalAssets: '351002000000',
          totalCurrentAssets: '135405000000',
          totalCurrentLiabilities: '153982000000',
          longTermDebt: '109106000000',
          commonStockSharesOutstanding: '15812547000'
        }
      ]
    };
  }
  
  if (endpoint === 'CASH_FLOW') {
    return {
      annualReports: [
        {
          operatingCashflow: '110543000000',
          capitalExpenditures: '-10708000000'
        }
      ]
    };
  }
  
  return {};
};

// Modern Animated Gauge Component
const AnimatedGauge = ({ value, maxValue = 6, title, subtitle }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const normalizedValue = Math.min(Math.max(value, 0), maxValue);
  const percentage = (normalizedValue / maxValue) * 100;
  const rotation = (normalizedValue / maxValue) * 270 - 135;
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(normalizedValue), 100);
    return () => clearTimeout(timer);
  }, [normalizedValue]);
  
  const getColor = () => {
    if (value > 2.99) return '#10b981';
    if (value > 1.80) return '#f59e0b';
    return '#ef4444';
  };
  
  return (
    <div className="relative">
      <svg className="w-48 h-48 transform -rotate-90">
        <circle
          cx="96"
          cy="96"
          r="88"
          stroke="currentColor"
          strokeWidth="12"
          fill="none"
          className="text-gray-700"
        />
        <circle
          cx="96"
          cy="96"
          r="88"
          stroke={getColor()}
          strokeWidth="12"
          fill="none"
          strokeDasharray={`${552 * 0.75} 552`}
          strokeDashoffset={552 - (552 * 0.75 * animatedValue) / maxValue}
          className="transition-all duration-1000 ease-out"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-white">{value.toFixed(2)}</div>
        <div className="text-sm text-gray-400 mt-1">{title}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>
    </div>
  );
};

// Piotroski Score Visual Component
const PiotroskiScoreVisual = ({ score, criteria }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);
  
  const getScoreColor = () => {
    if (score >= 7) return 'text-green-400';
    if (score >= 5) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-6xl font-bold">
          <span className={getScoreColor()}>{animatedScore}</span>
          <span className="text-gray-500">/9</span>
        </div>
        <div className="flex-1 ml-6">
          <div className="grid grid-cols-9 gap-1">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-500 ${
                  i < animatedScore
                    ? score >= 7 ? 'bg-green-500' : score >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    : 'bg-gray-700'
                }`}
                style={{ transitionDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
      
      {criteria && criteria.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          {criteria.map((criterion, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 text-xs animate-fadeIn"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {criterion.passed ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className={criterion.passed ? 'text-gray-300' : 'text-gray-500'}>
                {criterion.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Enhanced Metric Card
const MetricCard = ({ title, value, subtitle, trend, icon: Icon, color = 'blue' }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);
  
  const colorClasses = {
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    red: 'from-red-500/20 to-red-600/20 border-red-500/30',
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30'
  };
  
  return (
    <div className={`
      relative overflow-hidden rounded-xl border backdrop-blur-sm
      bg-gradient-to-br ${colorClasses[color]}
      transition-all duration-500 hover:scale-105 hover:shadow-2xl
      ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
    `}>
      {Icon && (
        <div className="absolute top-3 right-3 opacity-20">
          <Icon size={40} />
        </div>
      )}
      <div className="p-4">
        <div className="text-sm text-gray-400 mb-1">{title}</div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        {subtitle && (
          <div className="text-xs text-gray-500">{subtitle}</div>
        )}
        {trend !== undefined && (
          <div className={`text-xs mt-2 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
};

// Main Component
export default function StockHealthMetrics({ symbol = 'AAPL' }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all required data
        const [overview, income, balance, cashFlow] = await Promise.all([
          mockApiCall('COMPANY_OVERVIEW', symbol),
          mockApiCall('INCOME_STATEMENT', symbol),
          mockApiCall('BALANCE_SHEET', symbol),
          mockApiCall('CASH_FLOW', symbol)
        ]);

        // Calculate all metrics
        const altmanZ = metricsCalculator.calculateAltmanZScore(overview, income, balance);
        const piotroski = metricsCalculator.calculatePiotroskiScore(income, balance, cashFlow);
        const fcf = metricsCalculator.calculateFreeCashFlow(cashFlow);
        const fcfYield = metricsCalculator.calculateFCFYield(overview, cashFlow);
        const currentRatio = metricsCalculator.calculateCurrentRatio(balance);
        const quickRatio = metricsCalculator.calculateQuickRatio(balance);
        const debtToEquity = metricsCalculator.calculateDebtToEquity(balance);
        const roic = metricsCalculator.calculateROIC(income, balance);

        setMetrics({
          altmanZ,
          piotroski,
          freeCashFlow: fcf,
          fcfYield,
          currentRatio,
          quickRatio,
          debtToEquity,
          roic,
          industry: overview.Industry,
          sector: overview.Sector
        });
      } catch (err) {
        setError('Failed to load financial metrics');
        console.error('Error loading metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [symbol]);

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    const billions = Math.abs(value) / 1000000000;
    if (billions >= 1) {
      return `${value < 0 ? '-' : ''}$${billions.toFixed(2)}B`;
    }
    const millions = Math.abs(value) / 1000000;
    return `${value < 0 ? '-' : ''}$${millions.toFixed(2)}M`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800/50 rounded-2xl p-8 backdrop-blur-xl">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-700 rounded w-1/3"></div>
              <div className="grid grid-cols-2 gap-6">
                <div className="h-48 bg-gray-700 rounded-xl"></div>
                <div className="h-48 bg-gray-700 rounded-xl"></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-700 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-8">
            <div className="text-red-400">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl p-6 backdrop-blur-xl border border-gray-700/50">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Financial Health Analysis
              </h1>
              <p className="text-gray-400">
                {metrics?.industry} · {metrics?.sector}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Real-time Analysis</div>
              <div className="text-xs text-green-400 flex items-center gap-1 justify-end mt-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Live
              </div>
            </div>
          </div>
        </div>

        {/* Key Scores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Altman Z-Score */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 backdrop-blur-xl border border-gray-700/50">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Bankruptcy Risk Assessment
            </h2>
            <div className="flex items-center justify-center">
              <AnimatedGauge
                value={parseFloat(metrics?.altmanZ?.score || 0)}
                maxValue={6}
                title="Altman Z-Score"
                subtitle={metrics?.altmanZ?.interpretation}
              />
            </div>
            {metrics?.altmanZ?.components && (
              <div className="grid grid-cols-5 gap-2 mt-6">
                {Object.entries(metrics.altmanZ.components).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-xs text-gray-500">{key}</div>
                    <div className="text-sm font-semibold text-gray-300">{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Piotroski F-Score */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 backdrop-blur-xl border border-gray-700/50">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Fundamental Strength
            </h2>
            <PiotroskiScoreVisual 
              score={metrics?.piotroski?.score || 0}
              criteria={metrics?.piotroski?.criteria || []}
            />
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Free Cash Flow"
            value={formatCurrency(metrics?.freeCashFlow)}
            subtitle={metrics?.freeCashFlow > 0 ? 'Positive Cash Generation' : 'Negative Cash Flow'}
            icon={TrendingUp}
            color={metrics?.freeCashFlow > 0 ? 'green' : 'red'}
          />
          
          <MetricCard
            title="FCF Yield"
            value={`${metrics?.fcfYield || '0'}%`}
            subtitle="Return on Market Cap"
            color={parseFloat(metrics?.fcfYield) > 5 ? 'green' : 'yellow'}
          />
          
          <MetricCard
            title="ROIC"
            value={`${metrics?.roic || '0'}%`}
            subtitle="Return on Invested Capital"
            color={parseFloat(metrics?.roic) > 15 ? 'green' : 'yellow'}
          />
          
          <MetricCard
            title="Current Ratio"
            value={metrics?.currentRatio || 'N/A'}
            subtitle="Short-term Liquidity"
            color={parseFloat(metrics?.currentRatio) > 1.5 ? 'green' : 'yellow'}
          />
          
          <MetricCard
            title="Quick Ratio"
            value={metrics?.quickRatio || 'N/A'}
            subtitle="Immediate Liquidity"
            color={parseFloat(metrics?.quickRatio) > 1 ? 'green' : 'yellow'}
          />
          
          <MetricCard
            title="Debt/Equity"
            value={metrics?.debtToEquity || 'N/A'}
            subtitle="Financial Leverage"
            color={parseFloat(metrics?.debtToEquity) < 1 ? 'green' : 'yellow'}
          />
          
          <MetricCard
            title="Industry"
            value={metrics?.industry || 'N/A'}
            subtitle="Sector Classification"
            color="blue"
          />
          
          <MetricCard
            title="Analysis Status"
            value="Real-Time"
            subtitle="Data Freshness"
            color="green"
          />
        </div>
      </div>
    </div>
  );
}
