import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { TrendingUp, Calendar, DollarSign, Activity } from 'lucide-react';

interface RevenueAnalysisProps {
  symbol: string;
}

interface RevenueData {
  period: string;
  revenue: number;
  isProjected: boolean;
  growthRate?: number;
}

const RevenueAnalysis: React.FC<RevenueAnalysisProps> = ({ symbol }) => {
  const [viewMode, setViewMode] = useState<'FY' | 'QTR'>('FY');
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectedGrowthRate, setProjectedGrowthRate] = useState<number>(0);

  useEffect(() => {
    loadRevenueData();
  }, [symbol, viewMode]);

  const loadRevenueData = async () => {
    setLoading(true);
    try {
      const incomeResponse = await fetch(
        `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${symbol}&apikey=NMSRS0ZDIOWF3CLL`
      );
      const incomeData = await incomeResponse.json();

      let processedData: RevenueData[] = [];

      if (viewMode === 'FY') {
        processedData = processAnnualData(incomeData.annualReports || []);
      } else {
        processedData = processQuarterlyData(incomeData.quarterlyReports || []);
      }

      setRevenueData(processedData);
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Model #1: Historical Growth Rate with Weighted Average
  const calculateHistoricalGrowthRate = (data: RevenueData[]): number => {
    // Need at least 2 data points to calculate growth
    if (data.length < 2) {
      console.log('Insufficient data for growth calculation, using default 5%');
      return 0.05; // fallback to 5%
    }
    
    // Calculate year-over-year (or quarter-over-quarter) growth rates
    const growthRates: number[] = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i-1].revenue > 0) { // Avoid division by zero
        const growth = (data[i].revenue - data[i-1].revenue) / data[i-1].revenue;
        growthRates.push(growth);
        console.log(`Period ${data[i].period}: ${(growth * 100).toFixed(2)}% growth`);
      }
    }
    
    // If no valid growth rates, fallback
    if (growthRates.length === 0) {
      return 0.05;
    }
    
    // Calculate weighted average (more recent periods get higher weight)
    const weights = growthRates.map((_, i) => i + 1);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    
    const weightedGrowth = growthRates.reduce((sum, rate, i) => 
      sum + (rate * weights[i] / weightSum), 0
    );
    
    console.log(`Weighted average growth: ${(weightedGrowth * 100).toFixed(2)}%`);
    
    // Cap growth between -20% and +50% for realistic projections
    const cappedGrowth = Math.max(-0.2, Math.min(0.5, weightedGrowth));
    
    if (cappedGrowth !== weightedGrowth) {
      console.log(`Growth capped to: ${(cappedGrowth * 100).toFixed(2)}%`);
    }
    
    return cappedGrowth;
  };

  // Enhanced projection generator using historical growth model
  const generateProjections = (
    historicalData: RevenueData[],
    periods: number,
    type: 'annual' | 'quarterly'
  ): RevenueData[] => {
    if (historicalData.length < 1) return [];

    // Calculate the weighted historical growth rate
    const growthRate = calculateHistoricalGrowthRate(historicalData);
    setProjectedGrowthRate(growthRate); // Store for display
    
    const projections: RevenueData[] = [];
    let lastRevenue = historicalData[historicalData.length - 1].revenue;
    const lastPeriod = historicalData[historicalData.length - 1].period;

    // Generate projections using calculated growth rate
    for (let i = 1; i <= periods; i++) {
      const projectedRevenue = lastRevenue * (1 + growthRate);
      
      // Format the period label
      let periodLabel = '';
      if (type === 'annual') {
        const baseYear = parseInt(lastPeriod.substring(0, 4));
        periodLabel = `${baseYear + i}e`;
      } else {
        // For quarterly, extract quarter and year
        const lastYear = parseInt(lastPeriod.substring(0, 4));
        const lastQuarter = historicalData.length % 4 || 4;
        const nextQuarter = ((lastQuarter + i - 1) % 4) + 1;
        const yearOffset = Math.floor((lastQuarter + i - 1) / 4);
        periodLabel = `${lastYear + yearOffset}-Q${nextQuarter}e`;
      }
      
      projections.push({
        period: periodLabel,
        revenue: projectedRevenue,
        isProjected: true,
        growthRate: growthRate * 100 // Store as percentage
      });
      
      lastRevenue = projectedRevenue;
    }
    
    return projections;
  };

  const processAnnualData = (reports: any[]): RevenueData[] => {
    const historicalData = reports
      .slice(0, 8) // last 8 years only
      .reverse()
      .map((report, index, array) => {
        const revenue = parseFloat(report.totalRevenue) || 0;
        let growthRate = undefined;
        
        // Calculate growth rate for historical data
        if (index > 0 && array[index - 1].totalRevenue > 0) {
          const prevRevenue = parseFloat(array[index - 1].totalRevenue);
          growthRate = ((revenue - prevRevenue) / prevRevenue) * 100;
        }
        
        return {
          period: report.fiscalDateEnding.substring(0, 4),
          revenue: revenue,
          isProjected: false,
          growthRate: growthRate
        };
      });

    const projections = generateProjections(historicalData, 2, 'annual');
    return [...historicalData, ...projections];
  };

  const processQuarterlyData = (reports: any[]): RevenueData[] => {
    const historicalData = reports
      .slice(0, 8) // last 8 quarters only
      .reverse()
      .map((report, index, array) => {
        const revenue = parseFloat(report.totalRevenue) || 0;
        let growthRate = undefined;
        
        // Calculate growth rate for historical data
        if (index > 0 && array[index - 1].totalRevenue > 0) {
          const prevRevenue = parseFloat(array[index - 1].totalRevenue);
          growthRate = ((revenue - prevRevenue) / prevRevenue) * 100;
        }
        
        return {
          period: report.fiscalDateEnding.substring(0, 7),
          revenue: revenue,
          isProjected: false,
          growthRate: growthRate
        };
      });

    const projections = generateProjections(historicalData, 2, 'quarterly');
    return [...historicalData, ...projections];
  };

  const formatRevenue = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${(value / 1e3).toFixed(2)}K`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 rounded-xl border border-purple-500/30 shadow-2xl backdrop-blur-lg">
        <p className="text-white font-bold text-sm">{data.period}</p>
        <p className="text-emerald-400 font-semibold text-lg mt-1">
          {formatRevenue(data.revenue)}
        </p>
        {data.growthRate !== undefined && (
          <p className={`font-medium mt-1 ${data.growthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.growthRate >= 0 ? '📈' : '📉'} {data.growthRate.toFixed(1)}%
          </p>
        )}
        {data.isProjected && (
          <div className="mt-2 pt-2 border-t border-purple-500/30">
            <p className="text-cyan-400 text-xs font-medium animate-pulse">
              🔮 AI Projected
            </p>
          </div>
        )}
      </div>
    );
  };

  // Custom bar shape with enhanced rounded corners and gradient
  const CustomBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    
    // Different gradient colors for historical vs projected
    const gradientId = payload.isProjected ? 'projectedGradient' : 'historicalGradient';
    
    return (
      <g>
        <defs>
          <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10F988" stopOpacity={1}/>
            <stop offset="100%" stopColor="#10B981" stopOpacity={0.8}/>
          </linearGradient>
          <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity={1}/>
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.8}/>
          </linearGradient>
        </defs>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={`url(#${gradientId})`}
          rx={12}
          ry={12}
          filter="url(#glow)"
        />
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </g>
    );
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl border border-gray-700/50 p-8 mb-6 shadow-2xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-full w-1/3 mb-6"></div>
          <div className="h-96 bg-gradient-to-r from-purple-600/10 to-cyan-600/10 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl border border-gray-700/50 p-8 mb-6 shadow-2xl backdrop-blur-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl">
            <DollarSign className="h-6 w-6 text-emerald-400" />
          </div>
          Revenue Analytics
        </h3>
        
        {/* Toggle Switch - Modern Pill Style */}
        <div className="flex items-center gap-1 bg-gray-900/50 rounded-full p-1.5 border border-gray-700/50 backdrop-blur-sm">
          <button
            onClick={() => setViewMode('FY')}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
              viewMode === 'FY'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            Yearly
          </button>
          <button
            onClick={() => setViewMode('QTR')}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
              viewMode === 'QTR'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            Quarterly
          </button>
        </div>
      </div>

      {/* Chart with gradient background */}
      <div className="h-96 bg-gradient-to-br from-gray-900/50 to-gray-800/30 rounded-2xl p-4 border border-gray-700/30">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis 
              dataKey="period" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontWeight: 500 }}
              tickFormatter={formatRevenue}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Revenue Bars with custom shape */}
            <Bar 
              dataKey="revenue" 
              name="Revenue"
              shape={CustomBar}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Modern Projection Info Card */}
      <div className="mt-6 p-5 bg-gradient-to-r from-purple-900/20 via-cyan-900/20 to-emerald-900/20 rounded-2xl border border-purple-500/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                🤖 AI Projection Model
              </span>
              <span className="px-2 py-1 bg-purple-500/20 rounded-full text-xs text-purple-300 font-semibold animate-pulse">
                LIVE
              </span>
            </div>
            <p className="text-xs text-gray-400 max-w-md">
              Future projections (purple bars) powered by weighted historical growth analysis 
              with recent performance prioritized for accuracy.
            </p>
          </div>
          {projectedGrowthRate !== 0 && (
            <div className="text-right bg-gray-900/50 rounded-xl p-3 border border-gray-700/50">
              <p className="text-xs text-gray-500 font-medium mb-1">Projected Growth</p>
              <p className={`text-2xl font-black ${projectedGrowthRate >= 0 
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400' 
                : 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400'}`}>
                {projectedGrowthRate >= 0 ? '+' : ''}{(projectedGrowthRate * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RevenueAnalysis;
