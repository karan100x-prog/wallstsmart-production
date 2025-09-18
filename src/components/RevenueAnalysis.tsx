import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { TrendingUp, Calendar, DollarSign, Activity } from 'lucide-react';


//import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
//import { DollarSign } from 'lucide-react';

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

  const processAnnualData = (reports: any[]): RevenueData[] => {
    const historicalData = reports
      .slice(0, 8) // last 8 years only
      .reverse()
      .map(report => ({
        period: report.fiscalDateEnding.substring(0, 4),
        revenue: parseFloat(report.totalRevenue) || 0,
        isProjected: false,
      }));

    const projections = generateProjections(historicalData, 2, 'annual');
    return [...historicalData, ...projections];
  };

  const processQuarterlyData = (reports: any[]): RevenueData[] => {
    const historicalData = reports
      .slice(0, 8) // last 8 quarters only
      .reverse()
      .map(report => ({
        period: report.fiscalDateEnding.substring(0, 7),
        revenue: parseFloat(report.totalRevenue) || 0,
        isProjected: false,
      }));

    const projections = generateProjections(historicalData, 2, 'quarterly');
    return [...historicalData, ...projections];
  };

  const generateProjections = (
    historicalData: RevenueData[],
    periods: number,
    type: 'annual' | 'quarterly'
  ): RevenueData[] => {
    if (historicalData.length < 2) return [];

    const projections: RevenueData[] = [];
    let lastRevenue = historicalData[historicalData.length - 1].revenue;
    const lastPeriod = historicalData[historicalData.length - 1].period;

    for (let i = 1; i <= periods; i++) {
      const projectedRevenue = lastRevenue * 1.05; // simple +5% growth
      projections.push({
        period: type === 'annual'
          ? `${parseInt(lastPeriod) + i}e`
          : `Q${i} ${new Date().getFullYear()}e`,
        revenue: projectedRevenue,
        isProjected: true,
      });
      lastRevenue = projectedRevenue;
    }
    return projections;
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
        {data.growthRate !== undefined && (
          <p className={data.growthRate >= 0 ? 'text-green-300' : 'text-red-300'}>
            Growth: {data.growthRate.toFixed(1)}%
          </p>
        )}
        {data.isProjected && (
          <p className="text-blue-400 text-xs mt-1">Projected</p>
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
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickFormatter={formatRevenue}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Revenue Bars */}
            <Bar 
              dataKey="revenue" 
              name="Revenue"
              fill="#10B981"
              opacity={0.9}
              shape={(props: any) => {
                const { x, y, width, height, payload } = props;
                const color = payload.isProjected ? '#60A5FA' : '#10B981'; // light blue for projections
                return <rect x={x} y={y} width={width} height={height} fill={color} rx={4} ry={4} />;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Projection Disclaimer */}
      <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <p className="text-xs text-gray-400">
          <span className="text-blue-400 font-semibold">Note:</span> Future bars (light blue) are projections and based on simplified modeling.
        </p>
      </div>
    </div>
  );
};

export default RevenueAnalysis;
