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
      localStorage.removeItem(key);
      return null;
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

const InsiderTransactions: React.FC<InsiderTransactionsProps> = ({ symbol }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buys, setBuys] = useState(0);
  const [sells, setSells] = useState(0);
  const [cacheTime, setCacheTime] = useState<number | null>(null);

  useEffect(() => {
    fetchInsiderTransactions();
  }, [symbol]);

  const fetchInsiderTransactions = async () => {
    setLoading(true);
    setError(null);
    
    const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
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

      // Check localStorage cache
      const localCache = getFromLocalStorage(localStorageKey);
      if (localCache) {
        console.log(`📦 [InsiderTransactions] Using localStorage cache for ${symbol}`);
        // Also save to memory cache
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

      // Make new API request
      const url = `https://www.alphavantage.co/query?function=INSIDER_TRANSACTIONS&symbol=${symbol}&apikey=${API_KEY}`;
      
      console.log(`📡 [InsiderTransactions] Making API call for ${symbol}`);
      
      const requestPromise = fetch(url)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          pendingRequests.delete(cacheKey);
          
          // Check if we got valid data
          if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
            const timestamp = Date.now();
            // Save to both caches
            MEMORY_CACHE.set(cacheKey, { data, timestamp });
            saveToLocalStorage(localStorageKey, data);
            return data;
          } else if (data['Note'] || data['Information']) {
            // API limit hit - try to use any stale cache
            console.warn('⚠️ [InsiderTransactions] API limit hit, looking for stale cache');
            const staleCache = localStorage.getItem(localStorageKey);
            if (staleCache) {
              const parsed = JSON.parse(staleCache);
              console.log('📦 [InsiderTransactions] Using stale cache due to API limit');
              return parsed.data;
            }
            throw new Error('API limit reached and no cached data available');
          }
          return data;
        })
        .catch(err => {
          pendingRequests.delete(cacheKey);
          throw err;
        });

      pendingRequests.set(cacheKey, requestPromise);
      const data = await requestPromise;
      
      processData(data, Date.now());
      
    } catch (err) {
      console.error('❌ [InsiderTransactions] Error:', err);
      
      // Try to use stale cache as last resort
      const staleCache = localStorage.getItem(localStorageKey);
      if (staleCache) {
        try {
          const parsed = JSON.parse(staleCache);
          console.log('📦 [InsiderTransactions] Using stale cache as fallback');
          processData(parsed.data, parsed.timestamp);
          setError('Using cached data (API temporarily unavailable)');
        } catch {
          setError(err instanceof Error ? err.message : 'Failed to fetch insider transactions');
          setTransactions([]);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch insider transactions');
        setTransactions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const processData = (data: any, timestamp: number) => {
    setCacheTime(timestamp);
    
    // Check for API errors
    if (data['Information'] || data['Note']) {
      console.warn('⚠️ [InsiderTransactions] API limit in response');
      // Don't set error, just process any existing data
    }
    
    if (data['Error Message']) {
      console.error('❌ [InsiderTransactions] API Error:', data['Error Message']);
      setError('Invalid symbol or API error');
      setTransactions([]);
      return;
    }
    
    // Process successful data
    if (data && data.data && Array.isArray(data.data)) {
      console.log(`✅ [InsiderTransactions] Processing ${data.data.length} transactions for ${symbol}`);
      
      const processedTransactions = data.data.slice(0, 20);
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

  const handleRefresh = () => {
    // Clear all caches for this symbol
    const cacheKey = `insider_${symbol}`;
    const localStorageKey = `wallstsmart_insider_${symbol}`;
    
    MEMORY_CACHE.delete(cacheKey);
    localStorage.removeItem(localStorageKey);
    pendingRequests.delete(cacheKey);
    
    console.log(`🔄 [InsiderTransactions] All caches cleared for ${symbol}, refreshing...`);
    fetchInsiderTransactions();
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

  if (error && transactions.length === 0) {
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
        <div className="text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
        <button 
          onClick={handleRefresh}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
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
          {cacheTime && (
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

      {/* Show warning if using cached data due to API limit */}
      {error && (
        <div className="mb-4 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded text-yellow-400 text-sm flex items-center gap-2">
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
          Data cached for 60 minutes • Click refresh to force update
        </p>
      </div>
    </div>
  );
};

export default InsiderTransactions;
