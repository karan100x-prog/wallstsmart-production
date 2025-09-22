import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Download, TrendingUp, Star, Search, ArrowUpDown, Filter, Globe, Building2, ExternalLink, Clock, AlertCircle, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Enhanced Market Screener with Smart Real-Time Data Loading
export default function EnhancedMarketScreener() {
  const navigate = useNavigate();
  
  // State for stock metadata (basic info from LISTING_STATUS)
  const [stocksMetadata, setStocksMetadata] = useState([]);
  
  // State for real-time data (actual prices and metrics)
  const [realTimeData, setRealTimeData] = useState(new Map());
  
  // Track which symbols are currently loading
  const [loadingSymbols, setLoadingSymbols] = useState(new Set());
  
  // Track failed symbol fetches to avoid retrying
  const [failedSymbols, setFailedSymbols] = useState(new Set());
  
  // General loading states
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // UI states
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'marketCap', direction: 'desc' });
  const [selectedExchange, setSelectedExchange] = useState('all');
  const [cacheAge, setCacheAge] = useState(null);
  
  // Watchlist
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('wallstsmart_watchlist');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Market statistics
  const [marketStats, setMarketStats] = useState({
    totalStocks: 0,
    activeStocks: 0,
    exchanges: []
  });
  
  // Ref to track current fetch queue
  const fetchQueueRef = useRef([]);
  const isFetchingRef = useRef(false);
  
  const stocksPerPage = 100;
  const API_KEY = 'NMSRS0ZDIOWF3CLL';
  const METADATA_CACHE_KEY = 'wallstsmart_stocks_metadata';
  const REALTIME_CACHE_KEY = 'wallstsmart_realtime_data';
  const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for real-time data
  
  // Priority stocks to always fetch first
  const PRIORITY_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'BRK.B', 'JPM', 'V'];

  // Toggle watchlist
  const toggleWatchlist = (symbol) => {
    setWatchlist(prev => {
      const isInWatchlist = prev.includes(symbol);
      const newWatchlist = isInWatchlist 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol];
      
      localStorage.setItem('wallstsmart_watchlist', JSON.stringify(newWatchlist));
      return newWatchlist;
    });
  };

  // Check if stock is in watchlist
  const isInWatchlist = (symbol) => watchlist.includes(symbol);

  // Parse CSV from Alpha Vantage
  const parseCSVToStocks = (csvText) => {
    const lines = csvText.split('\n');
    const stocks = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const matches = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (matches && matches.length >= 7) {
          const values = matches.map(val => val.replace(/^"|"$/g, '').trim());
          
          const stock = {
            symbol: values[0],
            name: values[1],
            exchange: values[2],
            assetType: values[3],
            ipoDate: values[4],
            delistingDate: values[5] || null,
            status: values[6] || 'Active'
          };
          
          // Include active stocks and ETFs
          if (stock.status === 'Active' && (stock.assetType === 'Stock' || stock.assetType === 'ETF')) {
            stocks.push(stock);
          }
        }
      }
    }
    
    return stocks;
  };

  // Fetch real-time quote for a single symbol
  const fetchRealTimeQuote = async (symbol) => {
    try {
      // Check if already loading or failed
      if (loadingSymbols.has(symbol) || failedSymbols.has(symbol)) {
        return null;
      }
      
      setLoadingSymbols(prev => new Set([...prev, symbol]));
      
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const quote = data['Global Quote'];
        
        if (quote && quote['05. price']) {
          const realData = {
            symbol: symbol,
            price: parseFloat(quote['05. price']) || 0,
            change: parseFloat(quote['09. change']) || 0,
            changePercent: parseFloat(quote['10. change percent']?.replace('%', '')) || 0,
            volume: parseInt(quote['06. volume']) || 0,
            dayHigh: parseFloat(quote['03. high']) || 0,
            dayLow: parseFloat(quote['04. low']) || 0,
            previousClose: parseFloat(quote['08. previous close']) || 0,
            timestamp: Date.now(),
            hasRealData: true
          };
          
          // Calculate market cap estimate if we have price
          if (realData.price > 0) {
            // Rough market cap estimate based on typical shares outstanding
            const estimatedShares = symbol.includes('.') ? 5000000000 : 1000000000;
            realData.marketCap = Math.floor(realData.price * estimatedShares);
          }
          
          return realData;
        }
      }
      
      // Mark as failed to avoid retrying
      setFailedSymbols(prev => new Set([...prev, symbol]));
      return null;
      
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      setFailedSymbols(prev => new Set([...prev, symbol]));
      return null;
    } finally {
      setLoadingSymbols(prev => {
        const next = new Set(prev);
        next.delete(symbol);
        return next;
      });
    }
  };

  // Fetch company overview for fundamental data
  const fetchCompanyOverview = async (symbol) => {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`
      );
      
      if (response.ok) {
        const overview = await response.json();
        
        if (overview && overview.Symbol) {
          return {
            marketCap: parseFloat(overview.MarketCapitalization) || 0,
            peRatio: parseFloat(overview.PERatio) || 0,
            dividendYield: parseFloat(overview.DividendYield) * 100 || 0,
            eps: parseFloat(overview.EPS) || 0,
            beta: parseFloat(overview.Beta) || 0,
            yearHigh: parseFloat(overview['52WeekHigh']) || 0,
            yearLow: parseFloat(overview['52WeekLow']) || 0,
            roe: parseFloat(overview.ReturnOnEquityTTM) * 100 || 0,
            profitMargin: parseFloat(overview.ProfitMargin) * 100 || 0
          };
        }
      }
    } catch (error) {
      console.error(`Error fetching overview for ${symbol}:`, error);
    }
    return null;
  };

  // Process fetch queue
  const processFetchQueue = async () => {
    if (isFetchingRef.current || fetchQueueRef.current.length === 0) {
      return;
    }
    
    isFetchingRef.current = true;
    
    while (fetchQueueRef.current.length > 0) {
      const symbol = fetchQueueRef.current.shift();
      
      if (!realTimeData.has(symbol) && !loadingSymbols.has(symbol) && !failedSymbols.has(symbol)) {
        const quoteData = await fetchRealTimeQuote(symbol);
        
        if (quoteData) {
          setRealTimeData(prev => {
            const next = new Map(prev);
            next.set(symbol, quoteData);
            
            // Save to cache
            const cacheData = Array.from(next.entries());
            localStorage.setItem(REALTIME_CACHE_KEY, JSON.stringify(cacheData));
            localStorage.setItem(REALTIME_CACHE_KEY + '_timestamp', Date.now().toString());
            
            return next;
          });
        }
        
        // Rate limiting - respect 75 calls/minute (be conservative)
        await new Promise(resolve => setTimeout(resolve, 850));
      }
    }
    
    isFetchingRef.current = false;
  };

  // Add symbols to fetch queue
  const queueSymbolsForFetch = (symbols) => {
    const uniqueSymbols = [...new Set(symbols)];
    const newSymbols = uniqueSymbols.filter(s => 
      !fetchQueueRef.current.includes(s) &&
      !realTimeData.has(s) &&
      !loadingSymbols.has(s) &&
      !failedSymbols.has(s)
    );
    
    fetchQueueRef.current.push(...newSymbols);
    processFetchQueue();
  };

  // Fetch stock metadata (listing)
  const fetchStockMetadata = async () => {
    setLoading(true);
    try {
      console.log('Fetching stock metadata from Alpha Vantage...');
      
      const response = await fetch(
        `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${API_KEY}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch listing data');
      
      const csvText = await response.text();
      const stocks = parseCSVToStocks(csvText);
      
      setStocksMetadata(stocks);
      updateMarketStats(stocks);
      
      // Cache metadata
      localStorage.setItem(METADATA_CACHE_KEY, JSON.stringify(stocks));
      localStorage.setItem(METADATA_CACHE_KEY + '_timestamp', Date.now().toString());
      
      console.log(`Loaded ${stocks.length} stocks metadata`);
      
      // Queue priority symbols for immediate fetch
      queueSymbolsForFetch(PRIORITY_SYMBOLS);
      
    } catch (error) {
      console.error('Error fetching metadata:', error);
      loadMetadataFromCache();
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Load metadata from cache
  const loadMetadataFromCache = () => {
    const cached = localStorage.getItem(METADATA_CACHE_KEY);
    if (cached) {
      const stocks = JSON.parse(cached);
      setStocksMetadata(stocks);
      updateMarketStats(stocks);
      return true;
    }
    return false;
  };

  // Load real-time data from cache
  const loadRealTimeDataFromCache = () => {
    const cached = localStorage.getItem(REALTIME_CACHE_KEY);
    const timestamp = localStorage.getItem(REALTIME_CACHE_KEY + '_timestamp');
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      
      if (age < CACHE_DURATION) {
        const data = JSON.parse(cached);
        setRealTimeData(new Map(data));
        setCacheAge(age);
        return true;
      }
    }
    return false;
  };

  // Update market statistics
  const updateMarketStats = (stocks) => {
    const exchanges = [...new Set(stocks.map(s => s.exchange))].filter(Boolean);
    setMarketStats({
      totalStocks: stocks.length,
      activeStocks: stocks.filter(s => s.status === 'Active').length,
      exchanges: exchanges
    });
  };

  // Navigate to stock detail
  const navigateToStock = (symbol) => {
    navigate(`/stock/${symbol}`);
  };

  // Format large numbers
  const formatNumber = (num, format) => {
    if (!num || isNaN(num)) return '-';
    
    if (format === 'currency' || format === 'marketCap') {
      if (num >= 1000000000000) return `$${(num / 1000000000000).toFixed(2)}T`;
      if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
      if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
      if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
      return `$${num.toFixed(0)}`;
    }
    if (format === 'volume') {
      if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
      return num.toLocaleString();
    }
    return num.toLocaleString();
  };

  // Format cache age
  const formatCacheAge = (ageInMs) => {
    if (!ageInMs) return null;
    
    const minutes = Math.floor(ageInMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m ago`;
    }
    return `${minutes}m ago`;
  };

  // Combine metadata with real-time data
  const getCombinedStockData = () => {
    return stocksMetadata.map(stock => {
      const realData = realTimeData.get(stock.symbol);
      
      if (realData) {
        return {
          ...stock,
          ...realData,
          hasRealData: true
        };
      }
      
      // Return metadata with placeholder indicators
      return {
        ...stock,
        price: 0,
        change: 0,
        changePercent: 0,
        marketCap: 0,
        peRatio: 0,
        dividendYield: 0,
        volume: 0,
        hasRealData: false
      };
    });
  };

  // Filter and sort stocks
  const getFilteredAndSortedStocks = () => {
    let filtered = getCombinedStockData();
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(stock => 
        stock.symbol.toLowerCase().includes(term) ||
        stock.name.toLowerCase().includes(term)
      );
    }
    
    // Filter by exchange
    if (selectedExchange !== 'all') {
      filtered = filtered.filter(stock => stock.exchange === selectedExchange);
    }
    
    // Sort - prioritize stocks with real data
    filtered.sort((a, b) => {
      // First, sort by whether they have real data
      if (a.hasRealData && !b.hasRealData) return -1;
      if (!a.hasRealData && b.hasRealData) return 1;
      
      // Then sort by the selected field
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Handle numeric values
      if (!isNaN(aVal) && !isNaN(bVal)) {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      
      if (sortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    return filtered;
  };

  // Handle sort
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Refresh all data
  const handleRefresh = async () => {
    console.log('Manual refresh requested');
    setFailedSymbols(new Set()); // Clear failed symbols to retry
    fetchQueueRef.current = []; // Clear queue
    await fetchStockMetadata();
    
    // Queue visible stocks for immediate refresh
    const visible = getCurrentPageStocks();
    const symbols = visible.map(s => s.symbol);
    queueSymbolsForFetch(symbols);
  };

  // Export to CSV
  const exportToCSV = () => {
    const filtered = getFilteredAndSortedStocks();
    const pageStocks = filtered.slice((currentPage - 1) * stocksPerPage, currentPage * stocksPerPage);
    
    const headers = ['Symbol', 'Company', 'Exchange', 'Price', 'Change %', 'Market Cap', 'Volume', 'Data Status', 'In Watchlist'];
    const csvData = pageStocks.map(stock => [
      stock.symbol,
      `"${stock.name}"`,
      stock.exchange,
      stock.hasRealData ? stock.price : 'N/A',
      stock.hasRealData ? stock.changePercent : 'N/A',
      stock.hasRealData && stock.marketCap ? stock.marketCap : 'N/A',
      stock.hasRealData ? stock.volume : 'N/A',
      stock.hasRealData ? 'Real-Time' : 'Pending',
      isInWatchlist(stock.symbol) ? 'Yes' : 'No'
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallstsmart_screener_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get current page stocks
  const getCurrentPageStocks = () => {
    const filtered = getFilteredAndSortedStocks();
    const startIndex = (currentPage - 1) * stocksPerPage;
    const endIndex = startIndex + stocksPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Calculate pagination
  const filtered = getFilteredAndSortedStocks();
  const totalStocks = filtered.length;
  const totalPages = Math.ceil(totalStocks / stocksPerPage);
  
  // Generate page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 7;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Initial load
  useEffect(() => {
    // Load cached metadata
    const hasMetadata = loadMetadataFromCache();
    
    // Load cached real-time data
    loadRealTimeDataFromCache();
    
    // Fetch fresh metadata if not cached
    if (!hasMetadata) {
      fetchStockMetadata();
    } else {
      setInitialLoad(false);
      // Queue priority symbols
      queueSymbolsForFetch(PRIORITY_SYMBOLS);
    }
  }, []);

  // Fetch data for visible stocks when page changes
  useEffect(() => {
    if (stocksMetadata.length === 0) return;
    
    const visible = getCurrentPageStocks();
    const symbols = visible
      .filter(s => !s.hasRealData)
      .map(s => s.symbol)
      .slice(0, 10); // Fetch up to 10 at a time
    
    if (symbols.length > 0) {
      queueSymbolsForFetch(symbols);
    }
  }, [currentPage, searchTerm, selectedExchange, sortConfig, stocksMetadata]);

  // Fetch watchlist stocks on mount
  useEffect(() => {
    if (watchlist.length > 0 && stocksMetadata.length > 0) {
      queueSymbolsForFetch(watchlist);
    }
  }, [watchlist, stocksMetadata]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedExchange, sortConfig]);

  const displayedStocks = getCurrentPageStocks();
  const stocksWithRealData = displayedStocks.filter(s => s.hasRealData).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                Smart Screener
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                <span className="text-green-400 font-semibold">{marketStats.totalStocks.toLocaleString()}</span> stocks • 
                <span className="text-blue-400 font-semibold ml-2">{marketStats.exchanges.length}</span> exchanges • 
                <span className="text-yellow-400 font-semibold ml-2">
                  {stocksWithRealData}/{displayedStocks.length} with real-time data
                </span>
                {watchlist.length > 0 && (
                  <span className="text-purple-400 ml-2">
                    • <Star className="inline w-3 h-3 mr-1 fill-current" />
                    {watchlist.length} watchlist
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Real-time data loading indicator */}
        {loadingSymbols.size > 0 && (
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 mb-4 flex items-center gap-3">
            <Loader className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
            <p className="text-sm text-blue-200">
              Loading real-time data for {loadingSymbols.size} symbol{loadingSymbols.size > 1 ? 's' : ''}...
            </p>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-gray-900 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by symbol or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm 
                           text-white placeholder-gray-500 
                           focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
              
              {/* Exchange Filter */}
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedExchange}
                  onChange={(e) => setSelectedExchange(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white
                           focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  <option value="all">All Exchanges</option>
                  <option value="NYSE">NYSE</option>
                  <option value="NASDAQ">NASDAQ</option>
                  <option value="AMEX">AMEX</option>
                  <option value="TSX">TSX</option>
                  <option value="LSE">LSE</option>
                  <option value="XETRA">XETRA</option>
                </select>
              </div>
            </div>
            
            {/* Results count */}
            <div className="text-sm text-gray-400">
              Showing {((currentPage - 1) * stocksPerPage) + 1} - {Math.min(currentPage * stocksPerPage, totalStocks)} of {totalStocks.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Main Table */}
        {initialLoad && loading ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <RefreshCw className="w-12 h-12 text-green-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">Loading Market Data...</h3>
            <p className="text-gray-500">Fetching stocks from global exchanges</p>
          </div>
        ) : displayedStocks.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No stocks found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 rounded-xl overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-850">
                      <th className="sticky left-0 bg-gray-850 z-10 text-left px-4 py-3">
                        <button
                          onClick={() => handleSort('symbol')}
                          className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1"
                        >
                          Symbol
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 min-w-[200px]">
                        <button
                          onClick={() => handleSort('name')}
                          className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1"
                        >
                          Company
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Exchange
                        </span>
                      </th>
                      <th className="text-right px-4 py-3">
                        <button
                          onClick={() => handleSort('price')}
                          className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto"
                        >
                          Price
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-right px-4 py-3">
                        <button
                          onClick={() => handleSort('changePercent')}
                          className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto"
                        >
                          Change
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-right px-4 py-3">
                        <button
                          onClick={() => handleSort('marketCap')}
                          className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto"
                        >
                          Market Cap
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-right px-4 py-3">
                        <button
                          onClick={() => handleSort('volume')}
                          className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto"
                        >
                          Volume
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-center px-4 py-3">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Actions
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedStocks.map((stock, index) => (
                      <tr 
                        key={`${stock.symbol}-${index}`} 
                        className={`border-b border-gray-800 hover:bg-gray-850 transition-colors ${
                          index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'
                        } ${!stock.hasRealData ? 'opacity-60' : ''}`}
                      >
                        <td className="sticky left-0 z-10 px-4 py-3 bg-inherit">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => navigateToStock(stock.symbol)}
                              className="font-medium text-blue-400 hover:text-blue-300 hover:underline transition-colors text-left group flex items-center gap-1"
                            >
                              {stock.symbol}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            {loadingSymbols.has(stock.symbol) && (
                              <Loader className="w-3 h-3 text-gray-400 animate-spin" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => navigateToStock(stock.symbol)}
                            className="text-sm text-gray-300 hover:text-white transition-colors max-w-xs truncate block text-left" 
                            title={stock.name}
                          >
                            {stock.name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 bg-gray-800 rounded text-xs font-medium text-gray-300">
                            {stock.exchange}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {stock.hasRealData ? (
                            `$${stock.price.toFixed(2)}`
                          ) : (
                            <span className="text-gray-500">--</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${
                          stock.hasRealData ? (
                            stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                          ) : 'text-gray-500'
                        }`}>
                          {stock.hasRealData ? (
                            `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%`
                          ) : (
                            '--'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {stock.hasRealData && stock.marketCap ? 
                            formatNumber(stock.marketCap, 'marketCap') : 
                            <span className="text-gray-500">--</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {stock.hasRealData && stock.volume ? 
                            formatNumber(stock.volume, 'volume') : 
                            <span className="text-gray-500">--</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => toggleWatchlist(stock.symbol)}
                              className="p-1.5 hover:bg-gray-800 rounded-lg transition-all group"
                              title={isInWatchlist(stock.symbol) ? "Remove from watchlist" : "Add to watchlist"}
                            >
                              <Star 
                                className={`w-4 h-4 transition-all ${
                                  isInWatchlist(stock.symbol)
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-400 group-hover:text-yellow-400'
                                }`}
                              />
                            </button>
                            {!stock.hasRealData && !loadingSymbols.has(stock.symbol) && (
                              <button
                                onClick={() => queueSymbolsForFetch([stock.symbol])}
                                className="p-1.5 hover:bg-gray-800 rounded-lg transition-all group"
                                title="Load real-time data"
                              >
                                <RefreshCw className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-900 rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, index) => (
                        page === '...' ? (
                          <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">...</span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold'
                                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-400">Jump to page:</span>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const page = parseInt(e.target.value);
                        if (page >= 1 && page <= totalPages) {
                          setCurrentPage(page);
                        }
                      }}
                      className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-center text-white
                               focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    />
                    <span className="text-gray-400">of {totalPages.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
