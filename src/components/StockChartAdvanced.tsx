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
  Legend 
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
    const volume = parseFloat(item.volume) || 0;
    const adjustedPrice = closePrice / adjustmentFactor;
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

// Format volume with K/M/B suffixes
const formatVolume = (value: number): string => {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  return value.toString();
};

const StockChartAdvanced: React.FC<StockChartAdvancedProps> = ({ symbol }) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1Y');
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth ="100%");
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadChartData(selectedRange);
  }, [symbol, selectedRange]);

  const loadChartData = async (range: TimeRange) => {
    setLoading(true);
    let data: any[] = [];
    
    try {
      const today = new Date();
      let cutoffDate = new Date();
      
      switch (range) {
        case '5D':
          cutoffDate.setDate(today.getDate() - 7);
          data = await getDailyPrices(symbol);
          data = data.slice(0, 5);
          break;
        
        case '1M':
          cutoffDate.setMonth(today.getMonth() - 1);
          data = await getDailyPrices(symbol);
          data = data.filter(item => new Date(item.date) >= cutoffDate);
          break;
        
        case '6M':
          cutoffDate.setMonth(today.getMonth() - 6);
          data = await getDailyPrices(symbol);
          data = data.filter(item => new Date(item.date) >= cutoffDate);
          break;
        
        case '1Y':
          cutoffDate.setFullYear(today.getFullYear() - 1);
          data = await getWeeklyPrices(symbol);
          data = data.filter(item => new Date(item.date) >= cutoffDate);
          break;
        
        case '5Y':
          cutoffDate.setFullYear(today.getFullYear() - 5);
          data = await getMonthlyPrices(symbol);
          data = data.filter(item => new Date(item.date) >= cutoffDate);
          break;
        
        case '10Y':
          cutoffDate.setFullYear(today.getFullYear() - 10);
          data = await getMonthlyPrices(symbol);
          data = data.filter(item => new Date(item.date) >= cutoffDate);
          break;
        
        case 'MAX':
          data = await getMonthlyPrices(symbol);
          break;
      }
      
      data = adjustPricesForSplits(data, symbol);
      
      const formattedData = data.reverse().map((item, index, array) => ({
        date: formatDateSmart(item.date, range, index, array),
        price: item.adjustedClose || item.close,
        volume: item.adjustedVolume || item.volume || 0,
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
      if (range === '5D') {
        try {
          data = await getDailyPrices(symbol);
          data = data.slice(0, 5);
          data = adjustPricesForSplits(data, symbol);
          const formattedData = data.reverse().map((item, index, array) => ({
            date: formatDateSmart(item.date, range, index, array),
            price: item.adjustedClose || item.close,
            volume: item.adjustedVolume || item.volume || 0,
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

  const formatDateSmart = (dateStr: string, range: TimeRange, index: number, array: any[]) => {
    const date = new Date(dateStr);
    
    // Simplified date formatting for mobile
    if (isMobile) {
      if (range === '5D' || range === '1M') {
        // Show fewer labels on mobile
        if (index % 2 === 0 || index === 0 || index === array.length - 1) {
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        return '';
      } else if (range === '6M' || range === '1Y') {
        // Show only month for these ranges on mobile
        if (index % 3 === 0 || index === 0 || index === array.length - 1) {
          return date.toLocaleDateString('en-US', { month: 'short' });
        }
        return '';
      } else {
        // Show only year for longer ranges
        if (index % 4 === 0 || index === 0 || index === array.length - 1) {
          return date.getFullYear().toString();
        }
        return '';
      }
    }
    
    // Desktop formatting (unchanged)
    if (range === '5D') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } 
    else if (range === '1M') {
      if (index === 0 || date.getDate() === 1) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return date.getDate().toString();
    }
    else if (range === '6M') {
      return date.toLocaleDateString('en-US', { month: 'short' });
    } 
    else if (range === '1Y') {
      if (index === 0 || index === array.length - 1) {
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      return date.toLocaleDateString('en-US', { month: 'short' });
    } 
    else if (range === '5Y') {
      return date.getFullYear().toString();
    }
    else if (range === '10Y') {
      return date.getFullYear().toString();
    }
    else {
      return date.getFullYear().toString();
    }
  };

  const timeRanges: TimeRange[] = ['5D', '1M', '6M', '1Y', '5Y', '10Y', 'MAX'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded p-2 text-sm">
          <p className="text-gray-400">{data.fullDate}</p>
          <p className="text-green-400 font-semibold">
            ${typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : '0.00'}
          </p>
          {showVolume && data.volume && (
            <p className="text-blue-400">
              Vol: {formatVolume(data.volume)}
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

  const hasSplits = STOCK_SPLITS[symbol.toUpperCase()] && STOCK_SPLITS[symbol.toUpperCase()].length > 0;

  // Mobile-specific chart margins
  const chartMargins = isMobile 
    ? { top: 5, right: 45, bottom: 30, left: showVolume ? 40 : 5 }  // Space for axes on mobile
    : { top: 5, right: 55, bottom: 30, left: 50 }; // Default margins for desktop

  return (
    <div>
      {/* Time Range Buttons at the top */}
      <div className="flex justify-end items-center mb-4">
        <div className={`flex gap-1 ${isMobile ? 'w-full' : 'sm:gap-2'} overflow-x-auto`}>
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`${
                isMobile ? 'flex-1 px-1' : 'px-2 sm:px-3'
              } py-1 rounded text-xs sm:text-sm transition whitespace-nowrap ${
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
          <div className={isMobile ? '' : '-ml-8'}>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={chartMargins}>
                {/* Conditional grid for mobile */}
                {!isMobile && (
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                )}
                
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: isMobile ? 10 : 11 }}
                  interval={isMobile ? 'preserveStartEnd' : (
                    selectedRange === '5Y' || selectedRange === '10Y' || selectedRange === 'MAX' ? 
                    Math.floor(chartData.length / 8) : 'preserveStartEnd'
                  )}
                  minTickGap={isMobile ? 10 : 20}
                  angle={isMobile && (selectedRange === '5D' || selectedRange === '1M') ? -45 : 0}
                  textAnchor={isMobile && (selectedRange === '5D' || selectedRange === '1M') ? 'end' : 'middle'}
                  height={isMobile ? 40 : 30}
                />
                
                {/* Volume Y-Axis - Always rendered but conditionally styled */}
                <YAxis 
                  yAxisId="volume"
                  orientation="left"
                  stroke={showVolume ? "#60A5FA" : "transparent"}
                  tick={{ 
                    fill: showVolume ? '#60A5FA' : 'transparent', 
                    fontSize: isMobile ? 9 : 11 
                  }}
                  tickFormatter={formatVolume}
                  domain={[0, 'dataMax * 1.2']}
                  axisLine={{ stroke: showVolume ? "#60A5FA" : "transparent" }}
                  tickLine={{ stroke: showVolume ? "#60A5FA" : "transparent" }}
                  width={isMobile ? (showVolume ? 35 : 0) : 45}
                />
                
                {/* Price Y-Axis - Always visible but optimized for mobile */}
                <YAxis 
                  yAxisId="price"
                  orientation="right"
                  stroke="#9CA3AF"
                  tick={{ 
                    fill: '#9CA3AF', 
                    fontSize: isMobile ? 9 : 11 
                  }}
                  domain={['dataMin * 0.95', 'dataMax * 1.05']}
                  tickFormatter={(value) => `${value.toFixed(0)}`}
                  width={isMobile ? 40 : 50}
                />
                
                <Tooltip 
                  content={<CustomTooltip />}
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '0.5rem'
                  }}
                  position={isMobile ? { y: 0 } : undefined}
                />
                
                {/* Volume Bars - Only rendered when showVolume is true */}
                {showVolume && (
                  <Bar 
                    yAxisId="volume"
                    dataKey="volume" 
                    fill="#60A5FA"
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
                  activeDot={{ r: isMobile ? 4 : 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Volume Toggle at the bottom */}
          <div className="flex justify-center mt-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showVolume}
                onChange={(e) => setShowVolume(e.target.checked)}
                className="sr-only"
              />
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showVolume ? 'bg-green-600' : 'bg-gray-600'
              }`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showVolume ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
              <span className="ml-2 text-sm text-gray-400">Volume</span>
            </label>
          </div>
        </>
      )}
    </div>
  );
};

export default StockChartAdvanced;
