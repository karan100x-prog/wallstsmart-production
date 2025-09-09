import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart } from 'recharts';
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
    const adjustedVolume = volume * adjustmentFactor;

    return {
      ...item,
      close: closePrice,
      adjustedClose: adjustedPrice,
      volume: volume,
      adjustedVolume: adjustedVolume,
      adjustmentFactor: adjustmentFactor,
      isAdjusted: adjustmentFactor > 1
    };
  });
}

const StockChartAdvanced: React.FC<StockChartAdvancedProps> = ({ symbol }) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1M');
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVolume, setShowVolume] = useState(true);

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
      
      // Calculate max volume for scaling
      const maxVolume = Math.max(...data.map(item => item.adjustedVolume || item.volume || 0));
      
      // Format data for chart with smart date labeling
      const formattedData = data.reverse().map((item, index, array) => ({
        date: formatDateSmart(item.date, range, index, array),
        price: item.adjustedClose || item.close,
        volume: item.adjustedVolume || item.volume || 0,
        volumeScaled: ((item.adjustedVolume || item.volume || 0) / maxVolume) * 100, // Scale to percentage
        originalPrice: item.close,
        isAdjusted: item.isAdjusted || false,
        fullDate: new Date(item.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        })
      }));
      
      setChartData(formattedData);
    } catch (error) {
      console.error('Chart data error:', error);
      // If 5D fails, try to fall back to daily data
      if (range === '5D') {
        try {
          data = await getDailyPrices(symbol);
          data = data.slice(0, 5);
          data = adjustPricesForSplits(data, symbol);
          const maxVolume = Math.max(...data.map(item => item.adjustedVolume || item.volume || 0));
          const formattedData = data.reverse().map((item, index, array) => ({
            date: formatDateSmart(item.date, range, index, array),
            price: item.adjustedClose || item.close,
            volume: item.adjustedVolume || item.volume || 0,
            volumeScaled: ((item.adjustedVolume || item.volume || 0) / maxVolume) * 100,
            originalPrice: item.close,
            isAdjusted: item.isAdjusted || false,
            fullDate: new Date(item.date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })
          }));
          setChartData(formattedData);
        } catch (fallbackError) {
          console.error('Fallback failed:', fallbackError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Smart date formatting to show labels at period starts
  const formatDateSmart = (dateStr: string, range: TimeRange, index: number, array: any[]) => {
    const date = new Date(dateStr);
    const prevDate = index > 0 ? new Date(array[index - 1].date) : null;
    
    if (range === '5D') {
      // 5 days: Show abbreviated month and day for all points
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } 
    else if (range === '1M') {
      // 1 month: Show label only on the 1st of month or first/last data point
      if (index === 0 || index === array.length - 1 || date.getDate() === 1) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return '';
    }
    else if (range === '6M') {
      // 6 months: Show month name only on the 1st of each month
      if (date.getDate() === 1 || index === 0 || index === array.length - 1) {
        return date.toLocaleDateString('en-US', { month: 'short' });
      }
      return '';
    } 
    else if (range === '1Y') {
      // 1 year: Show month on 1st of each month, with year at start/end
      if (date.getDate() <= 7) { // Within first week of month (for weekly data)
        if (index === 0 || index === array.length - 1 || date.getMonth() === 0) {
          return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }
        return date.toLocaleDateString('en-US', { month: 'short' });
      }
      return '';
    } 
    else if (range === '5Y' || range === '10Y' || range === 'MAX') {
      // For multi-year views: Show year only on January or when year changes
      if (date.getMonth() === 0 || (prevDate && date.getFullYear() !== prevDate.getFullYear()) || index === 0) {
        return date.getFullYear().toString();
      }
      return '';
    }
    else {
      return '';
    }
  };

  const timeRanges: TimeRange[] = ['5D', '1M', '6M', '1Y', '5Y', '10Y', 'MAX'];

  // Enhanced tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded p-2 text-sm">
          <p className="text-gray-400">{data.fullDate}</p>
          <p className="text-green-400 font-semibold">
            ${typeof data.price === 'number' ? data.price.toFixed(2) : '0.00'}
          </p>
          {showVolume && (
            <p className="text-gray-300 text-xs mt-1">
              Vol: {(data.volume / 1000000).toFixed(2)}M
            </p>
          )}
          {data.isAdjusted && (
            <p className="text-yellow-400 text-xs mt-1">Split-adjusted</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Format volume for Y-axis
  const formatVolume = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const hasSplits = STOCK_SPLITS[symbol.toUpperCase()] && STOCK_SPLITS[symbol.toUpperCase()].length > 0;

  return (
    <div className="w-full">
      {/* Time range selector */}
      <div className="flex justify-end items-center mb-4">
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

      {/* Chart Container - Full width, no padding */}
      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[400px] text-gray-400">
          No data available for this time range
        </div>
      ) : (
        <div className="w-full -ml-8"> {/* Negative margin to align left */}
          <ResponsiveContainer width="100%" height={showVolume ? 400 : 300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                interval={0}
                minTickGap={20}
              />
              
              {/* Price Y-Axis (left) */}
              <YAxis 
                yAxisId="price"
                orientation="left"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                domain={['dataMin * 0.95', 'dataMax * 1.05']}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              
              {/* Volume Y-Axis (right) - only show if volume is enabled */}
              {showVolume && (
                <YAxis 
                  yAxisId="volume"
                  orientation="right"
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  domain={[0, 'dataMax']}
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
              
              {/* Volume Bars - show only if enabled */}
              {showVolume && (
                <Bar 
                  yAxisId="volume"
                  dataKey="volume" 
                  fill="#4B5563"
                  opacity={0.3}
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
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Volume Toggle Switch */}
      <div className="flex items-center justify-center mt-4 gap-2">
        <span className="text-sm text-gray-400">Volume</span>
        <button
          onClick={() => setShowVolume(!showVolume)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            showVolume ? 'bg-green-600' : 'bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              showVolume ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default StockChartAdvanced;
