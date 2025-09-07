// StockChartAdvanced.tsx - Split-Adjusted Version
import React, { useState, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Legend,
  ReferenceLine
} from 'recharts';

interface StockChartAdvancedProps {
  symbol: string;
}

interface ChartDataPoint {
  date: string;
  fullDate: string;
  price: number;
  adjustedClose: number;
  volume: number;
  sma50?: number;
  splitCoefficient?: number;
  dividend?: number;
}

interface SplitEvent {
  date: string;
  ratio: string;
}

type TimeRange = '7D' | '1M' | '6M' | '1Y' | '3Y' | '5Y' | '10Y' | 'MAX';

const StockChartAdvanced: React.FC<StockChartAdvancedProps> = ({ symbol }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [splitEvents, setSplitEvents] = useState<SplitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [useAdjusted, setUseAdjusted] = useState(true); // Toggle for adjusted vs raw prices
  
  // Toggle states
  const [showVolume, setShowVolume] = useState(true);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showSplits, setShowSplits] = useState(true);
  const [showDividends, setShowDividends] = useState(false);

  useEffect(() => {
    loadChartData();
    loadSplitData();
  }, [symbol, timeRange]);

  useEffect(() => {
    if (showSMA50 && chartData.length > 0) {
      loadSMA50();
    }
  }, [showSMA50, useAdjusted]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      // Use TIME_SERIES_DAILY_ADJUSTED for split-adjusted data
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=NMSRS0ZDIOWF3CLL`
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
          price: parseFloat(timeSeries[date]['4. close']), // Raw close price
          adjustedClose: parseFloat(timeSeries[date]['5. adjusted close']), // Split-adjusted close
          volume: parseInt(timeSeries[date]['6. volume']),
          splitCoefficient: parseFloat(timeSeries[date]['8. split coefficient']),
          dividend: parseFloat(timeSeries[date]['7. dividend amount'])
        }));
        
        setChartData(formattedData);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSplitData = async () => {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=SPLITS&symbol=${symbol}&apikey=NMSRS0ZDIOWF3CLL`
      );
      const data = await response.json();
      
      if (data?.data && Array.isArray(data.data)) {
        setSplitEvents(data.data.map((split: any) => ({
          date: split.effective_date,
          ratio: split.split_ratio
        })));
      }
    } catch (error) {
      console.error('Error loading split data:', error);
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
          const smaValue = smaData[point.fullDate];
          
          if (smaValue) {
            // If using adjusted prices, we need to adjust the SMA as well
            const sma = parseFloat(smaValue.SMA);
            const adjustmentRatio = useAdjusted ? (point.adjustedClose / point.price) : 1;
            
            return {
              ...point,
              sma50: sma * adjustmentRatio
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
    
    if (range === '7D' || range === '1M') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (range === '6M' || range === '1Y') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
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
      const dataPoint = chartData.find(d => d.date === label);
      const splitEvent = splitEvents.find(s => formatDate(s.date, timeRange) === label);
      
      return (
        <div className="bg-gray-900 border border-gray-700 rounded p-3">
          <p className="text-white font-semibold mb-1">{label}</p>
          
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === 'displayPrice' || entry.dataKey === 'sma50') {
              return (
                <p key={index} className="text-sm" style={{ color: entry.color }}>
                  {entry.name}: ${entry.value?.toFixed(2) || 'N/A'}
                </p>
              );
            } else if (entry.dataKey === 'volume') {
              return (
                <p key={index} className="text-sm" style={{ color: entry.color }}>
                  {entry.name}: {formatVolume(entry.value)}
                </p>
              );
            }
            return null;
          })}
          
          {/* Show both raw and adjusted prices if different */}
          {dataPoint && Math.abs(dataPoint.price - dataPoint.adjustedClose) > 0.01 && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-xs text-gray-400">Raw Close: ${dataPoint.price.toFixed(2)}</p>
              <p className="text-xs text-gray-400">Adjusted: ${dataPoint.adjustedClose.toFixed(2)}</p>
            </div>
          )}
          
          {/* Show split info if on split date */}
          {splitEvent && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-xs text-yellow-400">🔄 Stock Split: {splitEvent.ratio}</p>
            </div>
          )}
          
          {/* Show dividend if present */}
          {dataPoint && dataPoint.dividend && dataPoint.dividend > 0 && (
            <div className="mt-1">
              <p className="text-xs text-blue-400">💰 Dividend: ${dataPoint.dividend.toFixed(2)}</p>
            </div>
          )}
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

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">No data available</div>
      </div>
    );
  }

  // Use adjusted or raw prices based on toggle
  const displayData = chartData.map(point => ({
    ...point,
    displayPrice: useAdjusted ? point.adjustedClose : point.price
  }));

  const prices = displayData.map(d => d.displayPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const maxVolume = Math.max(...chartData.map(d => d.volume));

  // Filter splits to show only those in current time range
  const visibleSplits = splitEvents.filter(split => {
    const splitDate = new Date(split.date);
    const firstDataDate = new Date(chartData[0]?.fullDate);
    return splitDate >= firstDataDate;
  });

  const getXAxisInterval = () => {
    const dataPoints = chartData.length;
    if (timeRange === '7D') return 0;
    if (timeRange === '1M') return Math.floor(dataPoints / 6);
    if (timeRange === '6M') return Math.floor(dataPoints / 6);
    if (timeRange === '1Y') return Math.floor(dataPoints / 12);
    return Math.floor(dataPoints / 10);
  };

  const lastDataPoint = displayData[displayData.length - 1];
  const priceChange = lastDataPoint && displayData[0] 
    ? ((lastDataPoint.displayPrice - displayData[0].displayPrice) / displayData[0].displayPrice * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header with Price Change */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-white">
            ${lastDataPoint?.displayPrice.toFixed(2)}
          </span>
          <span className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% ({timeRange})
          </span>
        </div>
        
        {/* Adjusted/Raw Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useAdjusted}
            onChange={(e) => setUseAdjusted(e.target.checked)}
            className="w-4 h-4 text-green-600 bg-gray-800 border-gray-600 rounded focus:ring-green-500"
          />
          <span className="text-sm text-gray-400">Split-Adjusted</span>
        </label>
      </div>

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
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSplits}
              onChange={(e) => setShowSplits(e.target.checked)}
              className="w-4 h-4 text-green-600 bg-gray-800 border-gray-600 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-400">Splits</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDividends}
              onChange={(e) => setShowDividends(e.target.checked)}
              className="w-4 h-4 text-green-600 bg-gray-800 border-gray-600 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-400">Dividends</span>
          </label>
        </div>
      </div>

      {/* Main Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={displayData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
            
            {/* Stock Split Markers */}
            {showSplits && visibleSplits.map((split, index) => (
              <ReferenceLine
                key={index}
                x={formatDate(split.date, timeRange)}
                stroke="#FBBF24"
                strokeDasharray="5 5"
                label={{
                  value: `Split ${split.ratio}`,
                  position: 'top',
                  fill: '#FBBF24',
                  fontSize: 10
                }}
              />
            ))}
            
            {/* Dividend Markers - Show as dots on the price line */}
            {showDividends && displayData.map((point, index) => {
              if (point.dividend && point.dividend > 0) {
                return (
                  <ReferenceLine
                    key={`div-${index}`}
                    x={point.date}
                    stroke="#3B82F6"
                    strokeDasharray="2 2"
                    strokeWidth={1}
                  />
                );
              }
              return null;
            })}
            
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
              dataKey="displayPrice"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              name={useAdjusted ? "Adjusted Price" : "Price"}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-400 px-2">
        <div>
          <span className="block text-gray-500">Current Price</span>
          <span className="text-white">${lastDataPoint?.displayPrice.toFixed(2)}</span>
          {useAdjusted && lastDataPoint && Math.abs(lastDataPoint.price - lastDataPoint.adjustedClose) > 0.01 && (
            <span className="block text-gray-500">(Raw: ${lastDataPoint.price.toFixed(2)})</span>
          )}
        </div>
        
        {showSMA50 && lastDataPoint?.sma50 && (
          <div>
            <span className="block text-gray-500">SMA 50</span>
            <span className="text-yellow-500">${lastDataPoint.sma50.toFixed(2)}</span>
          </div>
        )}
        
        {showVolume && (
          <div>
            <span className="block text-gray-500">Volume</span>
            <span className="text-white">{formatVolume(lastDataPoint?.volume || 0)}</span>
          </div>
        )}
        
        {visibleSplits.length > 0 && (
          <div>
            <span className="block text-gray-500">Recent Splits</span>
            <span className="text-yellow-400">{visibleSplits.length} in period</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockChartAdvanced;
