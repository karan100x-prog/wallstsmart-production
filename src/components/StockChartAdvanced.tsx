import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getIntradayPrices, getDailyPrices, getWeeklyPrices, getMonthlyPrices } from '../services/alphaVantage';

interface StockChartAdvancedProps {
  symbol: string;
}

type TimeRange = '7D' | '1M' | '6M' | '1Y' | '3Y' | '5Y' | '10Y' | 'MAX';

// Stock split data for major companies
const STOCK_SPLITS: Record<string, Array<{date: string, ratio: number}>> = {
  'NVDA': [
    { date: '2024-06-10', ratio: 10 },  // 10-for-1 split
    { date: '2021-07-20', ratio: 4 },   // 4-for-1 split
    { date: '2007-09-11', ratio: 1.5 }, // 3-for-2 split
    { date: '2006-04-07', ratio: 2 },   // 2-for-1 split
    { date: '2001-09-17', ratio: 2 },   // 2-for-1 split
    { date: '2000-06-27', ratio: 2 },   // 2-for-1 split
  ],
  'AAPL': [
    { date: '2020-08-31', ratio: 4 },   // 4-for-1 split
    { date: '2014-06-09', ratio: 7 },   // 7-for-1 split
    { date: '2005-02-28', ratio: 2 },   // 2-for-1 split
    { date: '2000-06-21', ratio: 2 },   // 2-for-1 split
    { date: '1987-06-16', ratio: 2 },   // 2-for-1 split
  ],
  'TSLA': [
    { date: '2022-08-25', ratio: 3 },   // 3-for-1 split
    { date: '2020-08-31', ratio: 5 },   // 5-for-1 split
  ],
  'AMZN': [
    { date: '2022-06-06', ratio: 20 },  // 20-for-1 split
    { date: '1999-09-02', ratio: 2 },   // 2-for-1 split
    { date: '1999-01-05', ratio: 3 },   // 3-for-1 split
    { date: '1998-06-02', ratio: 2 },   // 2-for-1 split
  ],
  'GOOGL': [
    { date: '2022-07-18', ratio: 20 },  // 20-for-1 split
    { date: '2014-04-03', ratio: 2 },   // 2-for-1 split
  ],
  'GOOG': [
    { date: '2022-07-18', ratio: 20 },  // 20-for-1 split
    { date: '2014-04-03', ratio: 2 },   // 2-for-1 split
  ],
  'MSFT': [
    { date: '2003-02-18', ratio: 2 },   // 2-for-1 split
    { date: '1999-03-29', ratio: 2 },   // 2-for-1 split
    { date: '1998-02-23', ratio: 2 },   // 2-for-1 split
    { date: '1996-12-09', ratio: 2 },   // 2-for-1 split
  ],
  'META': [
    // No splits for META/Facebook
  ],
  'NFLX': [
    { date: '2015-07-15', ratio: 7 },   // 7-for-1 split
    { date: '2004-02-12', ratio: 2 },   // 2-for-1 split
  ]
};

// Function to manually adjust prices for splits
function adjustPricesForSplits(data: any[], symbol: string): any[] {
  const splits = STOCK_SPLITS[symbol.toUpperCase()];
  
  // If no splits defined, return original data
  if (!splits || splits.length === 0) {
    return data;
  }

  console.log(`Adjusting splits for ${symbol}`, splits);

  return data.map((item, index) => {
    const itemDate = new Date(item.date);
    let adjustmentFactor = 1;

    // Calculate cumulative adjustment factor for all splits after this date
    for (const split of splits) {
      const splitDate = new Date(split.date);
      if (splitDate > itemDate) {
        adjustmentFactor *= split.ratio;
      }
    }

    // Always use close price and manually adjust it
    const closePrice = parseFloat(item.close) || 0;
    const adjustedPrice = closePrice / adjustmentFactor;

    // Log first few adjustments for debugging
    if (index < 3 && adjustmentFactor > 1) {
      console.log(`Date: ${item.date}, Close: ${closePrice}, Factor: ${adjustmentFactor}, Adjusted: ${adjustedPrice}`);
    }

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
      switch (range) {
        case '7D':
          // Use intraday data for 7 days
          data = await getIntradayPrices(symbol, '30min');
          data = data.slice(0, 56); // 7 days * 8 data points per day
          break;
        
        case '1M':
          // Daily data for 1 month
          data = await getDailyPrices(symbol);
          data = data.slice(0, 30);
          break;
        
        case '6M':
          // Daily data for 6 months
          data = await getDailyPrices(symbol);
          data = data.slice(0, 180);
          break;
        
        case '1Y':
          // Weekly data for 1 year
          data = await getWeeklyPrices(symbol);
          data = data.slice(0, 52);
          break;
        
        case '3Y':
          // Weekly data for 3 years
          data = await getWeeklyPrices(symbol);
          data = data.slice(0, 156);
          break;
        
        case '5Y':
          // Monthly data for 5 years
          data = await getMonthlyPrices(symbol);
          data = data.slice(0, 60);
          break;
        
        case '10Y':
          // Monthly data for 10 years
          data = await getMonthlyPrices(symbol);
          data = data.slice(0, 120);
          break;
        
        case 'MAX':
          // All available monthly data
          data = await getMonthlyPrices(symbol);
          break;
      }
      
      // Apply manual split adjustments - CRITICAL FIX
      data = adjustPricesForSplits(data, symbol);
      
      // Format data for chart - use the adjusted price we calculated
      const formattedData = data.reverse().map((item) => ({
        date: formatDate(item.date, range),
        price: item.adjustedClose, // Use our manually calculated adjusted price
        originalPrice: item.close,
        isAdjusted: item.isAdjusted || false
      }));
      
      setChartData(formattedData);
    } catch (error) {
      console.error('Chart data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string, range: TimeRange) => {
    const date = new Date(dateStr);
    
    if (range === '7D' || range === '1M') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (range === '6M' || range === '1Y') {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { year: 'numeric' });
    }
  };

  const timeRanges: TimeRange[] = ['7D', '1M', '6M', '1Y', '3Y', '5Y', '10Y', 'MAX'];

  // Enhanced tooltip to show split adjustment info
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded p-2 text-sm">
          <p className="text-gray-400">{label}</p>
          <p className="text-green-400 font-semibold">
            ${typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : '0.00'}
          </p>
          {data.isAdjusted && (
            <p className="text-yellow-400 text-xs mt-1">
              Split-adjusted
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Show split info for known stocks
  const hasSplits = STOCK_SPLITS[symbol.toUpperCase()] && STOCK_SPLITS[symbol.toUpperCase()].length > 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Price Chart</h2>
        <div className="flex gap-2">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-3 py-1 rounded transition ${
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
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <YAxis 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              domain={['dataMin * 0.95', 'dataMax * 1.05']}
            />
            <Tooltip 
              content={<CustomTooltip />}
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '0.5rem'
              }}
              labelStyle={{ color: '#9CA3AF' }}
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
