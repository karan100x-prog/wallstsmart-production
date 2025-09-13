import React, { useState, useEffect } from 'react';
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine 
} from 'recharts';
import { getDailyPrices, getWeeklyPrices, getMonthlyPrices } from '../services/alphaVantage';

interface StockChartAdvancedProps {
  symbol: string;
}

type TimeRange = '5D' | '1M' | '6M' | '1Y' | '5Y' | '10Y' | 'MAX';

// Stock split data for major companies
const STOCK_SPLITS: Record<string, Array<{date: string, ratio: number}>> = {
  'NVDA': [
    { date: '2024-06-10', ratio: 10 },
    { date: '2021-07-20', ratio: 4 },
    { date: '2007-09-11', ratio: 1.5 },
    { date: '2006-04-07', ratio: 2 },
    { date: '2001-09-17', ratio: 2 },
    { date: '2000-06-27', ratio: 2 },
  ],
  'AAPL': [
    { date: '2020-08-31', ratio: 4 },
    { date: '2014-06-09', ratio: 7 },
    { date: '2005-02-28', ratio: 2 },
    { date: '2000-06-21', ratio: 2 },
    { date: '1987-06-16', ratio: 2 },
  ],
  'TSLA': [
    { date: '2022-08-25', ratio: 3 },
    { date: '2020-08-31', ratio: 5 },
  ],
  'AMZN': [
    { date: '2022-06-06', ratio: 20 },
    { date: '1999-09-02', ratio: 2 },
    { date: '1999-01-05', ratio: 3 },
    { date: '1998-06-02', ratio: 2 },
  ],
  'GOOGL': [
    { date: '2022-07-18', ratio: 20 },
    { date: '2014-04-03', ratio: 2 },
  ],
  'GOOG': [
    { date: '2022-07-18', ratio: 20 },
    { date: '2014-04-03', ratio: 2 },
  ],
  'MSFT': [
    { date: '2003-02-18', ratio: 2 },
    { date: '1999-03-29', ratio: 2 },
    { date: '1998-02-23', ratio: 2 },
    { date: '1996-12-09', ratio: 2 },
  ],
  'NFLX': [
    { date: '2015-07-15', ratio: 7 },
    { date: '2004-02-12', ratio: 2 },
  ]
};

// Function to manually adjust prices for splits
function adjustPricesForSplits(data: any[], symbol: string): any[] {
  const splits = STOCK_SPLITS[symbol.toUpperCase()];
  
  if (!splits || splits.length === 0) {
    return data;
  }

  return data.map((item) => {
    const itemDate = new Date(item.date);
    let adjustmentFactor = 1;

    for (const split of splits) {
      const splitDate = new Date(split.date);
      if (splitDate > itemDate) {
        adjustmentFactor *= split.ratio;
      }
    }

    const closePrice = parseFloat(item.close) || 0;
    const adjustedPrice = closePrice / adjustmentFactor;
    const volume = parseInt(item.volume) || 0;

    return {
      ...item,
      close: closePrice,
      adjustedClose: adjustedPrice,
      volume: volume,
      adjustmentFactor: adjustmentFactor,
      isAdjusted: adjustmentFactor > 1
    };
  });
}

const StockChartAdvanced: React.FC<StockChartAdvancedProps> = ({ symbol }) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('5Y'); // Changed default to 5Y
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [periodChange, setPeriodChange] = useState({ value: 0, percentage: 0 });

  useEffect(() => {
    loadChartData(selectedRange);
  }, [symbol, selectedRange]);

  const loadChartData = async (range: TimeRange) => {
    setLoading(true);
    let data: any[] = [];
    
    try {
      // Calculate the cutoff date based on the selected range
      const today = new Date();
      let cutoffDate = new Date();
      
      switch (range) {
        case '5D':
          // Get last 5 trading days
          cutoffDate.setDate(today.getDate() - 7); // Account for weekends
          data = await getDailyPrices(symbol);
          // Filter to get last 5 trading days
          data = data.slice(0, 5);
          break;
        
        case '1M':
          // Exactly 1 month ago
          cutoffDate.setMonth(today.getMonth() - 1);
          data = await getDailyPrices(symbol);
          // Filter data from last month
          data = data.filter(item => new Date(item.date) >= cutoffDate);
          break;
        
        case '6M':
          // Exactly 6 months ago
          cutoffDate.setMonth(today.getMonth() - 6);
          data = await getDailyPrices(symbol);
          // Filter data from last 6 months
          data = data.filter(item => new Date(item.date) >= cutoffDate);
          break;
        
        case '1Y':
          // Exactly 1 year ago
          cutoffDate.setFullYear(today.getFullYear() - 1);
          data = await getWeeklyPrices(symbol);
          // Filter data from last year
          data = data.filter(item => new Date(item.date) >= cutoffDate);
          break;
        
        case '5Y':
          // Exactly 5 years ago
          cutoffDate.setFullYear(today.getFullYear() - 5);
          data = await getMonthlyPrices(symbol);
          // Filter data from last 5 years
          data = data.filter(item => new Date(item.date) >= cutoffDate);
          break;
        
        case '10Y':
          // Exactly 10 years ago
          cutoffDate.setFullYear(today.getFullYear() - 10);
          data = await getMonthlyPrices(symbol);
          // Filter data from last 10 years
          data = data.filter(item => new Date(item.date) >= cutoffDate);
          break;
        
        case 'MAX':
          // All available monthly data
          data = await getMonthlyPrices(symbol);
          break;
      }
      
      // Apply manual split adjustments
      data = adjustPricesForSplits(data, symbol);
      
      // Calculate period change
      if (data.length > 0) {
        const firstPrice = data[data.length - 1].adjustedClose || data[data.length - 1].close;
        const lastPrice = data[0].adjustedClose || data[0].close;
        const change = lastPrice - firstPrice;
        const percentChange = (change / firstPrice) * 100;
        setPeriodChange({ value: change, percentage: percentChange });
      }
      
      // Format data for chart with smart date labeling
      const formattedData = data.reverse().map((item, index, array) => {
        const price = item.adjustedClose || item.close;
        const prevPrice = index > 0 ? (array[index - 1].adjustedClose || array[index - 1].close) : price;
        const isUp = price >= prevPrice;
        
        return {
          date: formatDateSmart(item.date, range, index, array),
          price: price,
          volume: item.volume || 0,
          volumeColor: isUp ? '#10B981' : '#EF4444', // Green for up, red for down
          originalPrice: item.close,
          isAdjusted: item.isAdjusted || false,
          fullDate: new Date(item.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })
        };
      });
      
      setChartData(formattedData);
    } catch (error) {
      console.error('Chart data error:', error);
      // If 5D fails, try to fall back to daily data
      if (range === '5D') {
        try {
          data = await getDailyPrices(symbol);
          data = data.slice(0, 5);
          data = adjustPricesForSplits(data, symbol);
          
          // Calculate period change for fallback
          if (data.length > 0) {
            const firstPrice = data[data.length - 1].adjustedClose || data[data.length - 1].close;
            const lastPrice = data[0].adjustedClose || data[0].close;
            const change = lastPrice - firstPrice;
            const percentChange = (change / firstPrice) * 100;
            setPeriodChange({ value: change, percentage: percentChange });
          }
          
          const formattedData = data.reverse().map((item, index, array) => {
            const price = item.adjustedClose || item.close;
            const prevPrice = index > 0 ? (array[index - 1].adjustedClose || array[index - 1].close) : price;
            const isUp = price >= prevPrice;
            
            return {
              date: formatDateSmart(item.date, range, index, array),
              price: price,
              volume: item.volume || 0,
              volumeColor: isUp ? '#10B981' : '#EF4444',
              originalPrice: item.close,
              isAdjusted: item.isAdjusted || false,
              fullDate: new Date(item.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })
            };
          });
          setChartData(formattedData);
        } catch (fallbackError) {
          console.error('Fallback failed:', fallbackError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Smart date formatting to avoid repetition
  const formatDateSmart = (dateStr: string, range: TimeRange, index: number, array: any[]) => {
    const date = new Date(dateStr);
    
    if (range === '5D') {
      // 5 days: Show abbreviated month and day
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } 
    else if (range === '1M') {
      // 1 month: Show day number only, with month at start
      if (index === 0 || date.getDate() === 1) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return date.getDate().toString();
    }
    else if (range === '6M') {
      // 6 months: Show month name only
      return date.toLocaleDateString('en-US', { month: 'short' });
    } 
    else if (range === '1Y') {
      // 1 year: Show month name, with year at start/end
      if (index === 0 || index === array.length - 1) {
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      return date.toLocaleDateString('en-US', { month: 'short' });
    } 
    else if (range === '5Y') {
      // 5 years: Show year only
      return date.getFullYear().toString();
    }
    else if (range === '10Y') {
      // 10 years: Show year only
      return date.getFullYear().toString();
    }
    else {
      // MAX: Show year only
      return date.getFullYear().toString();
    }
  };

  const timeRanges: TimeRange[] = ['5D', '1M', '6M', '1Y', '5Y', '10Y', 'MAX'];

  // Enhanced tooltip - removed volume display
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded p-2 text-sm">
          <p className="text-gray-400">{data.fullDate}</p>
          <p className="text-green-400 font-semibold">
            ${typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : '0.00'}
          </p>
          {data.isAdjusted && (
            <p className="text-yellow-400 text-xs mt-1">Split-adjusted</p>
          )}
        </div>
      );
    }
    return null;
  };

  const hasSplits = STOCK_SPLITS[symbol.toUpperCase()] && STOCK_SPLITS[symbol.toUpperCase()].length > 0;

  // Custom bar shape for volume
  const VolumeBar = (props: any) => {
    const { fill, x, y, width, height } = props;
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={props.payload.volumeColor}
        opacity={0.5}
      />
    );
  };

  // Calculate Y-axis domain with padding
  const getYDomain = () => {
    if (chartData.length === 0) return ['auto', 'auto'];
    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1; // 10% padding
    return [minPrice - padding, maxPrice + padding];
  };

  // Format volume for Y-axis
  const formatVolume = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  return (
    <div>
      {/* Header with period change and time range controls */}
      <div className="flex justify-between items-center mb-4">
        {/* Period change display */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">{selectedRange} Change:</span>
          <span className={`font-semibold ${periodChange.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {periodChange.value >= 0 ? '+' : ''}{periodChange.value.toFixed(2)} ({periodChange.percentage >= 0 ? '+' : ''}{periodChange.percentage.toFixed(2)}%)
          </span>
        </div>

        {/* Time range buttons */}
        <div className="flex gap-1 sm:gap-2 overflow-x-auto">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm transition whitespace-nowrap ${
                selectedRange === range
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Info banner about adjusted prices */}
      {hasSplits && (
        <div className="mb-4 p-2 bg-blue-900/20 border border-blue-900/50 rounded text-xs text-blue-400">
          ℹ️ Historical prices are adjusted for stock splits
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[400px] text-gray-400">
          No data available for this time range
        </div>
      ) : (
        <>
          {/* Chart with fixed height */}
          <div className="-ml-4 mr-2">
            <ResponsiveContainer width="100%" height={400}> {/* Fixed height of 400px */}
              <ComposedChart 
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  interval={selectedRange === '5Y' || selectedRange === '10Y' || selectedRange === 'MAX' ? 
                    Math.floor(chartData.length / 8) : 'preserveStartEnd'}
                  minTickGap={20}
                />
                
                {/* Price Y-axis (left) */}
                <YAxis 
                  yAxisId="price"
                  orientation="left"
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  domain={getYDomain()}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                
                {/* Volume Y-axis (right) - only show if volume is enabled */}
                {showVolume && (
                  <YAxis 
                    yAxisId="volume"
                    orientation="right"
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    tickFormatter={formatVolume}
                  />
                )}
                
                <Tooltip 
                  content={<CustomTooltip />}
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '0.5rem'
                  }}
                />
                
                {/* Volume bars */}
                {showVolume && (
                  <Bar 
                    yAxisId="volume"
                    dataKey="volume" 
                    shape={VolumeBar}
                    opacity={0.3}
                  />
                )}
                
                {/* Price line */}
                <Line 
                  yAxisId="price"
                  type="monotone" 
                  dataKey="price" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Beautiful Volume Toggle Button - Centered below chart */}
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`
                relative flex items-center gap-2 px-5 py-2.5 rounded-full
                font-medium text-sm transition-all duration-300 transform hover:scale-105
                ${showVolume 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                }
              `}
            >
              {/* Icon */}
              <svg 
                className={`w-4 h-4 transition-transform duration-300 ${showVolume ? 'scale-110' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <rect x="3" y="13" width="4" height="8" strokeWidth="2" rx="1" />
                <rect x="10" y="9" width="4" height="12" strokeWidth="2" rx="1" />
                <rect x="17" y="5" width="4" height="16" strokeWidth="2" rx="1" />
              </svg>
              
              {/* Label */}
              <span>Volume</span>
              
              {/* Status indicator */}
              <span className={`
                ml-1 px-2 py-0.5 rounded-full text-xs font-semibold
                ${showVolume 
                  ? 'bg-white/20 text-white' 
                  : 'bg-gray-700 text-gray-500'
                }
              `}>
                {showVolume ? 'ON' : 'OFF'}
              </span>
              
              {/* Animated glow effect when on */}
              {showVolume && (
                <span className="absolute inset-0 rounded-full bg-green-400/20 blur-xl animate-pulse"></span>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default StockChartAdvanced;
