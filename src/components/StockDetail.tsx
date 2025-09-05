import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Activity, BarChart3, DollarSign, Users } from 'lucide-react';
import { getQuote, getCompanyOverview } from '../services/alphaVantage';
import StockChartAdvanced from './StockChartAdvanced';

interface StockDetailProps {
  symbol: string;
  onBack: () => void;
}

const StockDetail: React.FC<StockDetailProps> = ({ symbol, onBack }) => {
  const [quote, setQuote] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStockData();
  }, [symbol]);

  const loadStockData = async () => {
    setLoading(true);
    try {
      const [quoteData, companyData] = await Promise.all([
        getQuote(symbol),
        getCompanyOverview(symbol)
      ]);
      
      setQuote(quoteData);
      setCompany(companyData);
    } catch (error) {
      console.error('Error loading stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const price = parseFloat(quote?.['05. price'] || '0');
  const change = parseFloat(quote?.['09. change'] || '0');
  const changePercent = quote?.['10. change percent'] || '0%';
  const volume = parseInt(quote?.['06. volume'] || '0');

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Search
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{symbol}</h1>
            <p className="text-xl text-gray-400">{company?.Name || 'Loading...'}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">${price.toFixed(2)}</div>
            <div className={`text-lg flex items-center justify-end gap-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent})
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-8">
        <StockChartAdvanced symbol={symbol} />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm">Market Cap</span>
          </div>
          <div className="text-xl font-bold">
            ${((parseFloat(company?.MarketCapitalization || '0') / 1e9).toFixed(1))}B
          </div>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm">P/E Ratio</span>
          </div>
          <div className="text-xl font-bold">
            {parseFloat(company?.PERatio || '0').toFixed(2)}
          </div>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Dividend Yield</span>
          </div>
          <div className="text-xl font-bold">
            {(parseFloat(company?.DividendYield || '0') * 100).toFixed(2)}%
          </div>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Users className="h-4 w-4" />
            <span className="text-sm">Volume</span>
          </div>
          <div className="text-xl font-bold">
            {(volume / 1e6).toFixed(1)}M
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-bold mb-4">Company Information</h3>
          <div className="space-y-3">
            <div>
              <span className="text-gray-400">Sector:</span>
              <span className="ml-2">{company?.Sector || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Industry:</span>
              <span className="ml-2">{company?.Industry || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Exchange:</span>
              <span className="ml-2">{company?.Exchange || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Country:</span>
              <span className="ml-2">{company?.Country || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-bold mb-4">Financial Metrics</h3>
          <div className="space-y-3">
            <div>
              <span className="text-gray-400">EPS:</span>
              <span className="ml-2">${company?.EPS || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Beta:</span>
              <span className="ml-2">{company?.Beta || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">52 Week High:</span>
              <span className="ml-2">${company?.['52WeekHigh'] || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">52 Week Low:</span>
              <span className="ml-2">${company?.['52WeekLow'] || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockDetail;
