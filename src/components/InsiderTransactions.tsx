// InsiderTransactions.tsx - Updated with debugging
import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, User, AlertCircle } from 'lucide-react';

interface InsiderTransactionProps {
  symbol: string;
}

interface Transaction {
  name: string;
  title: string;
  transaction_type: string;
  shares: number;
  price: number;
  value: number;
  date: string;
  ownership: string;
}

const InsiderTransactions: React.FC<InsiderTransactionProps> = ({ symbol }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalBuys: 0,
    totalSells: 0,
    buyValue: 0,
    sellValue: 0,
    netActivity: 0,
    sentiment: 'neutral' as 'bullish' | 'bearish' | 'neutral'
  });

  useEffect(() => {
    if (symbol) {
      loadInsiderData();
    }
  }, [symbol]);

  const loadInsiderData = async () => {
    setLoading(true);
    setError(null);
    console.log('🔍 [InsiderTransactions] Loading data for symbol:', symbol);
    
    try {
      const url = `https://www.alphavantage.co/query?function=INSIDER_TRANSACTIONS&symbol=${symbol}&apikey=NMSRS0ZDIOWF3CLL`;
      console.log('📡 [InsiderTransactions] Fetching URL:', url);
      
      const response = await fetch(url);
      console.log('✅ [InsiderTransactions] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 [InsiderTransactions] Raw API Response:', data);
      
      // Check for API errors or rate limits
      if (data.Note) {
        console.warn('⚠️ [InsiderTransactions] API Rate Limit:', data.Note);
        setError('API rate limit reached. Please try again later.');
        return;
      }
      
      if (data['Error Message']) {
        console.error('❌ [InsiderTransactions] API Error:', data['Error Message']);
        setError('Invalid symbol or API error.');
        return;
      }
      
      if (data.Information) {
        console.warn('⚠️ [InsiderTransactions] API Info:', data.Information);
        setError('API request limit reached.');
        return;
      }
      
      // Log the structure to understand what we're working with
      console.log('🔑 [InsiderTransactions] Response keys:', Object.keys(data));
      
      // Try different possible data structures
      let rawTransactions = null;
      
      // Check for different possible field names
      if (data.data && Array.isArray(data.data)) {
        rawTransactions = data.data;
        console.log('✅ [InsiderTransactions] Found data in "data" field');
      } else if (data.feed && Array.isArray(data.feed)) {
        rawTransactions = data.feed;
        console.log('✅ [InsiderTransactions] Found data in "feed" field');
      } else if (data.transactions && Array.isArray(data.transactions)) {
        rawTransactions = data.transactions;
        console.log('✅ [InsiderTransactions] Found data in "transactions" field');
      } else if (Array.isArray(data)) {
        rawTransactions = data;
        console.log('✅ [InsiderTransactions] Data is direct array');
      }
      
      if (!rawTransactions) {
        console.log('⚠️ [InsiderTransactions] No transaction data found');
        console.log('📊 [InsiderTransactions] Full response structure:', JSON.stringify(data, null, 2));
        setTransactions([]);
        return;
      }
      
      console.log(`📈 [InsiderTransactions] Found ${rawTransactions.length} transactions`);
      
      // Log first transaction to see its structure
      if (rawTransactions.length > 0) {
        console.log('🔍 [InsiderTransactions] First transaction structure:', rawTransactions[0]);
        console.log('🔑 [InsiderTransactions] First transaction keys:', Object.keys(rawTransactions[0]));
      }
      
      // Process transactions with flexible field mapping
      const processedTransactions = rawTransactions
        .slice(0, 20)
        .map((tx: any, index: number) => {
          // Try different field names for each property
          const processed = {
            name: tx.name || tx.insider_name || tx.insider || tx.reportingOwner || 'Unknown',
            title: tx.title || tx.position || tx.relationship || tx.insider_title || 'N/A',
            transaction_type: tx.transaction_type || tx.transactionType || tx.transaction || tx.acquisitionDisposition || 'Unknown',
            shares: parseInt(tx.shares || tx.shareCount || tx.quantity || tx.securitiesTransacted || '0'),
            price: parseFloat(tx.price || tx.pricePerShare || tx.transactionPrice || '0'),
            value: parseFloat(tx.value || tx.transactionValue || tx.totalValue || '0'),
            date: tx.date || tx.transactionDate || tx.filingDate || '',
            ownership: tx.ownership || tx.sharesOwned || tx.postTransactionShares || 'N/A'
          };
          
          // Log mapping for first item to debug
          if (index === 0) {
            console.log('🔄 [InsiderTransactions] Mapped transaction:', processed);
          }
          
          return processed;
        });
      
      console.log(`✅ [InsiderTransactions] Processed ${processedTransactions.length} transactions`);
      setTransactions(processedTransactions);
      
      // Calculate summary statistics
      const buys = processedTransactions.filter((tx: Transaction) => {
        const type = tx.transaction_type.toLowerCase();
        return type.includes('buy') || 
               type.includes('purchase') || 
               type.includes('acquisition') ||
               type.includes('grant') ||
               type === 'p' || 
               type === 'a';
      });
      
      const sells = processedTransactions.filter((tx: Transaction) => {
        const type = tx.transaction_type.toLowerCase();
        return type.includes('sell') || 
               type.includes('sale') || 
               type.includes('disposition') ||
               type === 's' || 
               type === 'd';
      });
      
      console.log(`📊 [InsiderTransactions] Buys: ${buys.length}, Sells: ${sells.length}`);
      
      const totalBuyValue = buys.reduce((sum: number, tx: Transaction) => sum + tx.value, 0);
      const totalSellValue = sells.reduce((sum: number, tx: Transaction) => sum + tx.value, 0);
      const netActivity = totalBuyValue - totalSellValue;
      
      let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (netActivity > 1000000) sentiment = 'bullish';
      else if (netActivity < -1000000) sentiment = 'bearish';
      
      setSummary({
        totalBuys: buys.length,
        totalSells: sells.length,
        buyValue: totalBuyValue,
        sellValue: totalSellValue,
        netActivity,
        sentiment
      });
      
    } catch (error) {
      console.error('❌ [InsiderTransactions] Error loading data:', error);
      setError('Failed to load insider transactions');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value: number) => {
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr; // Return original if invalid
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const getTransactionIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('buy') || lowerType.includes('purchase') || 
        lowerType.includes('acquisition') || lowerType === 'p' || lowerType === 'a') {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (lowerType.includes('sell') || lowerType.includes('sale') || 
        lowerType.includes('disposition') || lowerType === 's' || lowerType === 'd') {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-gray-400" />;
  };

  const getTransactionColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('buy') || lowerType.includes('purchase') || 
        lowerType.includes('acquisition') || lowerType === 'p' || lowerType === 'a') {
      return 'text-green-500';
    }
    if (lowerType.includes('sell') || lowerType.includes('sale') || 
        lowerType.includes('disposition') || lowerType === 's' || lowerType === 'd') {
      return 'text-red-500';
    }
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6">
        <h3 className="text-xl font-bold mb-4">Insider Transactions</h3>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
          <p className="text-gray-400">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Please try again later</p>
        </div>
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6">
        <h3 className="text-xl font-bold mb-4">Insider Transactions</h3>
        <div className="text-center py-8 text-gray-400">
          <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No recent insider transactions available</p>
          <p className="text-sm text-gray-500 mt-2">This stock may not have recent insider activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Insider Transactions</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          summary.sentiment === 'bullish' ? 'bg-green-500/20 text-green-500' :
          summary.sentiment === 'bearish' ? 'bg-red-500/20 text-red-500' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {summary.sentiment.charAt(0).toUpperCase() + summary.sentiment.slice(1)} Sentiment
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Total Buys</div>
          <div className="text-xl font-bold text-green-500">{summary.totalBuys}</div>
          <div className="text-xs text-gray-400">{formatMoney(summary.buyValue)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Total Sells</div>
          <div className="text-xl font-bold text-red-500">{summary.totalSells}</div>
          <div className="text-xs text-gray-400">{formatMoney(summary.sellValue)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Net Activity</div>
          <div className={`text-xl font-bold ${
            summary.netActivity > 0 ? 'text-green-500' : summary.netActivity < 0 ? 'text-red-500' : 'text-gray-400'
          }`}>
            {formatMoney(Math.abs(summary.netActivity))}
          </div>
          <div className="text-xs text-gray-400">
            {summary.netActivity > 0 ? 'Net Buying' : summary.netActivity < 0 ? 'Net Selling' : 'Neutral'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Buy/Sell Ratio</div>
          <div className="text-xl font-bold text-white">
            {summary.totalSells > 0 ? (summary.totalBuys / summary.totalSells).toFixed(2) : summary.totalBuys}:1
          </div>
          <div className="text-xs text-gray-400">
            {summary.totalBuys > summary.totalSells ? 'More Buying' : 
             summary.totalBuys < summary.totalSells ? 'More Selling' : 'Balanced'}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="text-xs text-gray-400 border-b border-gray-700">
            <tr>
              <th className="text-left pb-3">Date</th>
              <th className="text-left pb-3">Insider</th>
              <th className="text-left pb-3">Transaction</th>
              <th className="text-right pb-3">Shares</th>
              <th className="text-right pb-3">Price</th>
              <th className="text-right pb-3">Value</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {transactions.map((tx, index) => (
              <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-3 text-gray-400">{formatDate(tx.date)}</td>
                <td className="py-3">
                  <div>
                    <div className="text-white font-medium">{tx.name}</div>
                    <div className="text-xs text-gray-500">{tx.title}</div>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    {getTransactionIcon(tx.transaction_type)}
                    <span className={getTransactionColor(tx.transaction_type)}>
                      {tx.transaction_type}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-right text-white">
                  {tx.shares.toLocaleString()}
                </td>
                <td className="py-3 text-right text-white">
                  ${tx.price > 0 ? tx.price.toFixed(2) : '0.00'}
                </td>
                <td className={`py-3 text-right font-semibold ${getTransactionColor(tx.transaction_type)}`}>
                  {formatMoney(tx.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500 italic">
        * Insider transactions from SEC Form 4 filings. Data may be delayed.
      </div>
    </div>
  );
};

export default InsiderTransactions;
