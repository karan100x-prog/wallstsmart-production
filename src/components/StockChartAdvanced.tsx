import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDailyPrices, getWeeklyPrices, getMonthlyPrices } from '../services/alphaVantage';

interface StockChartAdvancedProps {
  symbol: string;
}

type TimeRange = '5D' | '1M' | '6M' | '1Y' | '3Y' | '5Y' | '10Y' | 'MAX';

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

    return {
      ...item,
      close: closePrice,
      adjustedClose: adjustedPrice,
      adjustmentFactor: adjustmentFactor,
      isAdjusted: adjustmentFactor > 1
    };
  });
}

const StockChartAdvanced: React.FC<StockChartAdvancedProps> = ({ symbol }) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1M');
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
        
        case '3Y':
          // Exactly 3 years ago
          cutoffDate.setFullYear(today.getFullYear() - 3);
          data = await getWeeklyPrices(symbol);
          // Filter data from last 3 years
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
      
      // Format data for chart with smart date labeling
      const formattedData = data.reverse().map((item, index, array) => ({
        date: formatDateSmart(item.date, range, index, array),
        price: item.adjustedClose || item.close,
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
          const formattedData = data.reverse().map((item, index, array) => ({
            date: formatDateSmart(item.date, range, index, array),
            price: item.adjustedClose || item.close,
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

  // Smart date formatting to avoid repetition
  const formatDateSmart = (dateStr: string, range: TimeRange, index: number, array: any[]) => {
    const date = new Date(dateStr);
    const prevDate = index > 0 ? new Date(array[index - 1].date) : null;
    
    if (range === '5D' || range === '1M') {
      // For short ranges, show month and day
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      
      // Only show month if it's different from previous or first item
      if (!prevDate || date.getMonth() !== prevDate.getMonth() || index === 0) {
        return `${month} ${day}`;
      }
      return `${day}`;
    } 
    else if (range === '6M' || range === '1Y') {
      // For medium ranges, show month and year sparingly
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      
      // Show year only at the beginning and when it changes
      if (!prevDate || date.getFullYear() !== prevDate.getFullYear() || index === 0) {
        return `${month} '${year}`;
      }
      // Show month only every 3rd label to reduce clutter
      if (index % 3 === 0) {
        return month;
      }
      return '';
    } 
    else if (range === '3Y' || range === '5Y') {
      // For 3-5 year ranges, show Q1, Q2, Q3, Q4 with year
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const year = date.getFullYear();
      
      // Only show year when it changes or at start
      if (!prevDate || date.getFullYear() !== prevDate.getFullYear() || index === 0) {
        return `Q${quarter} ${year}`;
      }
      // Show quarter every other label
      if (index % 2 === 0) {
        return `Q${quarter}`;
      }
      return '';
    }
    else {
      // For 10Y and MAX, only show years
      const year = date.getFullYear();
      
      // Show year only when it changes or at regular intervals
      if (!prevDate || date.getFullYear() !== prevDate.getFullYear() || index % 12 === 0) {
        return year.toString();
      }
      return '';
    }
  };

  const timeRanges: TimeRange[] = ['5D', '1M', '6M', '1Y', '3Y', '5Y', '10Y', 'MAX'];

  // Enhanced tooltip
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

  return (
    <div>
      {/* Removed "Price Chart" header - cleaner look */}
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

      {loading ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-gray-400">
          No data available for this time range
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              interval={selectedRange === '5Y' || selectedRange === '10Y' || selectedRange === 'MAX' ? 
                Math.floor(chartData.length / 8) : 'preserveStartEnd'}
              minTickGap={20}
            />
            <YAxis 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              domain={['dataMin * 0.95', 'dataMax * 1.05']}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip 
              content={<CustomTooltip />}
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '0.5rem'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#10B981" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default StockChartAdvanced;
