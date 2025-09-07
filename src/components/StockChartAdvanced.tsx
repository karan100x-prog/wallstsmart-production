// StockChartAdvanced.tsx - Updated with correct time ranges
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Legend
} from 'recharts';

interface StockChartAdvancedProps {
  symbol: string;
}

interface ChartDataPoint {
  date: string;
  price: number;
  volume: number;
  sma50?: number;
}

type TimeRange = '7D' | '1M' | '6M' | '1Y' | '3Y' | '5Y' | '10Y' | 'MAX';

const StockChartAdvanced: React.FC<StockChartAdvancedProps> = ({ symbol }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  
  // Toggle states
  const [showVolume, setShowVolume] = useState(true);
  const [showSMA50, setShowSMA50] = useState(false);

  useEffect(() => {
    loadChartData();
  }, [symbol, timeRange]);

  useEffect(() => {
    if (showSMA50 && chartData.length > 0) {
      loadSMA50();
    }
  }, [showSMA50]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=NMSRS0ZDIOWF3CLL`
      );
      const data = await response.json();
      
      if (data?.['Time Series (Daily)']) {
        const timeSeries = data['Time Series (Daily)'];
        const dates = Object.keys(timeSeries).reverse();
        
        // Calculate days to show based on time range
        const rangeMap: Record<TimeRange, number> = {
          '7D': 7,
          '1M': 30,
          '6M': 180,
          '1Y': 365,
          '3Y': 365 * 3,
          '5Y': 365 * 5,
          '10Y': 365 * 10,
          'MAX': dates.length
        };
        
        const daysToShow = rangeMap[timeRange];
        const filteredDates = dates.slice(-daysToShow);
        
        const formattedData = filteredDates.map(date => ({
          date: formatDate(date, timeRange),
          fullDate: date,
          price: parseFloat(timeSeries[date]['4. close']),
          volume: parseInt(timeSeries[date]['5. volume'])
        }));
        
        setChartData(formattedData);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSMA50 = async () => {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=SMA&symbol=${symbol}&interval=daily&time_period=50&series_type=close&apikey=NMSRS0ZDIOWF3CLL`
      );
      const data = await response.json();
      
      if (data?.['Technical Analysis: SMA']) {
        const smaData = data['Technical Analysis: SMA'];
        
        // Merge SMA data with existing chart data
        const updatedChartData = chartData.map(point => {
          // Match by full date for accuracy
          const smaValue = smaData[point.fullDate];
          
          if (smaValue) {
            return {
              ...point,
              sma50: parseFloat(smaValue.SMA)
            };
          }
          return point;
        });
        
        setChartData(updatedChartData);
      }
    } catch (error) {
      console.error('Error loading SMA 50:', error);
    }
  };

  const formatDate = (dateStr: string, range: TimeRange) => {
    const date = new Date(dateStr);
    
    // Different date formats based on time range
    if (range === '7D' || range === '1M') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (range === '6M' || range === '1Y') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      // For longer ranges, show month and year
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded p-3">
          <p className="text-white font-semibold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {
                entry.name === 'Volume' 
                  ? formatVolume(entry.value)
                  : entry.value 
                  ? `$${entry.value.toFixed(2)}`
                  : 'N/A'
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const maxVolume = Math.max(...chartData.map(d => d.volume));
  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const priceRange = maxPrice - minPrice;

  // Calculate interval for x-axis labels based on time range
  const getXAxisInterval = () => {
    const dataPoints = chartData.length;
    if (timeRange === '7D') return 0;
    if (timeRange === '1M') return Math.floor(dataPoints / 6);
    if (timeRange === '6M') return Math.floor(dataPoints / 6);
    if (timeRange === '1Y') return Math.floor(dataPoints / 12);
    return Math.floor(dataPoints / 10);
  };

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Time Range Buttons */}
        <div className="flex gap-1">
          {(['7D', '1M', '6M', '1Y', '3Y', '5Y', '10Y', 'MAX'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                timeRange === range
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Indicator Toggles */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showVolume}
              onChange={(e) => setShowVolume(e.target.checked)}
              className="w-4 h-4 text-green-600 bg-gray-800 border-gray-600 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-400">Volume</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSMA50}
              onChange={(e) => setShowSMA50(e.target.checked)}
              className="w-4 h-4 text-green-600 bg-gray-800 border-gray-600 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-400">SMA 50</span>
          </label>
        </div>
      </div>

      {/* Main Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              tick={{ fontSize: 12 }}
              interval={getXAxisInterval()}
            />
            <YAxis
              yAxisId="price"
              domain={[minPrice - priceRange * 0.1, maxPrice + priceRange * 0.1]}
              stroke="#9CA3AF"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            {showVolume && (
              <YAxis
                yAxisId="volume"
                orientation="right"
                stroke="#9CA3AF"
                tick={{ fontSize: 12 }}
                tickFormatter={formatVolume}
                domain={[0, maxVolume * 1.2]}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Volume Bars */}
            {showVolume && (
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="#4B5563"
                opacity={0.3}
                name="Volume"
              />
            )}
            
            {/* Price Line */}
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              name="Price"
              animationDuration={500}
            />
            
            {/* SMA 50 */}
            {showSMA50 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="sma50"
                stroke="#F59E0B"
                strokeWidth={1.5}
                dot={false}
                name="SMA 50"
                strokeDasharray="5 5"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Info Footer */}
      <div className="flex justify-between text-xs text-gray-400 px-2">
        <div>
          Latest: ${chartData[chartData.length - 1]?.price.toFixed(2)}
        </div>
        {showSMA50 && chartData[chartData.length - 1]?.sma50 && (
          <div>
            SMA 50: ${chartData[chartData.length - 1].sma50.toFixed(2)}
          </div>
        )}
        {showVolume && (
          <div>
            Volume: {formatVolume(chartData[chartData.length - 1]?.volume || 0)}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockChartAdvanced;
