import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Calendar, DollarSign, User, AlertCircle, RefreshCw } from 'lucide-react';

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

// Simple cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const pendingRequests = new Map<string, Promise<any>>();

const InsiderTransactions: React.FC<InsiderTransactionsProps> = ({ symbol }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buys, setBuys] = useState(0);
  const [sells, setSells] = useState(0);

  useEffect(() => {
    fetchInsiderTransactions();
  }, [symbol]);

  const fetchInsiderTransactions = async () => {
    setLoading(true);
    setError(null);
    
    const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
    const cacheKey = `insider_${symbol}`;
    
    try {
      // Check cache first
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`📦 [InsiderTransactions] Using cached data for ${symbol}`);
        processData(cached.data);
        setLoading(false);
        return;
      }

      // Check if request is already pending for this symbol
      if (pendingRequests.has(cacheKey)) {
        console.log(`⏳ [InsiderTransactions] Waiting for pending request for ${symbol}`);
        const data = await pendingRequests.get(cacheKey);
        processData(data);
        setLoading(false);
        return;
      }

      // Make new request
      const url = `https://www.alphavantage.co/query?function=INSIDER_TRANSACTIONS&symbol=${symbol}&apikey=${API_KEY}`;
      
      console.log(`📡 [InsiderTransactions] Fetching fresh data for ${symbol}`);
      
      // Create promise and store it
      const requestPromise = fetch(url)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          // Cache the successful response
          cache.set(cacheKey, { data, timestamp: Date.now() });
          pendingRequests.delete(cacheKey);
          return data;
        })
        .catch(err => {
          pendingRequests.delete(cacheKey);
          throw err;
        });

      pendingRequests.set(cacheKey, requestPromise);
      const data = await requestPromise;
      
      // Process the data
      processData(data);
      
    } catch (err) {
      console.error('❌ [InsiderTransactions] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch insider transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const processData = (data: any) => {
    // Check for API errors
    if (data['Information']) {
      console.warn('⚠️ [InsiderTransactions] API Information:', data['Information']);
      setError('API limit reached. Data will refresh in a few minutes.');
      setTransactions([]);
      return;
    }
    
    if (data['Note']) {
      console.warn('⚠️ [InsiderTransactions] API Note:', data['Note']);
      setError('API call frequency limit. Please wait a moment.');
      setTransactions([]);
      return;
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
    // Clear cache for this symbol and refetch
    const cacheKey = `insider_${symbol}`;
    cache.delete(cacheKey);
    console.log(`🔄 [InsiderTransactions] Cache cleared for ${symbol}, refreshing...`);
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

  if (error) {
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
        <button 
          onClick={handleRefresh}
          className="text-blue-400 hover:text-blue-300 p-1"
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

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
          Data cached for 5 minutes • Click refresh to update
        </p>
      </div>
    </div>
  );
};

export default InsiderTransactions;
