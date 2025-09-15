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

// Calculate Simple Moving Average
function calculateSMA(data: any[], period: number): any[] {
  return data.map((item, index) => {
    if (index < period - 1) {
      return { ...item, [`sma${period}`]: null };
    }
    
    const sum = data
      .slice(index - period + 1, index + 1)
      .reduce((acc, curr) => acc + (curr.price || 0), 0);
    
    return {
      ...item,
      [`sma${period}`]: sum / period
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
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1Y'); // Changed default to 1Y
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVolume, setShowVolume] = useState(true); // Volume toggle state (default ON)
  const [showSMA50, setShowSMA50] = useState(false); // SMA 50 toggle (default OFF)
  const [showSMA200, setShowSMA200] = useState(false); // SMA 200 toggle (default OFF)

  useEffect(() => {
    loadChartData(selectedRange);
  }, [symbol, selectedRange, showSMA50, showSMA200]);

  const loadChartData = async (range: TimeRange) => {
    setLoading(true);
    let data: any[] = [];
    
    try {
      // Always fetch enough data for SMA calculations
      // We need at least 200 extra data points for SMA 200
      const today = new Date();
      let cutoffDate = new Date();
      
      switch (range) {
        case '5D':
          // For 5D, always get at least 205 days of data for SMA calculations
          data = await getDailyPrices(symbol);
          // Get the most recent 205 data points (5 display + 200 for SMA)
          data = data.slice(0, 205);
          break;
        
        case '1M':
          // For 1M, get at least 230 days (30 days + 200 for SMA)
          data = await getDailyPrices(symbol);
          data = data.slice(0, 250);
          break;
        
        case '6M':
          // For 6M, get at least 380 days (180 days + 200 for SMA)
          data = await getDailyPrices(symbol);
          data = data.slice(0, 400);
          break;
        
        case '1Y':
          // For 1Y, get at least 565 days (365 days + 200 for SMA)
          data = await getDailyPrices(symbol);
          // Alpha Vantage returns up to 20 years of data, so we should have enough
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(today.getFullYear() - 1);
          oneYearAgo.setDate(oneYearAgo.getDate() - 200); // Extra 200 days for SMA
          data = data.filter(item => new Date(item.date) >= oneYearAgo);
          break;
        
        case '5Y':
          // For 5Y, get all available daily data
          data = await getDailyPrices(symbol);
          const fiveYearsAgo = new Date();
          fiveYearsAgo.setFullYear(today.getFullYear() - 5);
          fiveYearsAgo.setDate(fiveYearsAgo.getDate() - 200); // Extra 200 days for SMA
          data = data.filter(item => new Date(item.date) >= fiveYearsAgo);
          break;
        
        case '10Y':
          // For 10Y, get all available daily data
          data = await getDailyPrices(symbol);
          const tenYearsAgo = new Date();
          tenYearsAgo.setFullYear(today.getFullYear() - 10);
          tenYearsAgo.setDate(tenYearsAgo.getDate() - 200); // Extra 200 days for SMA
          data = data.filter(item => new Date(item.date) >= tenYearsAgo);
          break;
        
        case 'MAX':
          // Get all available data
          data = await getDailyPrices(symbol);
          break;
      }
      
      // Apply manual split adjustments
      data = adjustPricesForSplits(data, symbol);
      
      // Reverse data so it's in chronological order (oldest to newest)
      data = data.reverse();
      
      // Format all data first
      let formattedData = data.map((item, index, array) => ({
        date: item.date,
        price: item.adjustedClose || item.close,
        volume: item.adjustedVolume || item.volume || 0,
        originalPrice: item.close,
        isAdjusted: item.isAdjusted || false,
        fullDate: new Date(item.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        rawDate: item.date
      }));
      
      // Calculate SMAs on the full dataset
      if (showSMA50) {
        formattedData = calculateSMA(formattedData, 50);
      }
      if (showSMA200) {
        formattedData = calculateSMA(formattedData, 200);
      }
      
      // Now filter to show only the requested range for display
      const now = new Date();
      let displayCutoff = new Date();
      
      switch (range) {
        case '5D':
          // Show only last 5 trading days
          formattedData = formattedData.slice(-5);
          break;
        
        case '1M':
          displayCutoff.setMonth(now.getMonth() - 1);
          formattedData = formattedData.filter(item => new Date(item.rawDate) >= displayCutoff);
          break;
        
        case '6M':
          displayCutoff.setMonth(now.getMonth() - 6);
          formattedData = formattedData.filter(item => new Date(item.rawDate) >= displayCutoff);
          break;
        
        case '1Y':
          displayCutoff.setFullYear(now.getFullYear() - 1);
          formattedData = formattedData.filter(item => new Date(item.rawDate) >= displayCutoff);
          break;
        
        case '5Y':
          displayCutoff.setFullYear(now.getFullYear() - 5);
          formattedData = formattedData.filter(item => new Date(item.rawDate) >= displayCutoff);
          break;
        
        case '10Y':
          displayCutoff.setFullYear(now.getFullYear() - 10);
          formattedData = formattedData.filter(item => new Date(item.rawDate) >= displayCutoff);
          break;
        
        case 'MAX':
          // Show all data
          break;
      }
      
      // Apply date formatting for display
      formattedData = formattedData.map((item, index, array) => ({
        ...item,
        date: formatDateSmart(item.date, range, index, array)
      }));
      
      setChartData(formattedData);
    } catch (error) {
      console.error('Chart data error:', error);
      setChartData([]);
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

  // Enhanced tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      const priceData = payload.find((p: any) => p.dataKey === 'price');
      const sma50Data = payload.find((p: any) => p.dataKey === 'sma50');
      const sma200Data = payload.find((p: any) => p.dataKey === 'sma200');
      
      return (
        <div className="bg-gray-900 border border-gray-700 rounded p-2 text-sm">
          <p className="text-gray-400">{data.fullDate}</p>
          <p className="text-green-400 font-semibold">
            ${priceData?.value ? priceData.value.toFixed(2) : '0.00'}
          </p>
          {showSMA50 && sma50Data?.value && (
            <p className="text-yellow-300">
              SMA50: ${sma50Data.value.toFixed(2)}
            </p>
          )}
          {showSMA200 && sma200Data?.value && (
            <p className="text-orange-400">
              SMA200: ${sma200Data.value.toFixed(2)}
            </p>
          )}
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

  // Toggle component for reusability
  const ToggleSwitch = ({ checked, onChange, label, color = 'green' }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    color?: string;
  }) => {
    // Map color names to Tailwind classes (avoiding dynamic class generation)
    const getColorClass = (isChecked: boolean, colorName: string) => {
      if (!isChecked) return 'bg-gray-600';
      switch(colorName) {
        case 'yellow': return 'bg-yellow-500';
        case 'orange': return 'bg-orange-500';
        case 'green': return 'bg-green-600';
        default: return 'bg-green-600';
      }
    };

    return (
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          getColorClass(checked, color)
        }`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </div>
        <span className="ml-2 text-sm text-gray-400">{label}</span>
      </label>
    );
  };

  return (
    <div>
      <div className="flex justify-end items-center mb-4">
        {/* Time Range Buttons */}
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
          <div className="-ml-8">
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  interval={selectedRange === '5Y' || selectedRange === '10Y' || selectedRange === 'MAX' ? 
                    Math.floor(chartData.length / 8) : 'preserveStartEnd'}
                  minTickGap={20}
                />
                
                {/* Volume Y-Axis on the LEFT */}
                {showVolume && (
                  <YAxis 
                    yAxisId="volume"
                    orientation="left"
                    stroke="#60A5FA"
                    tick={{ fill: '#60A5FA', fontSize: 11 }}
                    tickFormatter={formatVolume}
                    domain={[0, 'dataMax * 1.2']}
                  />
                )}
                
                {/* Price Y-Axis on the RIGHT */}
                <YAxis 
                  yAxisId="price"
                  orientation="right"
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
                
                {/* Volume Bars */}
                {showVolume && (
                  <Bar 
                    yAxisId="volume"
                    dataKey="volume" 
                    fill="#60A5FA"
                    opacity={0.3}
                  />
                )}
                
                {/* SMA 50 Line */}
                {showSMA50 && (
                  <Line 
                    yAxisId="price"
                    type="monotone" 
                    dataKey="sma50" 
                    stroke="#FDE047" // Light yellow
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={false}
                  />
                )}
                
                {/* SMA 200 Line */}
                {showSMA200 && (
                  <Line 
                    yAxisId="price"
                    type="monotone" 
                    dataKey="sma200" 
                    stroke="#FB923C" // Orange
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={false}
                  />
                )}
                
                {/* Price Line - render last to be on top */}
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

          {/* All Toggles - Center Aligned Below Chart */}
          <div className="flex justify-center items-center gap-6 mt-4 flex-wrap">
            <ToggleSwitch 
              checked={showVolume}
              onChange={setShowVolume}
              label="Volume"
              color="green"
            />
            <ToggleSwitch 
              checked={showSMA50}
              onChange={setShowSMA50}
              label="SMA 50"
              color="yellow"
            />
            <ToggleSwitch 
              checked={showSMA200}
              onChange={setShowSMA200}
              label="SMA 200"
              color="orange"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default StockChartAdvanced;
