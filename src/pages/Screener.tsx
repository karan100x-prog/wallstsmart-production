import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Download, TrendingUp, Star, Search, ArrowUpDown, Filter, Globe, Building2, ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Enhanced Market Screener with Accurate Data and Additional Columns
export default function EnhancedMarketScreener() {
  const navigate = useNavigate();
  const [allStocksData, setAllStocksData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'marketCap', direction: 'desc' });
  const [selectedExchange, setSelectedExchange] = useState('all');
  const [cacheAge, setCacheAge] = useState(null);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('wallstsmart_watchlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [marketStats, setMarketStats] = useState({
    totalStocks: 0,
    activeStocks: 0,
    delistedStocks: 0,
    exchanges: []
  });
  
  const stocksPerPage = 100;
  const API_KEY = 'NMSRS0ZDIOWF3CLL';
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Map exchanges to countries
  const exchangeToCountry = {
    'NYSE': 'USA',
    'NASDAQ': 'USA',
    'AMEX': 'USA',
    'TSX': 'Canada',
    'LSE': 'UK',
    'XETRA': 'Germany',
    'EURONEXT': 'France',
    'TSE': 'Japan',
    'HKEX': 'Hong Kong',
    'ASX': 'Australia',
    'BSE': 'India',
    'NSE': 'India',
    'SSE': 'China',
    'SZSE': 'China'
  };

  // Industry classifications for common stocks
  const stockIndustries = {
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'GOOGL': 'Technology',
    'AMZN': 'E-Commerce',
    'META': 'Social Media',
    'NVDA': 'Semiconductors',
    'TSLA': 'Automotive',
    'BRK.B': 'Diversified',
    'JPM': 'Banking',
    'V': 'Payments',
    'JNJ': 'Healthcare',
    'WMT': 'Retail',
    'PG': 'Consumer Goods',
    'UNH': 'Healthcare',
    'HD': 'Retail',
    'MA': 'Payments',
    'DIS': 'Entertainment',
    'BAC': 'Banking',
    'PFE': 'Pharmaceuticals',
    'NFLX': 'Entertainment'
  };

  // Fetch ALL stocks from Alpha Vantage LISTING_STATUS
  const fetchAllStocksFromAPI = async (skipCache = false) => {
    setLoading(true);
    try {
      console.log('Fetching fresh data from Alpha Vantage API...');
      
      // Fetch complete listing of ALL stocks
      const listingResponse = await fetch(
        `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${API_KEY}`
      );
      
      if (!listingResponse.ok) throw new Error('Failed to fetch listing data');
      
      const csvText = await listingResponse.text();
      const stocks = parseCSVToStocks(csvText);
      
      // Get additional data for top stocks with company overview
      const enhancedStocks = await enhanceStocksWithRealData(stocks);
      
      setAllStocksData(enhancedStocks);
      updateMarketStats(enhancedStocks);
      
      // Save to localStorage for faster subsequent loads
      localStorage.setItem('wallstsmart_stocks', JSON.stringify(enhancedStocks));
      localStorage.setItem('wallstsmart_stocks_timestamp', Date.now().toString());
      
      setCacheAge(null);
      
      console.log('Fresh data fetched and cached successfully');
      
    } catch (error) {
      console.error('Error fetching stocks:', error);
      if (!skipCache) {
        console.log('Falling back to cached data...');
        loadFromCache();
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

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
            status: values[6] || 'Active',
            // Initialize with null values for accuracy
            price: null,
            change: null,
            changePercent: null,
            marketCap: null,
            peRatio: null,
            psRatio: null,
            volume: null,
            avgVolume: null,
            dayHigh: null,
            dayLow: null,
            yearHigh: null,
            yearLow: null,
            beta: null,
            eps: null,
            industry: null,
            country: exchangeToCountry[values[2]] || 'Unknown'
          };
          
          if (stock.status === 'Active' && (stock.assetType === 'Stock' || stock.assetType === 'ETF')) {
            stocks.push(stock);
          }
        }
      }
    }
    
    console.log(`Parsed ${stocks.length} active stocks from Alpha Vantage`);
    return stocks;
  };

  // Enhance stocks with real data from multiple endpoints
  const enhanceStocksWithRealData = async (stocks) => {
    const enhancedStocks = [...stocks];
    
    // Priority list of major stocks to fetch detailed data
    const prioritySymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'BRK.B', 
      'JPM', 'V', 'JNJ', 'WMT', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'BAC', 
      'PFE', 'NFLX', 'INTC', 'CSCO', 'VZ', 'ADBE', 'CRM', 'NKE', 'PEP', 
      'KO', 'ABT', 'TMO', 'COST', 'AVGO', 'ORCL', 'ACN', 'TXN', 'MCD',
      'DHR', 'NEE', 'UPS', 'MDT', 'BMY', 'LIN', 'HON', 'QCOM', 'LOW',
      'CVX', 'AMGN', 'SBUX', 'IBM', 'GS', 'BLK', 'INTU', 'CAT', 'AXP'
    ];

    // Fetch bulk quotes for first 100 stocks
    const firstBatch = stocks.slice(0, 100).map(s => s.symbol).join(',');
    
    try {
      const bulkResponse = await fetch(
        `https://www.alphavantage.co/query?function=REALTIME_BULK_QUOTES&symbol=${firstBatch}&datatype=json&apikey=${API_KEY}`
      );
      
      if (bulkResponse.ok) {
        const bulkData = await bulkResponse.json();
        
        if (bulkData.data && Array.isArray(bulkData.data)) {
          bulkData.data.forEach(quote => {
            const stockIndex = enhancedStocks.findIndex(s => s.symbol === quote.symbol);
            if (stockIndex !== -1) {
              const price = parseFloat(quote.price) || null;
              const volume = parseInt(quote.volume) || null;
              
              enhancedStocks[stockIndex] = {
                ...enhancedStocks[stockIndex],
                price: price,
                volume: volume,
                change: parseFloat(quote.change) || null,
                changePercent: parseFloat(quote.change_percentage?.replace('%', '')) || null,
                dayHigh: parseFloat(quote.high) || null,
                dayLow: parseFloat(quote.low) || null
              };
            }
          });
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
    } catch (error) {
      console.error('Error fetching bulk quotes:', error);
    }

    // Fetch detailed data for priority stocks
    for (const symbol of prioritySymbols) {
      const stockIndex = enhancedStocks.findIndex(s => s.symbol === symbol);
      if (stockIndex === -1) continue;
      
      try {
        // Fetch company overview for fundamental data
        const overviewResponse = await fetch(
          `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`
        );
        
        if (overviewResponse.ok) {
          const overview = await overviewResponse.json();
          
          if (overview && !overview.Note) {
            enhancedStocks[stockIndex] = {
              ...enhancedStocks[stockIndex],
              marketCap: parseFloat(overview.MarketCapitalization) || null,
              peRatio: parseFloat(overview.PERatio) || null,
              eps: parseFloat(overview.EPS) || null,
              beta: parseFloat(overview.Beta) || null,
              yearHigh: parseFloat(overview['52WeekHigh']) || null,
              yearLow: parseFloat(overview['52WeekLow']) || null,
              industry: overview.Industry || stockIndustries[symbol] || 'Unknown',
              country: overview.Country || enhancedStocks[stockIndex].country,
              // Calculate P/S ratio
              psRatio: overview.MarketCapitalization && overview.RevenueTTM 
                ? (parseFloat(overview.MarketCapitalization) / parseFloat(overview.RevenueTTM)).toFixed(2) 
                : null
            };
          }
        }
        
        // If we still don't have price, fetch GLOBAL_QUOTE
        if (!enhancedStocks[stockIndex].price) {
          const quoteResponse = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
          );
          
          if (quoteResponse.ok) {
            const data = await quoteResponse.json();
            const quote = data['Global Quote'];
            
            if (quote) {
              enhancedStocks[stockIndex] = {
                ...enhancedStocks[stockIndex],
                price: parseFloat(quote['05. price']) || null,
                change: parseFloat(quote['09. change']) || null,
                changePercent: parseFloat(quote['10. change percent']?.replace('%', '')) || null,
                volume: parseInt(quote['06. volume']) || null,
                dayHigh: parseFloat(quote['03. high']) || null,
                dayLow: parseFloat(quote['04. low']) || null
              };
            }
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 800));
        
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
      }
    }
    
    // Add industry data for stocks we know
    enhancedStocks.forEach(stock => {
      if (!stock.industry && stockIndustries[stock.symbol]) {
        stock.industry = stockIndustries[stock.symbol];
      }
      // Default to 'Unknown' if no industry data
      if (!stock.industry) {
        stock.industry = 'Unknown';
      }
    });
    
    return enhancedStocks;
  };

  // Load from cache
  const loadFromCache = () => {
    const cached = localStorage.getItem('wallstsmart_stocks');
    const timestamp = localStorage.getItem('wallstsmart_stocks_timestamp');
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      const stocks = JSON.parse(cached);
      setAllStocksData(stocks);
      updateMarketStats(stocks);
      setCacheAge(age);
      
      const hoursOld = Math.floor(age / (1000 * 60 * 60));
      const minutesOld = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));
      console.log(`Loaded cached data (${hoursOld}h ${minutesOld}m old)`);
      
      return true;
    }
    return false;
  };

  // Update market statistics
  const updateMarketStats = (stocks) => {
    const exchanges = [...new Set(stocks.map(s => s.exchange))].filter(Boolean);
    setMarketStats({
      totalStocks: stocks.length,
      activeStocks: stocks.filter(s => s.status === 'Active').length,
      delistedStocks: stocks.filter(s => s.status === 'Delisted').length,
      exchanges: exchanges
    });
  };

  // Toggle watchlist
  const toggleWatchlist = (symbol) => {
    const newWatchlist = watchlist.includes(symbol)
      ? watchlist.filter(s => s !== symbol)
      : [...watchlist, symbol];
    
    setWatchlist(newWatchlist);
    localStorage.setItem('wallstsmart_watchlist', JSON.stringify(newWatchlist));
  };

  // Navigate to stock detail page
  const navigateToStock = (symbol) => {
    navigate(`/stock/${symbol}`);
  };

  // Format large numbers
  const formatNumber = (num, format) => {
    if (num === null || num === undefined) return '-';
    
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
    if (format === 'decimal') {
      return num.toFixed(2);
    }
    return num.toLocaleString();
  };

  // Format cache age
  const formatCacheAge = (ageInMs) => {
    if (!ageInMs) return null;
    
    const hours = Math.floor(ageInMs / (1000 * 60 * 60));
    const minutes = Math.floor((ageInMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${minutes}m ago`;
  };

  // Filter and sort stocks
  const getFilteredAndSortedStocks = () => {
    let filtered = [...allStocksData];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(stock => 
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by exchange
    if (selectedExchange !== 'all') {
      filtered = filtered.filter(stock => stock.exchange === selectedExchange);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Handle null values
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bVal === null) return sortConfig.direction === 'asc' ? -1 : 1;
      
      // Handle numeric values
      if (!isNaN(aVal) && !isNaN(bVal)) {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
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

  // Refresh data
  const handleRefresh = async () => {
    console.log('Manual refresh requested');
    setForceRefresh(true);
    await fetchAllStocksFromAPI(true);
    setForceRefresh(false);
  };

  // Export to CSV
  const exportToCSV = () => {
    const filtered = getFilteredAndSortedStocks();
    const pageStocks = filtered.slice((currentPage - 1) * stocksPerPage, currentPage * stocksPerPage);
    
    const headers = ['Symbol', 'Company', 'Exchange', 'Country', 'Industry', 'Price', 'Change %', 'Market Cap', 'P/E', 'P/S', 'Volume'];
    const csvData = pageStocks.map(stock => [
      stock.symbol,
      `"${stock.name}"`,
      stock.exchange,
      stock.country || '',
      `"${stock.industry || ''}"`,
      stock.price || '',
      stock.changePercent || '',
      stock.marketCap || '',
      stock.peRatio || '',
      stock.psRatio || '',
      stock.volume || ''
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallstsmart_screener_page_${currentPage}_${new Date().toISOString().split('T')[0]}.csv`;
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
    if (forceRefresh) return;
    
    const cached = localStorage.getItem('wallstsmart_stocks');
    const timestamp = localStorage.getItem('wallstsmart_stocks_timestamp');
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      
      if (age < CACHE_DURATION) {
        console.log(`Using cached data (${Math.round(age / 1000 / 60)} minutes old)`);
        loadFromCache();
        setInitialLoad(false);
        return;
      } else {
        console.log('Cache expired, fetching fresh data');
      }
    } else {
      console.log('No cache found, fetching initial data');
    }
    
    fetchAllStocksFromAPI();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedExchange, sortConfig]);

  const displayedStocks = getCurrentPageStocks();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                Market Screener
              </h1>
              <p className="text-gray-400 text-xs mt-1">
                <span className="text-green-400 font-semibold">{marketStats.totalStocks.toLocaleString()}</span> total stocks • 
                <span className="text-blue-400 font-semibold ml-2">{marketStats.exchanges.length}</span> exchanges • 
                <span className="text-yellow-400 font-semibold ml-2">
                  {cacheAge ? 'Cached data' : 'Real-time data'}
                </span>
                {cacheAge && (
                  <span className="text-gray-500 ml-2">
                    <Clock className="inline w-3 h-3 mr-1" />
                    Updated {formatCacheAge(cacheAge)}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
                title="Fetch fresh data from API"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportToCSV}
                className="px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 py-4">
        {/* Cache Notice */}
        {cacheAge && cacheAge > 12 * 60 * 60 * 1000 && (
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-2 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-yellow-200">
                Data is {formatCacheAge(cacheAge)} old. Click refresh to get the latest market data.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="text-yellow-400 hover:text-yellow-300 text-xs font-medium"
            >
              Refresh Now
            </button>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="bg-gray-900 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by symbol or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs 
                           text-white placeholder-gray-500 
                           focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
              
              {/* Exchange Filter */}
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3 text-gray-400" />
                <select
                  value={selectedExchange}
                  onChange={(e) => setSelectedExchange(e.target.value)}
                  className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white
                           focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  <option value="all">All Exchanges</option>
                  <option value="NYSE">NYSE</option>
                  <option value="NASDAQ">NASDAQ</option>
                  <option value="AMEX">AMEX</option>
                  <option value="TSX">TSX</option>
                  <option value="LSE">LSE</option>
                  <option value="XETRA">XETRA</option>
                  <option value="EURONEXT">Euronext</option>
                  <option value="TSE">TSE</option>
                  <option value="HKEX">HKEX</option>
                </select>
              </div>
            </div>
            
            {/* Results count */}
            <div className="text-xs text-gray-400">
              {totalStocks > 0 && (
                <>
                  Showing {((currentPage - 1) * stocksPerPage) + 1} - {Math.min(currentPage * stocksPerPage, totalStocks)} 
                  {' '}of {totalStocks.toLocaleString()}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Table */}
        {initialLoad && loading ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center">
            <RefreshCw className="w-10 h-10 text-green-500 mx-auto mb-3 animate-spin" />
            <h3 className="text-sm font-medium text-gray-300 mb-1">Loading Market Data...</h3>
            <p className="text-xs text-gray-500">Fetching real-time stock information</p>
          </div>
        ) : displayedStocks.length === 0 && !loading ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center">
            <Search className="w-10 h-10 text-gray-500 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-300 mb-1">No stocks found</h3>
            <p className="text-xs text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 rounded-xl overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-850">
                      <th className="sticky left-0 bg-gray-850 z-10 text-left px-3 py-2">
                        <button
                          onClick={() => handleSort('symbol')}
                          className="text-[10px] font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1"
                        >
                          Symbol
                          <ArrowUpDown className="w-2.5 h-2.5" />
                        </button>
                      </th>
                      <th className="text-left px-3 py-2 min-w-[150px]">
                        <button
                          onClick={() => handleSort('name')}
                          className="text-[10px] font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1"
                        >
                          Company
                          <ArrowUpDown className="w-2.5 h-2.5" />
                        </button>
                      </th>
                      <th className="text-left px-3 py-2">
                        <button
                          onClick={() => handleSort('exchange')}
                          className="text-[10px] font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1"
                        >
                          Exchange
                          <ArrowUpDown className="w-2.5 h-2.5" />
                        </button>
                      </th>
                      <th className="text-left px-3 py-2">
                        <button
                          onClick={() => handleSort('country')}
                          className="text-[10px] font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1"
                        >
                          Country
                          <ArrowUpDown className="w-2.5 h-2.5" />
                        </button>
                      </th>
                      <th className="text-left px-3 py-2 min-w-[100px]">
                        <button
                          onClick={() => handleSort('industry')}
                          className="text-[10px] font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1"
                        >
                          Industry
                          <ArrowUpDown className="w-2.5 h-2.5" />
                        </button>
                      </th>
                      <th className="text-right px-3 py-2">
                        <button
                          onClick={() => handleSort('price')}
                          className="text-[10px] font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto"
                        >
                          Price
                          <ArrowUpDown className="w-2.5 h-2.5" />
                        </button>
                      </th>
                      <th className="text-right px-3 py-2">
                        <button
                          onClick={() => handleSort('changePercent')}
                          className="text-[10px] font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto"
                        >
                          Change
                          <ArrowUpDown className="w-2.5 h-2.5" />
                        </button>
                      </th>
                      <th className="text-right px-3 py-2">
                        <button
                          onClick={() => handleSort('volume')}
                          className="text-[10px] font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto"
                        >
                          Volume
                          <ArrowUpDown className="w-2.5 h-2.5" />
                        </button>
                      </th>
                      <th className="text-right px-3 py-2">
                        <button
                          onClick={() => handleSort('marketCap')}
                          className="text-[10px] font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto"
                        >
                          Mkt Cap
                          <ArrowUpDown className="w-2.5 h-2.5" />
                        </button>
                      </th>
                      <th className="text-right px-3 py-2">
                        <button
                          onClick={() => handleSort('peRatio')}
                          className="text-[10px] font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto"
                        >
                          P/E
                          <ArrowUpDown className="w-2.5 h-2.5" />
                        </button>
                      </th>
                      <th className="text-right px-3 py-2">
                        <button
                          onClick={() => handleSort('psRatio')}
                          className="text-[10px] font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto"
                        >
                          P/S
                          <ArrowUpDown className="w-2.5 h-2.5" />
                        </button>
                      </th>
                      <th className="text-center px-3 py-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        Watch
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedStocks.map((stock, index) => (
                      <tr 
                        key={`${stock.symbol}-${stock.exchange}-${index}`} 
                        className={`border-b border-gray-800 hover:bg-gray-850 transition-colors ${
                          index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'
                        }`}
                      >
                        <td className="sticky left-0 z-10 px-3 py-2 bg-inherit">
                          <button 
                            onClick={() => navigateToStock(stock.symbol)}
                            className="font-medium text-blue-400 hover:text-blue-300 hover:underline transition-colors text-left group flex items-center gap-1 text-xs"
                          >
                            {stock.symbol}
                            <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <button 
                            onClick={() => navigateToStock(stock.symbol)}
                            className="text-[11px] text-gray-300 hover:text-white transition-colors max-w-[150px] truncate block text-left" 
                            title={stock.name}
                          >
                            {stock.name}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] font-medium text-gray-300">
                            {stock.exchange}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-400">
                          {stock.country}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-400">
                          <span className="truncate block max-w-[100px]" title={stock.industry}>
                            {stock.industry}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-xs">
                          {stock.price !== null ? `$${parseFloat(stock.price).toFixed(2)}` : '-'}
                        </td>
                        <td className={`px-3 py-2 text-right font-medium text-xs ${
                          stock.changePercent !== null && parseFloat(stock.changePercent) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {stock.changePercent !== null 
                            ? `${parseFloat(stock.changePercent) >= 0 ? '+' : ''}${parseFloat(stock.changePercent).toFixed(2)}%`
                            : '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px]">
                          {formatNumber(stock.volume, 'volume')}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px]">
                          {formatNumber(stock.marketCap, 'marketCap')}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px]">
                          {stock.peRatio !== null ? formatNumber(stock.peRatio, 'decimal') : '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px]">
                          {stock.psRatio !== null ? formatNumber(stock.psRatio, 'decimal') : '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button 
                            onClick={() => toggleWatchlist(stock.symbol)}
                            className="p-1 hover:bg-gray-800 rounded-lg transition-colors group"
                            title={watchlist.includes(stock.symbol) ? "Remove from watchlist" : "Add to watchlist"}
                          >
                            <Star 
                              className={`w-3.5 h-3.5 transition-colors ${
                                watchlist.includes(stock.symbol)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-400 group-hover:text-yellow-400'
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-900 rounded-xl p-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-xs"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, index) => (
                        page === '...' ? (
                          <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-500 text-xs">...</span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-2.5 py-1.5 rounded-lg transition-colors text-xs ${
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
                      className="px-2.5 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-xs"
                    >
                      Next
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400">Page:</span>
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
                      className="w-14 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-center text-white text-xs
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
