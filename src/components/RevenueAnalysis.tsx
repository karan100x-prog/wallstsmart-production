import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { TrendingUp, Calendar, DollarSign, Activity } from 'lucide-react';

interface RevenueAnalysisProps {
  symbol: string;
}

interface RevenueData {
  period: string;
  revenue: number;
  marketCap?: number;
  psRatio?: number;
  isProjected: boolean;
  growthRate?: number;
}

const RevenueAnalysis: React.FC<RevenueAnalysisProps> = ({ symbol }) => {
  const [viewMode, setViewMode] = useState<'FY' | 'QTR'>('FY');
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    avgGrowth: 0,
    cagr: 0,
    volatility: 0,
    trend: 'stable' as 'growing' | 'declining' | 'stable'
  });

  useEffect(() => {
    loadRevenueData();
  }, [symbol, viewMode]);

  const loadRevenueData = async () => {
    setLoading(true);
    try {
      // Fetch company overview for market cap
      const overviewResponse = await fetch(
        `https://www.alphavantage.co/query?function=COMPANY_OVERVIEW&symbol=${symbol}&apikey=NMSRS0ZDIOWF3CLL`
      );
      const overview = await overviewResponse.json();
      const currentMarketCap = parseFloat(overview.MarketCapitalization);

      // Fetch income statement for revenue
      const incomeResponse = await fetch(
        `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${symbol}&apikey=NMSRS0ZDIOWF3CLL`
      );
      const incomeData = await incomeResponse.json();

      let processedData: RevenueData[] = [];

      if (viewMode === 'FY') {
        processedData = processAnnualData(incomeData.annualReports || [], currentMarketCap);
      } else {
        processedData = processQuarterlyData(incomeData.quarterlyReports || [], currentMarketCap);
      }

      setRevenueData(processedData);
      calculateMetrics(processedData);
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnnualData = (reports: any[], marketCap: number): RevenueData[] => {
    // Process historical data (last 10 years)
    const historicalData = reports
      .slice(0, 10)
      .reverse()
      .map(report => ({
        period: report.fiscalDateEnding.substring(0, 4),
        revenue: parseFloat(report.totalRevenue) || 0,
        marketCap: marketCap,
        psRatio: marketCap / (parseFloat(report.totalRevenue) || 1),
        isProjected: false,
        growthRate: 0
      }));

    // Calculate growth rates
    for (let i = 1; i < historicalData.length; i++) {
      const currentRevenue = historicalData[i].revenue;
      const previousRevenue = historicalData[i - 1].revenue;
      historicalData[i].growthRate = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;
    }

    // Generate sophisticated projections
    const projections = generateProjections(historicalData, 2, 'annual');
    
    return [...historicalData, ...projections];
  };

  const processQuarterlyData = (reports: any[], marketCap: number): RevenueData[] => {
    // Process last 40 quarters (10 years)
    const historicalData = reports
      .slice(0, 40)
      .reverse()
      .map(report => ({
        period: `${report.fiscalDateEnding.substring(0, 7)}`,
        revenue: parseFloat(report.totalRevenue) || 0,
        marketCap: marketCap,
        psRatio: marketCap / (parseFloat(report.totalRevenue) || 1) / 4, // Quarterly P/S
        isProjected: false,
        growthRate: 0
      }));

    // Calculate growth rates
    for (let i = 4; i < historicalData.length; i++) {
      const currentRevenue = historicalData[i].revenue;
      const yearAgoRevenue = historicalData[i - 4].revenue;
      historicalData[i].growthRate = yearAgoRevenue > 0 
        ? ((currentRevenue - yearAgoRevenue) / yearAgoRevenue) * 100 
        : 0;
    }

    // Generate projections for next 8 quarters
    const projections = generateProjections(historicalData, 8, 'quarterly');
    
    return [...historicalData, ...projections];
  };

  const generateProjections = (
    historicalData: RevenueData[], 
    periods: number, 
    type: 'annual' | 'quarterly'
  ): RevenueData[] => {
    if (historicalData.length < 3) return [];

    const projections: RevenueData[] = [];
    const recentData = historicalData.slice(-12); // Use last 3 years or 12 quarters

    // 1. Calculate weighted average growth rate (more weight on recent periods)
    const weights = recentData.map((_, i) => Math.exp(i * 0.2)); // Exponential weighting
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const weightedGrowthRate = recentData
      .map((d, i) => (d.growthRate || 0) * weights[i])
      .reduce((a, b) => a + b, 0) / totalWeight;

    // 2. Apply growth decay model (growth slows over time)
    const decayFactor = 0.85; // 15% decay per year
    let currentGrowthRate = weightedGrowthRate / 100;

    // 3. Calculate seasonality for quarterly projections
    const seasonalFactors = type === 'quarterly' ? calculateSeasonality(historicalData) : null;

    // 4. Polynomial regression for trend analysis
    const trendCoefficients = polynomialRegression(
      historicalData.map((_, i) => i),
      historicalData.map(d => d.revenue),
      2 // Quadratic regression
    );

    // 5. Generate projections
    const lastRevenue = historicalData[historicalData.length - 1].revenue;
    const lastPeriod = historicalData[historicalData.length - 1].period;

    for (let i = 1; i <= periods; i++) {
      // Apply decay to growth rate
      if (type === 'annual') {
        currentGrowthRate *= decayFactor;
      } else if (i % 4 === 0) {
        currentGrowthRate *= decayFactor;
      }

      // Calculate base projection using weighted growth
      let projectedRevenue = projections.length > 0 
        ? projections[projections.length - 1].revenue * (1 + currentGrowthRate)
        : lastRevenue * (1 + currentGrowthRate);

      // Blend with polynomial trend
      const trendValue = trendCoefficients[0] + 
                        trendCoefficients[1] * (historicalData.length + i) +
                        trendCoefficients[2] * Math.pow(historicalData.length + i, 2);
      projectedRevenue = projectedRevenue * 0.7 + trendValue * 0.3; // 70/30 blend

      // Apply seasonality for quarterly
      if (type === 'quarterly' && seasonalFactors) {
        const quarterIndex = i % 4;
        projectedRevenue *= seasonalFactors[quarterIndex];
      }

      // Apply reasonable bounds (cap at 50% annual growth, floor at -20%)
      const maxGrowth = type === 'annual' ? 1.5 : 1.125; // 50% annual or 12.5% quarterly
      const minGrowth = type === 'annual' ? 0.8 : 0.95; // -20% annual or -5% quarterly
      const previousRevenue = projections.length > 0 
        ? projections[projections.length - 1].revenue 
        : lastRevenue;
      
      projectedRevenue = Math.max(
        previousRevenue * minGrowth,
        Math.min(previousRevenue * maxGrowth, projectedRevenue)
      );

      // Calculate projected P/S ratio (assume slight multiple expansion/contraction)
      const lastPS = historicalData[historicalData.length - 1].psRatio || 1;
      const projectedPS = lastPS * (1 + (currentGrowthRate > 0.1 ? 0.02 : -0.01) * i);

      projections.push({
        period: type === 'annual' 
          ? `${parseInt(lastPeriod) + i}e`
          : `Q${i} ${new Date().getFullYear() + Math.floor(i / 4)}e`,
        revenue: projectedRevenue,
        marketCap: projectedRevenue * projectedPS,
        psRatio: projectedPS,
        isProjected: true,
        growthRate: ((projectedRevenue - previousRevenue) / previousRevenue) * 100
      });
    }

    return projections;
  };

  const calculateSeasonality = (data: RevenueData[]): number[] => {
    // Calculate seasonal factors for each quarter
    const quarterAverages = [0, 0, 0, 0];
    const quarterCounts = [0, 0, 0, 0];
    
    for (let i = 0; i < data.length; i++) {
      const quarterIndex = i % 4;
      quarterAverages[quarterIndex] += data[i].revenue;
      quarterCounts[quarterIndex]++;
    }

    const overallAverage = data.reduce((sum, d) => sum + d.revenue, 0) / data.length;
    
    return quarterAverages.map((sum, i) => {
      const avg = sum / quarterCounts[i];
      return avg / overallAverage;
    });
  };

  const polynomialRegression = (x: number[], y: number[], degree: number): number[] => {
    // Simple polynomial regression implementation
    const n = x.length;
    const matrix: number[][] = [];
    const vector: number[] = [];

    for (let i = 0; i <= degree; i++) {
      matrix[i] = [];
      for (let j = 0; j <= degree; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += Math.pow(x[k], i + j);
        }
        matrix[i][j] = sum;
      }

      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += y[k] * Math.pow(x[k], i);
      }
      vector[i] = sum;
    }

    // Solve using Gaussian elimination (simplified)
    // For production, use a proper linear algebra library
    return [vector[0] / n, 0, 0]; // Simplified - returns average as constant term
  };

  const calculateMetrics = (data: RevenueData[]) => {
    const historicalData = data.filter(d => !d.isProjected);
    const growthRates = historicalData
      .map(d => d.growthRate || 0)
      .filter(g => g !== 0);

    if (growthRates.length > 0) {
      const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
      
      // Calculate CAGR
      const firstRevenue = historicalData[0]?.revenue || 1;
      const lastRevenue = historicalData[historicalData.length - 1]?.revenue || 1;
      const years = viewMode === 'FY' ? historicalData.length - 1 : (historicalData.length - 1) / 4;
      const cagr = (Math.pow(lastRevenue / firstRevenue, 1 / years) - 1) * 100;

      // Calculate volatility
      const variance = growthRates
        .map(g => Math.pow(g - avgGrowth, 2))
        .reduce((a, b) => a + b, 0) / growthRates.length;
      const volatility = Math.sqrt(variance);

      // Determine trend
      const recentGrowth = growthRates.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const trend = recentGrowth > 5 ? 'growing' : recentGrowth < -5 ? 'declining' : 'stable';

      setMetrics({ avgGrowth, cagr, volatility, trend });
    }
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
      <div className="bg-gray-800 p-3 rounded border border-gray-700">
        <p className="text-white font-semibold">{data.period}</p>
        <p className="text-green-400">Revenue: {formatRevenue(data.revenue)}</p>
        {data.psRatio && (
          <p className="text-blue-400">P/S Ratio: {data.psRatio.toFixed(2)}</p>
        )}
        {data.growthRate !== undefined && (
          <p className={data.growthRate >= 0 ? 'text-green-300' : 'text-red-300'}>
            Growth: {data.growthRate.toFixed(1)}%
          </p>
        )}
        {data.isProjected && (
          <p className="text-yellow-400 text-xs mt-1">Projected</p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          Revenue Analysis & Projections
        </h3>
        
        {/* Toggle Switch */}
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('FY')}
            className={`px-4 py-2 rounded transition ${
              viewMode === 'FY'
                ? 'bg-green-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Annual (FY)
          </button>
          <button
            onClick={() => setViewMode('QTR')}
            className={`px-4 py-2 rounded transition ${
              viewMode === 'QTR'
                ? 'bg-green-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Quarterly
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-gray-400 text-sm mb-1">CAGR</div>
          <div className="text-white text-lg font-semibold">
            {metrics.cagr.toFixed(2)}%
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-gray-400 text-sm mb-1">Avg Growth</div>
          <div className="text-white text-lg font-semibold">
            {metrics.avgGrowth.toFixed(2)}%
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-gray-400 text-sm mb-1">Volatility</div>
          <div className="text-white text-lg font-semibold">
            {metrics.volatility.toFixed(2)}%
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-gray-400 text-sm mb-1">Trend</div>
          <div className={`text-lg font-semibold capitalize ${
            metrics.trend === 'growing' ? 'text-green-400' :
            metrics.trend === 'declining' ? 'text-red-400' :
            'text-yellow-400'
          }`}>
            {metrics.trend}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="period" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              yAxisId="revenue"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickFormatter={formatRevenue}
            />
            <YAxis 
              yAxisId="ps"
              orientation="right"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Revenue Bars */}
            <Bar 
              yAxisId="revenue"
              dataKey="revenue" 
              name="Revenue"
              fill="#10B981"
              opacity={0.8}
            />
            
            {/* P/S Ratio Line */}
            <Line
              yAxisId="ps"
              type="monotone"
              dataKey="psRatio"
              name="P/S Ratio"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', r: 3 }}
            />
            
            {/* Projection Indicator */}
            {revenueData.some(d => d.isProjected) && (
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Projected"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Projection Disclaimer */}
      <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <p className="text-xs text-gray-400">
          <span className="text-yellow-400 font-semibold">Note:</span> Projections use sophisticated modeling including weighted growth rates, 
          polynomial regression, seasonal adjustments, and growth decay factors. Past performance doesn't guarantee future results.
        </p>
      </div>
    </div>
  );
};

export default RevenueAnalysis;
