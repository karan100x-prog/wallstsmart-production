import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchStocks, getQuote } from '../services/alphaVantage';

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
}

interface QuickQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
}

const StockSearch: React.FC<{ onSelectStock?: (symbol: string) => void }> = ({ onSelectStock }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [popularStocks, setPopularStocks] = useState<QuickQuote[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Load popular stocks on mount
    loadPopularStocks();
  }, []);

  const loadPopularStocks = async () => {
    // Updated to 6 stocks for single row display
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'];
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

  const handleSelectStock = (symbol: string) => {
    if (onSelectStock) {
      onSelectStock(symbol);
    } else {
      navigate(`/stock/${symbol}`);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      {/* Search Bar */}
      <div className="mb-8">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search stocks by symbol or name..."
            className="w-full px-4 py-3 pr-32 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-all"
          >
            Search
          </button>
        </form>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          
         <div className="absolute z-10 w-full max-w-xl mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto"> 
           {searchResults.map((result, index) => (
              <div
                key={index}
                onClick={() => handleSelectStock(result.symbol)}
                className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-white">{result.symbol}</span>
                    <span className="ml-2 text-gray-400 text-sm">{result.name}</span>
                  </div>
                  <span className="text-gray-500 text-sm">{result.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Popular Stocks - Single Row */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Popular Stocks</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {popularStocks.map((stock) => (
            <div
              key={stock.symbol}
              onClick={() => handleSelectStock(stock.symbol)}
              className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-700 hover:border-gray-600 transition-all hover:transform hover:-translate-y-1"
            >
              <div className="font-bold text-white text-lg">{stock.symbol}</div>
              <div className="text-white text-xl font-semibold">${stock.price.toFixed(2)}</div>
              <div className={`text-sm font-medium ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent})
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-gray-700">

         {/* Navigation Links */}
          <div className="flex flex-wrap justify-center gap-6 mb-4 md:mb-0">
            <a 
              href="/contact" 
              className="text-gray-400 hover:text-green-400 transition-colors text-sm font-medium"
            >
              Contact
            </a>
            <a 
              href="/blog" 
              className="text-gray-400 hover:text-green-400 transition-colors text-sm font-medium"
            >
              Blog
            </a>
            <a 
              href="/privacy" 
              className="text-gray-400 hover:text-green-400 transition-colors text-sm font-medium"
            >
              Privacy
            </a>
            <a 
              href="https://x.com/wallstsmart" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-green-400 transition-colors text-sm font-medium flex items-center gap-1"
            >
              Follow us on 
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>

     
        <div className="text-center text-gray-400 text-sm">
          <p className="mb-2"> </p>
          <p> </p>
        </div>
        
        <div className="text-center text-gray-400 text-sm">
          <p className="mb-2">© 2025 WallStSmart. Professional financial analysis.</p>
          <p></p>
        </div>
           
        
      </footer>
    </div>
  );
};

export default StockSearch;
