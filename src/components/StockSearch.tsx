import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { searchStocks, getQuote } from '../services/alphaVantage';

interface StockSearchProps {
  onSelectStock: (symbol: string) => void;
}

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
}

interface QuickQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
}

const StockSearch: React.FC<StockSearchProps> = ({ onSelectStock }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [popularStocks, setPopularStocks] = useState<QuickQuote[]>([]);

  useEffect(() => {
    // Load popular stocks on mount
    loadPopularStocks();
  }, []);

  const loadPopularStocks = async () => {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        const data = await getQuote(symbol);
        return {
          symbol,
          price: parseFloat(data?.['05. price'] || '0'),
          change: parseFloat(data?.['09. change'] || '0'),
          changePercent: data?.['10. change percent'] || '0%'
        };
      })
    );
    setPopularStocks(quotes);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const results = await searchStocks(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search stocks by symbol or name..."
            className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition"
          >
            Search
          </button>
        </div>
      </form>

      {/* Popular Stocks */}
      {!searchResults.length && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Popular Stocks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularStocks.map((stock) => (
              <div
                key={stock.symbol}
                onClick={() => onSelectStock(stock.symbol)}
                className="bg-gray-900 p-6 rounded-xl border border-gray-800 cursor-pointer hover:border-green-500 transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold">{stock.symbol}</h3>
                  {stock.change >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="text-2xl font-bold mb-1">
                  ${stock.price.toFixed(2)}
                </div>
                <div className={`text-sm ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Search Results</h2>
          <div className="grid grid-cols-1 gap-4">
            {searchResults.map((result) => (
              <div
                key={result.symbol}
                onClick={() => onSelectStock(result.symbol)}
                className="bg-gray-900 p-6 rounded-xl border border-gray-800 cursor-pointer hover:border-green-500 transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">{result.symbol}</h3>
                    <p className="text-gray-400">{result.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">{result.type}</p>
                    <p className="text-sm text-gray-400">{result.region}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StockSearch;
