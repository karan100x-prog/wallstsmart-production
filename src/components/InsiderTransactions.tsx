import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Calendar, DollarSign, User, AlertCircle, RefreshCw, Clock } from 'lucide-react';

interface Transaction {
  name: string;
  title: string;
  transaction_date: string;
  ticker: string;
  executive: string;
  executive_title: string;
  security_type: string;
  transaction_type: string;
  acquisition_or_disposal: string;
  shares: number;
  price?: number;
  value?: number;
}

interface InsiderTransactionsProps {
  symbol: string;
}

// Cache implementation with localStorage fallback
const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes
const MEMORY_CACHE = new Map<string, { data: any; timestamp: number }>();
const pendingRequests = new Map<string, Promise<any>>();

// Premium API key - from environment variable
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;

// API call queue to prevent rate limiting
class APIQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastCallTime = 0;
  private minDelay = 1000; // Minimum 1 second between calls

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < this.minDelay) {
      const delay = this.minDelay - timeSinceLastCall;
      console.log(`⏱️ [APIQueue] Waiting ${delay}ms before next call`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    const task = this.queue.shift();
    if (task) {
      this.lastCallTime = Date.now();
      await task();
    }
    
    this.processing = false;
    
    if (this.queue.length > 0) {
      setTimeout(() => this.process(), 100);
    }
  }
}

const apiQueue = new APIQueue();

// localStorage cache functions
const getFromLocalStorage = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    const parsed = JSON.parse(item);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - parsed.timestamp < CACHE_DURATION) {
      console.log(`📦 [InsiderTransactions] Found valid localStorage cache for ${key}`);
      return parsed;
    } else {
      console.log(`🗑️ [InsiderTransactions] localStorage cache expired for ${key}`);
      // Don't remove expired cache - we might need it as fallback
      return { ...parsed, expired: true };
    }
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
};

const saveToLocalStorage = (key: string, data: any) => {
  try {
    const item = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(item));
    console.log(`💾 [InsiderTransactions] Saved to localStorage: ${key}`);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Mock data for testing when API is down
const getMockData = (symbol: string) => ({
  data: [
    {
      name: "Tim Cook",
      title: "Chief Executive Officer",
      transaction_date: "2025-01-15",
      ticker: symbol,
      executive: "Tim Cook",
      executive_title: "CEO",
      security_type: "Common Stock",
      transaction_type: "Sale",
      acquisition_or_disposal: "D",
      shares: 50000,
      price: 235.50,
      value: 11775000
    },
    {
      name: "Luca Maestri",
      title: "Chief Financial Officer",
      transaction_date: "2025-01-10",
      ticker: symbol,
      executive: "Luca Maestri",
      executive_title: "CFO",
      security_type: "Common Stock",
      transaction_type: "Purchase",
      acquisition_or_disposal: "A",
      shares: 10000,
      price: 230.25,
      value: 2302500
    },
    {
      name: "Katherine Adams",
      title: "General Counsel",
      transaction_date: "2025-01-08",
      ticker: symbol,
      executive: "Katherine Adams",
      executive_title: "General Counsel",
      security_type: "Common Stock",
      transaction_type: "Sale",
      acquisition_or_disposal: "D",
      shares: 5000,
      price: 232.00,
      value: 1160000
    },
    {
      name: "Deirdre O'Brien",
      title: "SVP Retail",
      transaction_date: "2025-01-05",
      ticker: symbol,
      executive: "Deirdre O'Brien",
      executive_title: "SVP Retail",
      security_type: "Common Stock",
      transaction_type: "Purchase",
      acquisition_or_disposal: "A",
      shares: 2500,
      price: 228.75,
      value: 571875
    }
  ]
});

const InsiderTransactions: React.FC<InsiderTransactionsProps> = ({ symbol }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buys, setBuys] = useState(0);
  const [sells, setSells] = useState(0);
  const [cacheTime, setCacheTime] = useState<number | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  useEffect(() => {
    fetchInsiderTransactions();
  }, [symbol]);

  const fetchInsiderTransactions = async () => {
    setLoading(true);
    setError(null);
    setIsUsingMockData(false);
    
    console.log('🔑 Using Premium API key');
    
    const cacheKey = `insider_${symbol}`;
    const localStorageKey = `wallstsmart_insider_${symbol}`;
    
    try {
      // Check memory cache first
      const memoryCache = MEMORY_CACHE.get(cacheKey);
      if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION) {
        console.log(`📦 [InsiderTransactions] Using memory cache for ${symbol}`);
        processData(memoryCache.data, memoryCache.timestamp);
        setLoading(false);
        return;
      }

      // Check localStorage cache (including expired ones)
      const localCache = getFromLocalStorage(localStorageKey);
      if (localCache && !localCache.expired) {
        console.log(`📦 [InsiderTransactions] Using localStorage cache for ${symbol}`);
        MEMORY_CACHE.set(cacheKey, localCache);
        processData(localCache.data, localCache.timestamp);
        setLoading(false);
        return;
      }

      // Check if request is already pending
      if (pendingRequests.has(cacheKey)) {
        console.log(`⏳ [InsiderTransactions] Waiting for pending request for ${symbol}`);
        const data = await pendingRequests.get(cacheKey);
        processData(data, Date.now());
        setLoading(false);
        return;
      }

      // Make new API request with queue - using environment variable
      const url = `https://www.alphavantage.co/query?function=INSIDER_TRANSACTIONS&symbol=${symbol}&apikey=${API_KEY}`;
      
      console.log(`📡 [InsiderTransactions] Making API call for ${symbol}`);
      console.log(`📡 URL: ${url}`);
      
      const requestPromise = apiQueue.add(async () => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      }).then(data => {
        pendingRequests.delete(cacheKey);
        
        console.log(`📦 [InsiderTransactions] API Response:`, data);
        
        // Check for API limit errors
        if (data['Note'] || data['Information']) {
          console.warn('⚠️ [InsiderTransactions] API limit hit:', data['Note'] || data['Information']);
          
          // Try expired cache
          if (localCache && localCache.expired) {
            console.log('📦 [InsiderTransactions] Using expired cache due to API limit');
            setError('Using older cached data (API limit reached)');
            return localCache.data;
          }
          
          // Use mock data as last resort for demo purposes
          console.log('🎭 [InsiderTransactions] Using mock data for demo');
          setIsUsingMockData(true);
          setError('Demo mode: Using sample data (API limit reached)');
          return getMockData(symbol);
        }
        
        // Valid data received
        if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
          console.log(`✅ [InsiderTransactions] Got ${data.data.length} real transactions!`);
          const timestamp = Date.now();
          MEMORY_CACHE.set(cacheKey, { data, timestamp });
          saveToLocalStorage(localStorageKey, data);
          return data;
        }
        
        return data;
      }).catch(err => {
        pendingRequests.delete(cacheKey);
        throw err;
      });

      pendingRequests.set(cacheKey, requestPromise);
      const data = await requestPromise;
      
      processData(data, Date.now());
      
    } catch (err) {
      console.error('❌ [InsiderTransactions] Error:', err);
      
      // Try any cached data
      const localCache = getFromLocalStorage(localStorageKey);
      if (localCache) {
        console.log('📦 [InsiderTransactions] Using any cached data as fallback');
        processData(localCache.data, localCache.timestamp);
        setError('Using cached data (API temporarily unavailable)');
      } else {
        // Use mock data for demo
        console.log('🎭 [InsiderTransactions] Using mock data as final fallback');
        const mockData = getMockData(symbol);
        processData(mockData, Date.now());
        setIsUsingMockData(true);
        setError('Demo mode: Using sample data');
      }
    } finally {
      setLoading(false);
    }
  };

  const processData = (data: any, timestamp: number) => {
    setCacheTime(timestamp);
    
    // Process successful data
    if (data && data.data && Array.isArray(data.data)) {
      console.log(`✅ [InsiderTransactions] Processing ${data.data.length} transactions for ${symbol}`);
      
      const processedTransactions = data.data.slice(0, 20);
      
      // Fetch historical prices if missing
      fetchHistoricalPrices(processedTransactions);
      
      setTransactions(processedTransactions);
      
      // Count buys and sells
      let buyCount = 0;
      let sellCount = 0;
      
      processedTransactions.forEach(t => {
        if (t.acquisition_or_disposal?.toUpperCase() === 'A') {
          buyCount++;
        } else if (t.acquisition_or_disposal?.toUpperCase() === 'D') {
          sellCount++;
        }
      });
      
      setBuys(buyCount);
      setSells(sellCount);
    } else {
      console.log('❌ [InsiderTransactions] No valid data found');
      setTransactions([]);
    }
  };

  const fetchHistoricalPrices = async (transactionsList: Transaction[]) => {
    // Check if we need to fetch prices
    const needsPrices = transactionsList.some(t => !t.price && t.shares);
    if (!needsPrices) return;

    try {
      // Get daily prices for this stock - using environment variable
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${API_KEY}`;
      
      const response = await fetch(url);
      const priceData = await response.json();
      
      if (priceData['Time Series (Daily)']) {
        const timeSeries = priceData['Time Series (Daily)'];
        
        // Update transactions with closing prices
        const updatedTransactions = transactionsList.map(transaction => {
          if (!transaction.price && transaction.transaction_date) {
            // Format date to match API format (YYYY-MM-DD)
            const dateStr = new Date(transaction.transaction_date).toISOString().split('T')[0];
            
            // Look for price on that date or nearest available date
            let price = null;
            let checkDate = new Date(dateStr);
            let attempts = 0;
            
            // Try to find price within 5 days
            while (!price && attempts < 5) {
              const checkDateStr = checkDate.toISOString().split('T')[0];
              if (timeSeries[checkDateStr]) {
                price = parseFloat(timeSeries[checkDateStr]['4. close']);
                break;
              }
              // Go back one day
              checkDate.setDate(checkDate.getDate() - 1);
              attempts++;
            }
            
            if (price) {
              return { ...transaction, price, value: transaction.shares * price };
            }
          }
          return transaction;
        });
        
        setTransactions(updatedTransactions);
        console.log('📈 [InsiderTransactions] Updated transactions with historical prices');
      }
    } catch (error) {
      console.error('❌ [InsiderTransactions] Error fetching historical prices:', error);
      // Continue showing transactions without prices
    }
  };

  const handleRefresh = async () => {
    // Clear all caches for this symbol
    const cacheKey = `insider_${symbol}`;
    const localStorageKey = `wallstsmart_insider_${symbol}`;
    
    MEMORY_CACHE.delete(cacheKey);
    localStorage.removeItem(localStorageKey);
    pendingRequests.delete(cacheKey);
    
    console.log(`🔄 [InsiderTransactions] All caches cleared for ${symbol}, forcing direct API call...`);
    
    // Force a direct API call bypassing queue
    setLoading(true);
    setError(null);
    setIsUsingMockData(false);
    
    try {
      // Using environment variable for API key
      const url = `https://www.alphavantage.co/query?function=INSIDER_TRANSACTIONS&symbol=${symbol}&apikey=${API_KEY}`;
      
      console.log(`🔴 [FORCED REFRESH] Direct API call with Premium key`);
      console.log(`🔴 [FORCED REFRESH] URL: ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log(`🔴 [FORCED REFRESH] Response:`, data);
      
      if (data && data.data && Array.isArray(data.data)) {
        console.log(`✅ [FORCED REFRESH] Got ${data.data.length} real transactions!`);
        // Save successful data
        const timestamp = Date.now();
        MEMORY_CACHE.set(cacheKey, { data, timestamp });
        saveToLocalStorage(localStorageKey, data);
        processData(data, timestamp);
        setIsUsingMockData(false);
        setError(null);
      } else if (data['Note'] || data['Information']) {
        console.log(`🔴 [FORCED REFRESH] API still limited:`, data['Note'] || data['Information']);
        setError('API still limited. Using demo data.');
        setIsUsingMockData(true);
        const mockData = getMockData(symbol);
        processData(mockData, Date.now());
      } else {
        processData(data, Date.now());
      }
    } catch (err) {
      console.error(`🔴 [FORCED REFRESH] Error:`, err);
      setError('Failed to refresh. Using demo data.');
      setIsUsingMockData(true);
      const mockData = getMockData(symbol);
      processData(mockData, Date.now());
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return 'N/A';
    return new Intl.NumberFormat('en-US').format(Math.abs(num));
  };

  const formatCurrency = (num: number | undefined) => {
    if (num === undefined || num === null || num === 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(num));
  };

  const getCacheAge = () => {
    if (!cacheTime) return null;
    const ageMinutes = Math.floor((Date.now() - cacheTime) / 60000);
    if (ageMinutes < 1) return 'Just now';
    if (ageMinutes === 1) return '1 minute ago';
    if (ageMinutes < 60) return `${ageMinutes} minutes ago`;
    const ageHours = Math.floor(ageMinutes / 60);
    if (ageHours === 1) return '1 hour ago';
    return `${ageHours} hours ago`;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Insider Transactions
        </h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Insider Transactions
          </h2>
          <button 
            onClick={handleRefresh}
            className="text-blue-400 hover:text-blue-300 p-1"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-gray-400">No insider transactions available for {symbol}</p>
        {error && (
          <div className="mt-4 text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Insider Transactions
          {transactions.length > 0 && (
            <span className="text-sm text-gray-500">({transactions.length} recent)</span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {cacheTime && !isUsingMockData && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getCacheAge()}
            </span>
          )}
          <button 
            onClick={handleRefresh}
            className="text-blue-400 hover:text-blue-300 p-1"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Show warning if using cached/mock data */}
      {error && (
        <div className={`mb-4 p-2 rounded text-sm flex items-center gap-2 ${
          isUsingMockData 
            ? 'bg-purple-900/20 border border-purple-600/30 text-purple-400' 
            : 'bg-yellow-900/20 border border-yellow-600/30 text-yellow-400'
        }`}>
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Buys</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">{buys}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Sells</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{sells}</div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="text-left text-gray-400 text-sm border-b border-gray-800">
            <tr>
              <th className="pb-2 pr-4">Date</th>
              <th className="pb-2 pr-4">Insider</th>
              <th className="pb-2 pr-4">Type</th>
              <th className="pb-2 pr-4 text-right">Shares</th>
              <th className="pb-2 text-right">Value</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {transactions.map((transaction, index) => {
              const isAcquisition = transaction.acquisition_or_disposal?.toUpperCase() === 'A';
              const value = transaction.shares && transaction.price 
                ? Math.abs(transaction.shares * transaction.price)
                : transaction.value || 0;
              
              return (
                <tr key={`${transaction.transaction_date}-${transaction.name}-${index}`} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-300">
                        {formatDate(transaction.transaction_date)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-100 font-medium">
                          {transaction.name || transaction.executive || 'Unknown'}
                        </span>
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        {transaction.title || transaction.executive_title || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                      isAcquisition 
                        ? 'bg-green-900/50 text-green-400' 
                        : 'bg-red-900/50 text-red-400'
                    }`}>
                      {isAcquisition ? (
                        <>
                          <TrendingUp className="w-3 h-3" />
                          Buy
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3 h-3" />
                          Sell
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className={isAcquisition ? 'text-green-400' : 'text-red-400'}>
                      {isAcquisition ? '+' : '-'}{formatNumber(transaction.shares)}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <DollarSign className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-100">
                        {formatCurrency(value)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cache Info */}
      <div className="mt-4 text-center">
        <p className="text-gray-500 text-xs">
          {isUsingMockData 
            ? 'Demo data shown • Real data will load when API is available' 
            : 'Data cached for 60 minutes'}
        </p>
      </div>
    </div>
  );
};

export default InsiderTransactions;
