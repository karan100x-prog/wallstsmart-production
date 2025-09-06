import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getQuote, getCompanyOverview } from '../services/alphaVantage';
import StockChartAdvanced from './StockChartAdvanced';

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

  // Helper function to format large numbers with N/A handling
  const formatLargeNumber = (num: number) => {
    if (!num || num === 0) return 'N/A';
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  // Helper function to format money values with N/A handling
  const formatMoney = (value: any) => {
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return 'N/A';
    return `$${formatLargeNumber(num)}`;
  };

  // Helper function to format currency with N/A handling
  const formatCurrency = (value: any) => {
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return 'N/A';
    return `$${num.toFixed(2)}`;
  };

  // Helper function to format percentages with N/A handling
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
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">EV/EBITDA</span>
              <span className="text-lg font-semibold">{company?.EnterpriseValueToEBITDA || 'N/A'}</span>
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

      {/* Dividend Information */}
      {company?.DividendYield && parseFloat(company?.DividendYield) > 0 && (
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6">
          <h3 className="text-xl font-bold mb-4">Dividend Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-gray-400 text-sm">Dividend Yield</span>
              <div className="text-lg font-semibold text-green-500">{formatPercent(company?.DividendYield)}</div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Annual Dividend</span>
              <div className="text-lg font-semibold">{formatCurrency(company?.DividendPerShare)}</div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Payout Ratio</span>
              <div className="text-lg font-semibold">{formatPercent(company?.PayoutRatio)}</div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Ex-Dividend Date</span>
              <div className="text-lg font-semibold">{company?.ExDividendDate || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Dividend Date</span>
              <div className="text-lg font-semibold">{company?.DividendDate || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Forward Dividend Yield</span>
              <div className="text-lg font-semibold">{formatPercent(company?.ForwardAnnualDividendYield)}</div>
            </div>
          </div>
        </div>
      )}

      {/* SIDE BY SIDE: Trading Metrics & Ownership & Short Interest */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* LEFT SIDE: Trading Metrics */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-bold mb-4">Trading Metrics</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">50 Day MA</span>
              <span className="text-lg font-semibold">{formatCurrency(company?.['50DayMovingAverage'])}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">200 Day MA</span>
              <span className="text-lg font-semibold">{formatCurrency(company?.['200DayMovingAverage'])}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Volume</span>
              <span className="text-lg font-semibold">{formatLargeNumber(volume)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Ownership & Short Interest */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-bold mb-4">Ownership & Short Interest</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Institutional Ownership</span>
              <span className="text-lg font-semibold">{formatPercent(company?.PercentInstitutions)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Insider Ownership</span>
              <span className="text-lg font-semibold">{formatPercent(company?.PercentInsiders)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Shares Outstanding</span>
              <span className="text-lg font-semibold">
                {formatLargeNumber(parseFloat(company?.SharesOutstanding || '0'))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Float</span>
              <span className="text-lg font-semibold">
                {formatLargeNumber(parseFloat(company?.SharesFloat || '0'))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Short Interest</span>
              <span className="text-lg font-semibold">
                {formatLargeNumber(parseFloat(company?.SharesShort || '0'))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Short % of Float</span>
              <span className="text-lg font-semibold">{formatPercent(company?.ShortPercentFloat)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Short Ratio</span>
              <span className="text-lg font-semibold">{company?.ShortRatio || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Latest News & Sentiment */}
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Latest News & Sentiment</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live Updates
          </div>
        </div>

        {newsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {newsData.length > 0 ? (
              newsData.map((article, index) => (
                <div 
                  key={index}
                  className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-all cursor-pointer"
                  onClick={() => window.open(article.url, '_blank')}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                        {getSourceInitials(article.url)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-400">{new URL(article.url).hostname.replace('www.', '')}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{formatTimeAgo(article.time_published)}</span>
                        <div className="ml-auto flex items-center gap-2">
                          <span className={`text-sm font-medium ${getSentimentColor(article.sentiment_label, article.sentiment_score)}`}>
                            {article.sentiment_score > 0 ? '+' : ''}{article.sentiment_score.toFixed(2)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            article.sentiment_label === 'Bullish' 
                              ? 'bg-green-900/30 text-green-400' 
                              : article.sentiment_label === 'Bearish'
                              ? 'bg-red-900/30 text-red-400'
                              : 'bg-gray-700 text-gray-400'
                          }`}>
                            {article.sentiment_label}
                          </span>
                        </div>
                      </div>
                      <h4 className="text-white font-semibold mb-2 leading-tight">
                        {article.title}
                      </h4>
                      {article.summary && (
                        <p className="text-gray-300 text-sm leading-relaxed mb-3">
                          {article.summary.substring(0, 200)}...
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>Relevance: {(article.relevance * 100).toFixed(0)}%</span>
                        <span>Impact: {article.overall_sentiment_score > 0.5 ? 'High' : article.overall_sentiment_score > 0.2 ? 'Medium' : 'Low'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">📰</div>
                <div>No recent news available for {symbol}</div>
              </div>
            )}
          </div>
        )}

        {newsData.length > 0 && (
          <div className="text-center mt-6">
            <button 
              onClick={loadNewsData}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition flex items-center gap-2 mx-auto"
            >
              <TrendingUp className="w-4 h-4" />
              Refresh News
            </button>
          </div>
        )}
      </div>

      {/* SIDE BY SIDE: Company Information & About Description */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* LEFT SIDE: Company Information */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-bold mb-4">Company Information</h3>
          <div className="space-y-3">
            <div>
              <span className="text-gray-400">Exchange:</span>
              <span className="ml-2">{company?.Exchange || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Sector:</span>
              <span className="ml-2">{company?.Sector || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Industry:</span>
              <span className="ml-2">{company?.Industry || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Country:</span>
              <span className="ml-2">{company?.Country || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Employees:</span>
              <span className="ml-2">{formatLargeNumber(parseFloat(company?.FullTimeEmployees || '0'))}</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: About Description */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-bold mb-4">About {company?.Name}</h3>
          {company?.Description ? (
            <p className="text-gray-300 leading-relaxed text-sm">{company.Description}</p>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-2xl mb-2">📋</div>
              <div>No company description available</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockDetail;
