// 1. Create a new file: src/utils/searchTracking.ts
// This handles tracking and storing search data locally

interface SearchRecord {
  symbol: string;
  name: string;
  count: number;
  lastSearched: number;
}

const STORAGE_KEY = 'wallstsmart_search_history';
const MAX_HISTORY_ITEMS = 20;

export const trackStockSearch = (symbol: string, name: string = '') => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const history: SearchRecord[] = stored ? JSON.parse(stored) : [];
    
    const existingIndex = history.findIndex(item => item.symbol === symbol);
    
    if (existingIndex >= 0) {
      // Increment count for existing stock
      history[existingIndex].count++;
      history[existingIndex].lastSearched = Date.now();
      if (name && !history[existingIndex].name) {
        history[existingIndex].name = name;
      }
    } else {
      // Add new stock
      history.push({
        symbol,
        name,
        count: 1,
        lastSearched: Date.now()
      });
    }
    
    // Keep only top items to prevent storage bloat
    const sorted = history
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  } catch (error) {
    console.error('Error tracking search:', error);
  }
};

export const getTopSearchedStocks = (limit: number = 5): SearchRecord[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const history: SearchRecord[] = JSON.parse(stored);
    return history
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting top searches:', error);
    return [];
  }
};

// 2. Create a new component: src/components/TopSearchedStocks.tsx
import React, { useEffect, useState } from 'react';
import { TrendingUp, Search, BarChart3 } from 'lucide-react';
import { getTopSearchedStocks } from '../utils/searchTracking';

interface TopSearchedStocksProps {
  onSelectStock: (symbol: string) => void;
}

interface SearchRecord {
  symbol: string;
  name: string;
  count: number;
  lastSearched: number;
}

const TopSearchedStocks: React.FC<TopSearchedStocksProps> = ({ onSelectStock }) => {
  const [topStocks, setTopStocks] = useState<SearchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTopStocks = () => {
      const stocks = getTopSearchedStocks(5);
      setTopStocks(stocks);
      setIsLoading(false);
    };

    loadTopStocks();
    
    // Refresh every 30 seconds to show latest trends
    const interval = setInterval(loadTopStocks, 30000);
    
    // Listen for storage changes (when user searches)
    const handleStorageChange = () => loadTopStocks();
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (isLoading || topStocks.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold text-white">Trending Searches</h3>
          <span className="text-xs text-gray-500 ml-2">Real-time</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {topStocks.map((stock, index) => (
            <button
              key={stock.symbol}
              onClick={() => onSelectStock(stock.symbol)}
              className="group relative bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-green-500/50 rounded-lg p-3 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-xs font-bold text-green-500">#{index + 1}</span>
                <div className="flex items-center gap-1">
                  <Search className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-500">{stock.count}</span>
                </div>
              </div>
              
              <div className="text-left">
                <div className="font-semibold text-white group-hover:text-green-400 transition">
                  {stock.symbol}
                </div>
                {stock.name && (
                  <div className="text-xs text-gray-400 truncate mt-1">
                    {stock.name}
                  </div>
                )}
              </div>
              
              {index === 0 && (
                <div className="absolute -top-2 -right-2">
                  <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    🔥 HOT
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
        
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            <span>Based on user searches</span>
          </div>
          <span>Updates live</span>
        </div>
      </div>
    </div>
  );
};

export default TopSearchedStocks;

// 3. Update your StockSearch component to track searches
// In src/components/StockSearch.tsx, add this to your search handler:

import { trackStockSearch } from '../utils/searchTracking';

// Inside your search/select function:
const handleSelectStock = (symbol: string, name?: string) => {
  trackStockSearch(symbol, name || '');
  onSelectStock(symbol);
};

// 4. Update your HomePage in App.tsx to include TopSearchedStocks:
// Add this import at the top:
import TopSearchedStocks from './components/TopSearchedStocks';

// Then in your HomePage component, add after the search bar and before Popular Stocks:
function HomePage() {
  const navigate = useNavigate();
  
  const handleSelectStock = (symbol: string) => {
    navigate(`/stock/${symbol}`);
  };

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-20">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Professional Stock Analysis
            <span className="text-green-500 block sm:inline"> Made Simple</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 mb-6 sm:mb-8 px-4 sm:px-0">
            Smarter Decision. Smarter Returns.
          </p>
        </div>
      </div>
      
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-10 sm:pb-16 md:pb-20">
        <div className="w-full sm:max-w-[80%] md:max-w-[70%] lg:max-w-[60%] mx-auto">
          <StockSearch onSelectStock={handleSelectStock} />
        </div>
      </div>
      
      {/* Add Top Searched Stocks here */}
      <TopSearchedStocks onSelectStock={handleSelectStock} />
      
      {/* Your existing Popular Stocks section continues below */}
    </>
  );
}
