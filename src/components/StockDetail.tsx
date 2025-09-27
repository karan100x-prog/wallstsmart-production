import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Star } from 'lucide-react';
import { getQuote, getCompanyOverview } from '../services/alphaVantage';
import StockChartAdvanced from './StockChartAdvanced';
import { StockHealthMetrics } from './StockHealthMetrics';
import RevenueAnalysis from './RevenueAnalysis';
import InsiderTransactions from './InsiderTransactions';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';




interface StockDetailProps {
  symbol: string;
}

const StockDetail: React.FC<StockDetailProps> = ({ symbol }) => {
  const [quote, setQuote] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newsData, setNewsData] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  
  // Watchlist feature states
  const { currentUser } = useAuth();
  const [watchlist, setWatchlist] = useState<any[]>([]);

  useEffect(() => {
    loadStockData();
    loadNewsData();
    if (currentUser) {
      fetchWatchlist();
    }
  }, [symbol, currentUser]);

  // Watchlist functions
  const fetchWatchlist = async () => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, 'watchlist'), where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const watchlistData: any[] = [];
      querySnapshot.forEach((doc) => {
        watchlistData.push({ id: doc.id, ...doc.data() });
      });
      setWatchlist(watchlistData);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    }
  };

  const isInWatchlist = (symbol: string) => {
    return watchlist.some(item => item.symbol === symbol);
  };


  const toggleWatchlist = async (symbol: string) => {
  if (!currentUser) {
    alert('Please sign in to use watchlist');
    return;
  }

  try {
    const existing = watchlist.find(item => item.symbol === symbol);
    
    if (existing) {
      // Remove from watchlist
      await deleteDoc(doc(db, 'watchlist', existing.id));
      console.log('Removed from watchlist:', symbol);
    } else {
      // Add to watchlist
      const docRef = await addDoc(collection(db, 'watchlist'), {
        userId: currentUser.uid,
        symbol: symbol,
        companyName: company?.Name || symbol,
        addedAt: new Date().toISOString()
      });
      console.log('Added to watchlist:', symbol, 'with ID:', docRef.id);
    }
    
    // Refresh watchlist
    await fetchWatchlist();
  } catch (error) {
    console.error('Error toggling watchlist:', error);
    alert('Failed to update watchlist. Please try again.');
  }
};






  
  const loadStockData = async () => {
    setLoading(true);
    try {
      const [quoteData, companyData] = await Promise.all([
        getQuote(symbol),
        getCompanyOverview(symbol)
      ]);
      
      setQuote(quoteData);
      setCompany(companyData);
      
      // Log ownership data for verification (remove in production)
      if (companyData) {
        console.log(`${symbol} Ownership Data:`, {
          insiders: companyData.PercentInsiders,
          institutions: companyData.PercentInstitutions,
          float: companyData.SharesFloat,
          outstanding: companyData.SharesOutstanding
        });
      }
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

  // Enhanced ownership percentage formatter with validation
  const formatOwnershipPercent = (value: any) => {
    const num = parseFloat(value);
    
    // Handle invalid or missing data
    if (isNaN(num) || num < 0) return 'N/A';
    
    // Sanity check: ownership shouldn't exceed 100%
    if (num > 100) {
      console.warn(`${symbol}: Ownership percentage exceeds 100%: ${num}%`);
      return `${num.toFixed(2)}%*`; // Asterisk indicates unusual data
    }
    
    // For very small percentages, show more precision if needed
    if (num > 0 && num < 0.01) {
      return `<0.01%`;
    }
    
    return `${num.toFixed(2)}%`;
  };

  // Validate and format short interest data
  const formatShortInterest = (value: any, isPercent: boolean = false) => {
    const num = parseFloat(value);
    
    if (isNaN(num) || num < 0) return 'N/A';
    
    if (isPercent) {
      // Short percent of float - already in percentage format from API
      if (num > 100) {
        console.warn(`${symbol}: Short % of float exceeds 100%: ${num}%`);
        return `${num.toFixed(2)}%*`;
      }
      return `${num.toFixed(2)}%`;
    }
    
    // For share counts
    return formatLargeNumber(num);
  };

  // Calculate ownership totals for validation
  const calculateOwnershipTotals = () => {
    const insiders = parseFloat(company?.PercentInsiders || '0');
    const institutions = parseFloat(company?.PercentInstitutions || '0');
    const total = insiders + institutions;
    
    // Log if ownership seems unusual
    if (total > 100) {
      console.warn(`${symbol}: Total ownership exceeds 100%: ${total.toFixed(2)}%`);
    }
    
    return {
      insiders,
      institutions,
      total,
      retail: Math.max(0, 100 - total) // Estimated retail ownership
    };
  };

  const ownership = calculateOwnershipTotals();

  return (
    <div>
      {/* Updated Header with Favorite Star */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-4xl font-bold mb-2">{symbol}</h1>
              <p className="text-xl text-gray-400">{company?.Name || 'Loading...'}</p>
            </div>
            <button
              onClick={() => toggleWatchlist(symbol)}
              className={`p-2 rounded-lg transition-all duration-200 hover:bg-gray-800 ${
                isInWatchlist(symbol) ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-400'
              }`}
              title={isInWatchlist(symbol) ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <Star 
                className="h-7 w-7" 
                fill={isInWatchlist(symbol) ? 'currentColor' : 'none'}
              />
            </button>
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

      {/* Advanced Health Metrics - MOVED UP */}
      <StockHealthMetrics symbol={symbol} />

      {/* Revenue Analysis & Projections - MOVED UP */}
      <RevenueAnalysis symbol={symbol} />

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
          </div>
        </div>
      )}

      {/* SIDE BY SIDE: Trading Metrics & Ownership & Short Interest - MOVED DOWN */}
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

        {/* RIGHT SIDE: Enhanced Ownership & Short Interest */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-bold mb-4">
            Ownership & Short Interest
            {ownership.total > 100 && (
              <span className="ml-2" title="Data may be overlapping or estimated">
                <AlertCircle className="inline w-4 h-4 text-yellow-500" />
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Institutional Ownership</span>
              <span className="text-lg font-semibold">
                {formatOwnershipPercent(company?.PercentInstitutions)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Insider Ownership</span>
              <span className="text-lg font-semibold">
                {formatOwnershipPercent(company?.PercentInsiders)}
              </span>
            </div>
            {/* Show estimated retail ownership if data is available */}
            {ownership.total > 0 && ownership.total <= 100 && (
              <div className="flex justify-between">
                <span className="text-yellow-400 text-sm">Est. Retail Ownership</span>
                <span className="text-lg font-semibold text-yellow-500">
                  ~{ownership.retail.toFixed(2)}%
                </span>
              </div>
            )}
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
                {company?.SharesShort ? 
                  formatShortInterest(company.SharesShort, false) : 
                  'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Short % of Float</span>
              <span className="text-lg font-semibold">
                {company?.ShortPercentFloat ? 
                  formatShortInterest(company.ShortPercentFloat, true) : 
                  'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Short Ratio</span>
              <span className="text-lg font-semibold">{company?.ShortRatio || 'N/A'}</span>
            </div>
          </div>
          {/* Data quality note */}
          {(!company?.SharesShort || !company?.ShortPercentFloat) && (
            <div className="mt-4 text-xs text-gray-500 italic">
              * Some short interest data may be unavailable
            </div>
          )}
        </div>
      </div>

      {/* Insider Transactions - NEW SECTION */}
      <InsiderTransactions symbol={symbol} />

      {/* Latest News Section */}
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
      </div>

      {/* Company Information */}
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6">
        <h3 className="text-xl font-bold mb-4">About {company?.Name}</h3>
        <div className="mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <span className="text-gray-400 text-sm">Exchange</span>
              <div className="text-white">{company?.Exchange || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Sector</span>
              <div className="text-white">{company?.Sector || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Industry</span>
              <div className="text-white">{company?.Industry || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Country</span>
              <div className="text-white">{company?.Country || 'N/A'}</div>
            </div>
          </div>
        </div>
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
  );
};

export default StockDetail;
