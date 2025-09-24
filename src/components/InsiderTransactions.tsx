// InsiderTransactions.tsx
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
  const [summary, setSummary] = useState({
    totalBuys: 0,
    totalSells: 0,
    buyValue: 0,
    sellValue: 0,
    netActivity: 0,
    sentiment: 'neutral' as 'bullish' | 'bearish' | 'neutral'
  });

  useEffect(() => {
    loadInsiderData();
  }, [symbol]);

  const loadInsiderData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=INSIDER_TRANSACTIONS&symbol=${symbol}&apikey=NMSRS0ZDIOWF3CLL`
      );
      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        const processedTransactions = data.data
          .slice(0, 20)
          .map((tx: any) => ({
            name: tx.name || 'Unknown',
            title: tx.title || 'N/A',
            transaction_type: tx.transaction_type || 'Unknown',
            shares: parseInt(tx.shares || 0),
            price: parseFloat(tx.price || 0),
            value: parseFloat(tx.value || 0),
            date: tx.date || '',
            ownership: tx.ownership || 'N/A'
          }));

        setTransactions(processedTransactions);

        const buys = processedTransactions.filter((tx: Transaction) => 
          tx.transaction_type.toLowerCase().includes('buy') || 
          tx.transaction_type.toLowerCase().includes('purchase') ||
          tx.transaction_type.toLowerCase().includes('acquisition')
        );
        
        const sells = processedTransactions.filter((tx: Transaction) => 
          tx.transaction_type.toLowerCase().includes('sell') || 
          tx.transaction_type.toLowerCase().includes('sale') ||
          tx.transaction_type.toLowerCase().includes('disposition')
        );

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
      }
    } catch (error) {
      console.error('Error loading insider transactions:', error);
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
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getTransactionIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('buy') || lowerType.includes('purchase') || lowerType.includes('acquisition')) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (lowerType.includes('sell') || lowerType.includes('sale') || lowerType.includes('disposition')) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-gray-400" />;
  };

  const getTransactionColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('buy') || lowerType.includes('purchase') || lowerType.includes('acquisition')) {
      return 'text-green-500';
    }
    if (lowerType.includes('sell') || lowerType.includes('sale') || lowerType.includes('disposition')) {
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

  if (!transactions.length) {
    return (
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6">
        <h3 className="text-xl font-bold mb-4">Insider Transactions</h3>
        <div className="text-center py-8 text-gray-400">
          <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No recent insider transactions available</p>
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
            summary.netActivity > 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {formatMoney(Math.abs(summary.netActivity))}
          </div>
          <div className="text-xs text-gray-400">
            {summary.netActivity > 0 ? 'Net Buying' : 'Net Selling'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Buy/Sell Ratio</div>
          <div className="text-xl font-bold text-white">
            {summary.totalSells > 0 ? (summary.totalBuys / summary.totalSells).toFixed(2) : summary.totalBuys}:1
          </div>
          <div className="text-xs text-gray-400">
            {summary.totalBuys > summary.totalSells ? 'More Buying' : 'More Selling'}
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
                  ${tx.price.toFixed(2)}
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
