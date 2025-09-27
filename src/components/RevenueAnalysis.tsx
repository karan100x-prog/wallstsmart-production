import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, ReferenceLine } from 'recharts';
import { TrendingUp, Calendar, DollarSign, Activity, ArrowUpRight, ArrowDownRight, Zap, Target } from 'lucide-react';

interface RevenueAnalysisProps {
  symbol: string;
}

interface FinancialData {
  period: string;
  revenue: number;
  netIncome: number;
  isProjected: boolean;
  growthRate?: number;
  margin?: number;
}

const RevenueAnalysis: React.FC<RevenueAnalysisProps> = ({ symbol }) => {
  const [viewMode, setViewMode] = useState<'FY' | 'QTR'>('FY');
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectedGrowthRate, setProjectedGrowthRate] = useState<number>(0);
  const [currentMargin, setCurrentMargin] = useState<number>(0);

  useEffect(() => {
    loadFinancialData();
  }, [symbol, viewMode]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const incomeResponse = await fetch(
        `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${symbol}&apikey=NMSRS0ZDIOWF3CLL`
      );
      const incomeData = await incomeResponse.json();

      let processedData: FinancialData[] = [];

      if (viewMode === 'FY') {
        processedData = processAnnualData(incomeData.annualReports || []);
      } else {
        processedData = processQuarterlyData(incomeData.quarterlyReports || []);
      }

      setFinancialData(processedData);
      
      // Calculate current margin for display
      if (processedData.length > 0) {
        const latest = processedData[processedData.length - 1];
        if (!latest.isProjected && latest.revenue > 0) {
          setCurrentMargin((latest.netIncome / latest.revenue) * 100);
        }
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHistoricalGrowthRate = (data: FinancialData[]): number => {
    if (data.length < 2) return 0.05;
    
    const growthRates: number[] = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i-1].revenue > 0) {
        const growth = (data[i].revenue - data[i-1].revenue) / data[i-1].revenue;
        growthRates.push(growth);
      }
    }
    
    if (growthRates.length === 0) return 0.05;
    
    const weights = growthRates.map((_, i) => i + 1);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    
    const weightedGrowth = growthRates.reduce((sum, rate, i) => 
      sum + (rate * weights[i] / weightSum), 0
    );
    
    return Math.max(-0.2, Math.min(0.5, weightedGrowth));
  };

  const generateProjections = (
    historicalData: FinancialData[],
    periods: number,
    type: 'annual' | 'quarterly'
  ): FinancialData[] => {
    if (historicalData.length < 1) return [];

    const growthRate = calculateHistoricalGrowthRate(historicalData);
    setProjectedGrowthRate(growthRate);
    
    // Calculate average net margin from historical data
    const avgMargin = historicalData.reduce((sum, d) => {
      return d.revenue > 0 ? sum + (d.netIncome / d.revenue) : sum;
    }, 0) / historicalData.filter(d => d.revenue > 0).length;
    
    const projections: FinancialData[] = [];
    let lastRevenue = historicalData[historicalData.length - 1].revenue;
    const lastPeriod = historicalData[historicalData.length - 1].period;

    for (let i = 1; i <= periods; i++) {
      const projectedRevenue = lastRevenue * (1 + growthRate);
      const projectedNetIncome = projectedRevenue * avgMargin;
      
      let periodLabel = '';
      if (type === 'annual') {
        const baseYear = parseInt(lastPeriod.substring(0, 4));
        periodLabel = `${baseYear + i}e`;
      } else {
        const lastYear = parseInt(lastPeriod.substring(0, 4));
        const lastQuarter = historicalData.length % 4 || 4;
        const nextQuarter = ((lastQuarter + i - 1) % 4) + 1;
        const yearOffset = Math.floor((lastQuarter + i - 1) / 4);
        periodLabel = `${lastYear + yearOffset}-Q${nextQuarter}e`;
      }
      
      projections.push({
        period: periodLabel,
        revenue: projectedRevenue,
        netIncome: projectedNetIncome,
        isProjected: true,
        growthRate: growthRate * 100,
        margin: avgMargin * 100
      });
      
      lastRevenue = projectedRevenue;
    }
    
    return projections;
  };

  const processAnnualData = (reports: any[]): FinancialData[] => {
    const historicalData = reports
      .slice(0, 8)
      .reverse()
      .map((report, index, array) => {
        const revenue = parseFloat(report.totalRevenue) || 0;
        const netIncome = parseFloat(report.netIncome) || 0;
        let growthRate = undefined;
        
        if (index > 0 && array[index - 1].totalRevenue > 0) {
          const prevRevenue = parseFloat(array[index - 1].totalRevenue);
          growthRate = ((revenue - prevRevenue) / prevRevenue) * 100;
        }
        
        return {
          period: report.fiscalDateEnding.substring(0, 4),
          revenue: revenue,
          netIncome: netIncome,
          isProjected: false,
          growthRate: growthRate,
          margin: revenue > 0 ? (netIncome / revenue) * 100 : 0
        };
      });

    const projections = generateProjections(historicalData, 2, 'annual');
    return [...historicalData, ...projections];
  };

  const processQuarterlyData = (reports: any[]): FinancialData[] => {
    const historicalData = reports
      .slice(0, 8)
      .reverse()
      .map((report, index, array) => {
        const revenue = parseFloat(report.totalRevenue) || 0;
        const netIncome = parseFloat(report.netIncome) || 0;
        let growthRate = undefined;
        
        if (index > 0 && array[index - 1].totalRevenue > 0) {
          const prevRevenue = parseFloat(array[index - 1].totalRevenue);
          growthRate = ((revenue - prevRevenue) / prevRevenue) * 100;
        }
        
        return {
          period: report.fiscalDateEnding.substring(0, 7),
          revenue: revenue,
          netIncome: netIncome,
          isProjected: false,
          growthRate: growthRate,
          margin: revenue > 0 ? (netIncome / revenue) * 100 : 0
        };
      });

    const projections = generateProjections(historicalData, 2, 'quarterly');
    return [...historicalData, ...projections];
  };

  const formatValue = (value: number) => {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1e9) return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
    if (absValue >= 1e6) return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
    return `${sign}$${(absValue / 1e3).toFixed(2)}K`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    const margin = data.revenue > 0 ? (data.netIncome / data.revenue) * 100 : 0;
    
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-xl border border-cyan-500/30 shadow-2xl backdrop-blur">
        <p className="text-white font-bold text-sm mb-2">{data.period}</p>
        <div className="space-y-1">
          <p className="text-cyan-400 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full"></span>
            Revenue: {formatValue(data.revenue)}
          </p>
          <p className={`flex items-center gap-2 ${data.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className={`inline-block w-2 h-2 rounded-full ${data.netIncome >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
            Net Income: {formatValue(data.netIncome)}
          </p>
          <p className="text-purple-400 text-xs">
            Margin: {margin.toFixed(1)}%
          </p>
          {data.growthRate !== undefined && (
            <p className={`text-xs ${data.growthRate >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              Growth: {data.growthRate.toFixed(1)}%
            </p>
          )}
        </div>
        {data.isProjected && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="text-blue-400 text-xs flex items-center gap-1">
              <Zap className="w-3 h-3" />
              AI Projection (Light Yellow)
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-cyan-500/20 p-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 animate-pulse"></div>
        <div className="relative z-10">
          <div className="h-8 bg-gray-700/50 rounded-lg w-1/3 mb-6"></div>
          <div className="h-96 bg-gray-700/30 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-cyan-500/20 p-8 mb-6 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              Revenue Analysis
            </h3>
            <p className="text-gray-400 text-sm">Revenue vs Net Income Analysis with AI Projections</p>
          </div>
          
          {/* Toggle Switch */}
          <div className="flex items-center gap-2 bg-gray-800/50 backdrop-blur rounded-xl p-1 border border-gray-700">
            <button
              onClick={() => setViewMode('FY')}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                viewMode === 'FY'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Annual
            </button>
            <button
              onClick={() => setViewMode('QTR')}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                viewMode === 'QTR'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Quarterly
            </button>
          </div>
        </div>

        {/* Main Chart */}
        <div className="h-[500px] bg-gray-800/30 rounded-xl p-4 backdrop-blur border border-gray-700/50">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={financialData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="projectedRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.7}/>
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="netIncomePositive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="projectedNetIncomePositive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fde047" stopOpacity={0.7}/>
                  <stop offset="100%" stopColor="#fde047" stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="netIncomeNegative" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="projectedNetIncomeNegative" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.7}/>
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              
              <XAxis 
                dataKey="period" 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              
              <YAxis 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickFormatter={formatValue}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="rect"
                formatter={(value) => {
                  if (value === 'Net Margin %') return null;
                  return <span className="text-gray-300 text-sm">{value}</span>;
                }}
              />
              
              <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
              
              {/* Revenue Bars */}
              <Bar 
                dataKey="revenue" 
                name="Revenue"
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
                shape={(props: any) => {
                  const { x, y, width, height, payload } = props;
                  const gradient = payload.isProjected ? 'url(#projectedRevenueGradient)' : 'url(#revenueGradient)';
                  return (
                    <g>
                      <rect x={x} y={y} width={width} height={height} fill={gradient} rx={8} ry={8} />
                      {payload.isProjected && (
                        <text x={x + width/2} y={y - 5} fill="#fbbf24" fontSize="10" textAnchor="middle">
                          Est
                        </text>
                      )}
                    </g>
                  );
                }}
              />
              
              {/* Net Income Bars */}
              <Bar 
                dataKey="netIncome" 
                name="Net Income"
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
                shape={(props: any) => {
                  const { x, y, width, height, payload } = props;
                  const isNegative = payload.netIncome < 0;
                  let gradient;
                  
                  if (payload.isProjected) {
                    gradient = isNegative ? 'url(#projectedNetIncomeNegative)' : 'url(#projectedNetIncomePositive)';
                  } else {
                    gradient = isNegative ? 'url(#netIncomeNegative)' : 'url(#netIncomePositive)';
                  }
                  
                  const actualY = isNegative ? y : y;
                  const actualHeight = Math.abs(height);
                  
                  return (
                    <g>
                      <rect 
                        x={x} 
                        y={actualY} 
                        width={width} 
                        height={actualHeight} 
                        fill={gradient} 
                        rx={8} 
                        ry={8}
                      />
                    </g>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Advanced Analytics Footer */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/30 rounded-xl border border-gray-700/50 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <p className="text-sm font-medium text-gray-300">Projection Model</p>
              </div>
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-xs text-gray-400">
              AI-powered weighted historical growth analysis with adaptive margin calculations.
              Recent periods weighted more heavily for accuracy.
            </p>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/30 rounded-xl border border-gray-700/50 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <p className="text-sm font-medium text-gray-300">Performance Insight</p>
              </div>
              {currentMargin >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-400" />
              )}
            </div>
            <p className="text-xs text-gray-400">
              {currentMargin >= 0 
                ? 'Company maintaining positive margins with stable revenue growth trajectory.'
                : 'Negative margins detected. Monitor cost structure and revenue optimization strategies.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueAnalysis;
