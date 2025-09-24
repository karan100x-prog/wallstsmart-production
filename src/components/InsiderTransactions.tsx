import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Calendar, DollarSign, User, Building, AlertCircle } from 'lucide-react';

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
    
    try {
      console.log(`[InsiderTransactions] Loading data for symbol: ${symbol}`);
      
      const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
      const url = `https://www.alphavantage.co/query?function=INSIDER_TRANSACTIONS&symbol=${symbol}&apikey=${API_KEY}`;
      
      console.log(`[InsiderTransactions] Fetching URL:`, url);
      
      const response = await fetch(url);
      console.log(`[InsiderTransactions] Response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 [InsiderTransactions] Raw API Response:', { data: Array.isArray(data?.data) ? `Array(${data.data.length})` : data });
      console.log('🔑 [InsiderTransactions] Response keys:', data ? Object.keys(data) : 'No data');
      
      if (data['Information'] || data['Note']) {
        throw new Error('API limit reached. Please try again later.');
      }
      
      if (data['Error Message']) {
        throw new Error('Invalid symbol or API error');
      }
      
      // The API returns data in the "data" field
      if (data && data.data && Array.isArray(data.data)) {
        console.log(`✅ [InsiderTransactions] Found data in "data" field`);
        console.log(`✅ [InsiderTransactions] Found ${data.data.length} transactions`);
        
        // Process and set the transactions
        const processedTransactions = data.data.slice(0, 20); // Show latest 20 transactions
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
        
        console.log(`📊 [InsiderTransactions] Processed ${processedTransactions.length} transactions`);
        console.log(`📈 [InsiderTransactions] Buys: ${buyCount}, Sells: ${sellCount}`);
      } else {
        console.log('❌ [InsiderTransactions] No valid data found in response');
        setTransactions([]);
      }
      
    } catch (err) {
      console.error('❌ [InsiderTransactions] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch insider transactions');
      setTransactions([]);
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
    if (!num) return 'N/A';
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (num: number | undefined) => {
    if (!num) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
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
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Insider Transactions
        </h2>
        <div className="text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Insider Transactions
        </h2>
        <p className="text-gray-400">No insider transactions available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-400" />
        Insider Transactions
      </h2>

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
                ? transaction.shares * transaction.price 
                : transaction.value || 0;
              
              return (
                <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
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

      {/* Show More Button */}
      {transactions.length === 20 && (
        <div className="mt-4 text-center">
          <button className="text-blue-400 hover:text-blue-300 text-sm">
            Showing latest 20 transactions
          </button>
        </div>
      )}
    </div>
  );
};

export default InsiderTransactions;
