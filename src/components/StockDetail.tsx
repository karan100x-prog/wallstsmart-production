import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getQuote, getCompanyOverview } from '../services/alphaVantage';
import StockChartAdvanced from './StockChartAdvanced';
import { StockHealthMetrics } from './StockHealthMetrics';

interface StockDetailProps {
  symbol: string;
}

const StockDetail: React.FC<StockDetailProps> = ({ symbol }) => {
  const [quote, setQuote] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newsData, setNewsData] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  useEffect(() => {
    loadStockData();
    loadNewsData();
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

  const loadNewsData = async () => {
    setNewsLoading(true);
    try {
      const response = await fetch(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=NMSRS0ZDIOWF3CLL`);
      const data = await response.json();
      
      if (data.feed) {
        const stockNews = data.feed
          .filter((item: any) => 
            item.ticker_sentiment?.some((ticker: any) => 
              ticker.ticker === symbol && parseFloat(ticker.relevance_score) > 0.3
            )
          )
          .slice(0, 6)
          .map((item: any) => {
            const stockSentiment = item.ticker_sentiment.find((ticker: any) => ticker.ticker === symbol);
            return {
              ...item,
              sentiment_score: parseFloat(stockSentiment?.ticker_sentiment_score || '0'),
              sentiment_label: stockSentiment?.ticker_sentiment_label || 'Neutral',
              relevance: parseFloat(stockSentiment?.relevance_score || '0')
            };
          });
        
        setNewsData(stockNews);
      }
    } catch (error) {
      console.error('Error loading news data:', error);
    } finally {
      setNewsLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'));
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getSentimentColor = (sentiment: string, score: number) => {
    if (sentiment === 'Bullish' || score > 0.35) return 'text-green-500';
    if (sentiment === 'Bearish' || score < -0.35) return 'text-red-500';
    return 'text-gray-400';
  };

  const getSourceInitials = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      if (domain.includes('marketwatch')) return 'MW';
      if (domain.includes('bloomberg')) return 'BB';
      if (domain.includes('cnbc')) return 'CN';
      if (domain.includes('reuters')) return 'RT';
      if (domain.includes('wsj')) return 'WSJ';
      return domain.substring(0, 2).toUpperCase();
    } catch {
      return 'N/A';
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

  const formatLargeNumber = (num: number) => {
    if (!num || num === 0) return 'N/A';
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const formatMoney = (value: any) => {
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return 'N/A';
    return `$${formatLargeNumber(num)}`;
  };

  const formatCurrency = (value: any) => {
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return 'N/A';
    return `$${num.toFixed(2)}`;
  };

  const formatPercent = (value: any) => {
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return 'N/A';
    return `${(num * 100).toFixed(2)}%`;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
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

      {/* Advanced Health Metrics - NEW SECTION */}
      <StockHealthMetrics symbol={symbol} />

      {/* SIDE BY SIDE: Valuation Metrics & Analyst Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* LEFT SIDE: Valuation Metrics */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-bold mb-4">Valuation Metrics</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Market Cap</span>
              <span className="text-lg font-semibold">
                {formatMoney(company?.MarketCapitalization)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">P/E Ratio</span>
              <span className="text-lg font-semibold">{company?.PERatio || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">PEG Ratio</span>
              <span className="text-lg font-semibold">{company?.PEGRatio || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Price/Sales (TTM)</span>
              <span className="text-lg font-semibold">{company?.PriceToSalesRatioTTM || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Book Value</span>
              <span className="text-lg font-semibold">{formatCurrency(company?.BookValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Price/Book</span>
              <span className="text-lg font-semibold">{company?.PriceToBookRatio || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Enterprise Value</span>
              <span className="text-lg font-semibold">
                {formatMoney(company?.EnterpriseValue)}
              </span>
            </div>
          </div>
        </div>
        
        {/* RIGHT SIDE: Analyst Targets */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-bold mb-4">Analyst Targets</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Target Price</span>
              <span className="text-2xl font-bold text-green-500">
                {formatCurrency(company?.AnalystTargetPrice)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Forward P/E</span>
              <span className="text-lg font-semibold">{company?.ForwardPE || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Trailing P/E</span>
              <span className="text-lg font-semibold">{company?.TrailingPE || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Beta</span>
              <span className="text-lg font-semibold">{company?.Beta || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Latest Quarter</span>
              <span className="text-lg font-semibold">{company?.LatestQuarter || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">52 Week High</span>
              <span className="text-lg font-semibold">{formatCurrency(company?.['52WeekHigh'])}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">52 Week Low</span>
              <span className="text-lg font-semibold">{formatCurrency(company?.['52WeekLow'])}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SIDE BY SIDE: Profitability Metrics & Income Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* LEFT SIDE: Profitability Metrics */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-bold mb-4">Profitability Metrics</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Profit Margin</span>
              <span className="text-lg font-semibold">{formatPercent(company?.ProfitMargin)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Operating Margin TTM</span>
              <span className="text-lg font-semibold">{formatPercent(company?.OperatingMarginTTM)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Gross Profit TTM</span>
              <span className="text-lg font-semibold">
                {formatMoney(company?.GrossProfitTTM)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">EBITDA</span>
              <span className="text-lg font-semibold">
                {formatMoney(company?.EBITDA)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">ROA (TTM)</span>
              <span className="text-lg font-semibold">{formatPercent(company?.ReturnOnAssetsTTM)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">ROE (TTM)</span>
              <span className="text-lg font-semibold">{formatPercent(company?.ReturnOnEquityTTM)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Income Statement */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-bold mb-4">Income Statement</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Revenue (TTM)</span>
              <span className="text-lg font-semibold">
                {formatMoney(company?.RevenueTTM)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Revenue Per Share</span>
              <span className="text-lg font-semibold">{formatCurrency(company?.RevenuePerShareTTM)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">EPS</span>
              <span className="text-lg font-semibold">{formatCurrency(company?.EPS)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Diluted EPS (TTM)</span>
              <span className="text-lg font-semibold">{formatCurrency(company?.DilutedEPSTTM)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Earnings Growth YoY</span>
              <span className="text-lg font-semibold">{formatPercent(company?.QuarterlyEarningsGrowthYOY)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Revenue Growth YoY</span>
              <span className="text-lg font-semibold">{formatPercent(company?.QuarterlyRevenueGrowthYOY)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of your existing sections remain the same... */}
      {/* News, Company Info, etc. */}
    </div>
  );
};

export default StockDetail;
