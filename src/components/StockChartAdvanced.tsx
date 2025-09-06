import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getIntradayPrices, getDailyPrices, getWeeklyPrices, getMonthlyPrices } from '../services/alphaVantage';

interface StockChartAdvancedProps {
  symbol: string;
}

type TimeRange = '7D' | '1M' | '6M' | '1Y' | '3Y' | '5Y' | '10Y' | 'MAX';

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
      
      // ✅ FIXED: Format data for chart with adjusted prices
      const formattedData = data.reverse().map((item) => ({
        date: formatDate(item.date, range),
        price: parseFloat(item.adjustedClose || item.close), // ✅ NOW USES ADJUSTED PRICE
        // Optional: Add these for debugging
        originalClose: parseFloat(item.close),
        splitCoefficient: item.splitCoefficient || 1,
        hasSplit: item.splitCoefficient && item.splitCoefficient !== 1
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

  // ✅ ENHANCED: Custom tooltip to show if price is adjusted
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded p-2 text-sm">
          <p className="text-gray-400">{label}</p>
          <p className="text-green-400 font-semibold">
            ${payload[0].value.toFixed(2)}
          </p>
          {data.hasSplit && (
            <p className="text-yellow-400 text-xs mt-1">
              ⚠️ Stock split on this date
            </p>
          )}
        </div>
      );
    }
    return null;
  };

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

      {/* ✅ NEW: Info banner about adjusted prices */}
      <div className="mb-4 p-2 bg-blue-900/20 border border-blue-900/50 rounded text-xs text-blue-400">
        ℹ️ Prices are adjusted for stock splits and dividends
      </div>

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
              domain={['dataMin - 5', 'dataMax + 5']}
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
