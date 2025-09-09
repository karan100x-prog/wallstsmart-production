import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, TrendingUp, X } from 'lucide-react';
import { fetchStockQuote, fetchStockOverview, fetchTimeSeriesDaily } from '../services/alphaVantage';
import StockChart from './StockChart';

interface StockDetailProps {
  symbol: string;
}

export default function StockDetail({ symbol }: StockDetailProps) {
  const [quote, setQuote] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [timeSeries, setTimeSeries] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('10Y');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStockData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [quoteData, overviewData, timeSeriesData] = await Promise.all([
          fetchStockQuote(symbol),
          fetchStockOverview(symbol),
          fetchTimeSeriesDaily(symbol)
        ]);
        setQuote(quoteData);
        setOverview(overviewData);
        setTimeSeries(timeSeriesData);
      } catch (err) {
        setError('Failed to load stock data. Please try again.');
        console.error('Error loading stock data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStockData();
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-400">Loading stock data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  const priceChange = quote ? parseFloat(quote['10. change']) : 0;
  const percentChange = quote ? parseFloat(quote['10. change percent'].replace('%', '')) : 0;
  const isPositive = priceChange >= 0;

  const timeRanges = [
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
    { label: '1Y', value: '1Y' },
    { label: '3Y', value: '3Y' },
    { label: '5Y', value: '5Y' },
    { label: '10Y', value: '10Y' },
    { label: 'MAX', value: 'MAX' }
  ];

  return (
    <div className="w-full">
      {/* Stock Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold">{symbol}</h1>
          {overview && (
            <span className="text-sm sm:text-base text-gray-400">{overview.Name}</span>
          )}
        </div>
        
        {quote && (
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
            <span className="text-3xl sm:text-4xl font-bold">
              ${parseFloat(quote['05. price']).toFixed(2)}
            </span>
            <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5" /> : <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5" />}
              <span className="text-lg sm:text-xl">
                {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({percentChange.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Time Range Selector - Mobile Optimized */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition whitespace-nowrap text-sm sm:text-base ${
                timeRange === range.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Adjusted for stock splits notice */}
      <div className="mb-4">
        <p className="text-xs sm:text-sm text-gray-500">Adjusted for stock splits</p>
      </div>

      {/* Chart */}
      <div className="bg-gray-900 rounded-xl p-4 sm:p-6 mb-8 w-full overflow-hidden">
        <StockChart data={timeSeries} timeRange={timeRange} />
      </div>

      {/* Company Overview */}
      {overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-gray-900 rounded-xl p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Company Overview</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm sm:text-base">Sector</span>
                <span className="text-sm sm:text-base">{overview.Sector}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm sm:text-base">Industry</span>
                <span className="text-sm sm:text-base text-right">{overview.Industry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm sm:text-base">Market Cap</span>
                <span className="text-sm sm:text-base">
                  ${(parseInt(overview.MarketCapitalization) / 1e9).toFixed(2)}B
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm sm:text-base">Employees</span>
                <span className="text-sm sm:text-base">{parseInt(overview.FullTimeEmployees).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Key Metrics</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm sm:text-base">P/E Ratio</span>
                <span className="text-sm sm:text-base">{overview.PERatio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm sm:text-base">EPS</span>
                <span className="text-sm sm:text-base">${overview.EPS}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm sm:text-base">Dividend Yield</span>
                <span className="text-sm sm:text-base">{overview.DividendYield || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm sm:text-base">52W Range</span>
                <span className="text-sm sm:text-base">
                  ${overview['52WeekLow']} - ${overview['52WeekHigh']}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
