import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Star,
  Search,
  ArrowUpDown,
  TrendingUp,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Stock {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  peRatio: number | null;
  dividendYield: number | null;
  beta: number | null;
  volume: number;
  high52Week?: number;
  low52Week?: number;
  avgVolume?: number;
  eps?: number;
  bookValue?: number;
  priceToBook?: number;
}

interface Filters {
  minMarketCap: string;
  maxMarketCap: string;
  minPE: string;
  maxPE: string;
  minDividendYield: string;
  minROE: string;
  minRevenueGrowth: string;
}

// Top gainers/losers mock data for quick start
const MOCK_INITIAL_DATA: Stock[] = [
  { symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', sector: 'Technology', price: 238.99, change: 0.84, changePercent: 0.35, marketCap: 3640000000000, peRatio: 37.31, dividendYield: 0.44, beta: 1.11, volume: 52845673 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Technology', price: 510.02, change: 0.98, changePercent: 0.19, marketCap: 3790000000000, peRatio: 35.42, dividendYield: 0.72, beta: 0.93, volume: 18234567 },
  { symbol: 'GOOGL', name: 'Alphabet Inc', exchange: 'NASDAQ', sector: 'Technology', price: 249.53, change: -1.63, changePercent: -0.65, marketCap: 2020000000000, peRatio: 28.76, dividendYield: 0, beta: 1.07, volume: 14567890 },
  { symbol: 'AMZN', name: 'Amazon.com Inc', exchange: 'NASDAQ', sector: 'Consumer Cyclical', price: 231.62, change: -2.43, changePercent: -1.04, marketCap: 2410000000000, peRatio: 56.23, dividendYield: 0, beta: 1.14, volume: 32456789 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Technology', price: 170.29, change: -4.59, changePercent: -2.62, marketCap: 4190000000000, peRatio: 112.34, dividendYield: 0.03, beta: 1.73, volume: 245678901 },
  { symbol: 'META', name: 'Meta Platforms Inc', exchange: 'NASDAQ', sector: 'Technology', price: 625.86, change: 4.24, changePercent: 0.68, marketCap: 1580000000000, peRatio: 31.45, dividendYield: 0.35, beta: 1.21, volume: 12345678 },
  { symbol: 'TSLA', name: 'Tesla Inc', exchange: 'NASDAQ', sector: 'Consumer Cyclical', price: 425.86, change: 12.15, changePercent: 2.94, marketCap: 1350000000000, peRatio: 98.67, dividendYield: 0, beta: 2.03, volume: 98765432 },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc', exchange: 'NYSE', sector: 'Financials', price: 485.32, change: 1.23, changePercent: 0.25, marketCap: 1010000000000, peRatio: 23.45, dividendYield: 0, beta: 0.87, volume: 3456789 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co', exchange: 'NYSE', sector: 'Financials', price: 258.45, change: 2.34, changePercent: 0.91, marketCap: 738000000000, peRatio: 12.34, dividendYield: 2.11, beta: 1.09, volume: 8765432 },
  { symbol: 'V', name: 'Visa Inc', exchange: 'NYSE', sector: 'Financials', price: 312.67, change: 0.45, changePercent: 0.14, marketCap: 645000000000, peRatio: 34.56, dividendYield: 0.68, beta: 0.95, volume: 5678901 },
];

export default function OptimizedMarketScreener(): JSX.Element {
  const navigate = useNavigate();
  
  // Core state
  const [stocks, setStocks] = useState<Stock[]>(MOCK_INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExchange, setSelectedExchange] = useState('all');
  const [selectedSector, setSelectedSector] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Stock;
    direction: 'asc' | 'desc';
  }>({ key: 'marketCap', direction: 'desc' });
  
  // Watchlist state
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Filters
  const [filters, setFilters] = useState<Filters>({
    minMarketCap: '',
    maxMarketCap: '',
    minPE: '',
    maxPE: '',
    minDividendYield: '',
    minROE: '',
    minRevenueGrowth: '',
  });
  
  const API_KEY = 'NMSRS0ZDIOWF3CLL';
  const BATCH_SIZE = 20; // Process 20 stocks at a time
  const DELAY_MS = 800; // Delay between API calls
  
  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('wallstsmart_watchlist');
    if (saved) {
      try {
        const items = JSON.parse(saved);
        setWatchlist(new Set(items));
      } catch (e) {
        console.error('Failed to load watchlist:', e);
      }
    }
  }, []);
  
  // Toggle watchlist
  const toggleWatchlist = (symbol: string) => {
    setWatchlist(prev => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      localStorage.setItem('wallstsmart_watchlist', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };
  
  // Fetch comprehensive market data
  const fetchMarketData = async () => {
    setLoading(true);
    setLoadingMessage('Fetching market data...');
    
    try {
      // First, get top gainers/losers for immediate display
      const topMoversUrl = `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${API_KEY}`;
      const topMoversResponse = await fetch(topMoversUrl);
      
      if (topMoversResponse.ok) {
        const topMoversData = await topMoversResponse.json();
        
        // Process top gainers
        const gainers = (topMoversData.top_gainers || []).slice(0, 10).map((item: any) => ({
          symbol: item.ticker,
          name: item.ticker, // Will be enriched later
          exchange: 'US',
          price: parseFloat(item.price) || 0,
          change: parseFloat(item.change_amount) || 0,
          changePercent: parseFloat(item.change_percentage?.replace('%', '')) || 0,
          volume: parseInt(item.volume) || 0,
          marketCap: 0, // Will be enriched
          peRatio: null,
          dividendYield: null,
          beta: null,
        }));
        
        // Process top losers
        const losers = (topMoversData.top_losers || []).slice(0, 10).map((item: any) => ({
          symbol: item.ticker,
          name: item.ticker, // Will be enriched later
          exchange: 'US',
          price: parseFloat(item.price) || 0,
          change: parseFloat(item.change_amount) || 0,
          changePercent: parseFloat(item.change_percentage?.replace('%', '')) || 0,
          volume: parseInt(item.volume) || 0,
          marketCap: 0, // Will be enriched
          peRatio: null,
          dividendYield: null,
          beta: null,
        }));
        
        // Process most active
        const active = (topMoversData.most_actively_traded || []).slice(0, 10).map((item: any) => ({
          symbol: item.ticker,
          name: item.ticker, // Will be enriched later
          exchange: 'US',
          price: parseFloat(item.price) || 0,
          change: parseFloat(item.change_amount) || 0,
          changePercent: parseFloat(item.change_percentage?.replace('%', '')) || 0,
          volume: parseInt(item.volume) || 0,
          marketCap: 0, // Will be enriched
          peRatio: null,
          dividendYield: null,
          beta: null,
        }));
        
        // Combine and deduplicate
        const allSymbols = [...new Set([...gainers, ...losers, ...active].map(s => s.symbol))];
        const initialStocks = [...gainers, ...losers, ...active].filter((stock, index, self) => 
          index === self.findIndex(s => s.symbol === stock.symbol)
        );
        
        // Update UI immediately with basic data
        setStocks(initialStocks);
        setLoadingMessage('Enriching stock data...');
        
        // Enrich with company overview data in batches
        const enrichedStocks = [...initialStocks];
        
        for (let i = 0; i < allSymbols.length; i += BATCH_SIZE) {
          const batch = allSymbols.slice(i, i + BATCH_SIZE);
          
          for (const symbol of batch) {
            try {
              const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;
              const response = await fetch(overviewUrl);
              
              if (response.ok) {
                const data = await response.json();
                
                if (data.Symbol) {
                  const stockIndex = enrichedStocks.findIndex(s => s.symbol === symbol);
                  if (stockIndex !== -1) {
                    enrichedStocks[stockIndex] = {
                      ...enrichedStocks[stockIndex],
                      name: data.Name || enrichedStocks[stockIndex].name,
                      exchange: data.Exchange || enrichedStocks[stockIndex].exchange,
                      sector: data.Sector || 'N/A',
                      marketCap: parseFloat(data.MarketCapitalization) || 0,
                      peRatio: parseFloat(data.PERatio) || null,
                      dividendYield: parseFloat(data.DividendYield) || null,
                      beta: parseFloat(data.Beta) || null,
                      eps: parseFloat(data.EPS) || null,
                      bookValue: parseFloat(data.BookValue) || null,
                      priceToBook: parseFloat(data.PriceToBookRatio) || null,
                      high52Week: parseFloat(data['52WeekHigh']) || null,
                      low52Week: parseFloat(data['52WeekLow']) || null,
                    };
                  }
                }
              }
              
              // Update progress
              setLoadingMessage(`Loading ${i + batch.indexOf(symbol) + 1} of ${allSymbols.length} stocks...`);
              
              // Rate limiting
              await new Promise(resolve => setTimeout(resolve, DELAY_MS));
              
            } catch (error) {
              console.error(`Error fetching data for ${symbol}:`, error);
            }
          }
          
          // Update stocks after each batch
          setStocks([...enrichedStocks]);
        }
      }
      
      // Load additional stocks from listing if needed
      setLoadingMessage('Fetching complete market listing...');
      const listingUrl = `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${API_KEY}`;
      const listingResponse = await fetch(listingUrl);
      
      if (listingResponse.ok) {
        const csvText = await listingResponse.text();
        const lines = csvText.split('\n');
        const additionalStocks: Stock[] = [];
        
        // Parse CSV (skip header)
        for (let i = 1; i < Math.min(lines.length, 200); i++) { // Limit to 200 for performance
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
          if (values && values.length >= 7) {
            const symbol = values[0].replace(/"/g, '');
            const name = values[1].replace(/"/g, '');
            const exchange = values[2].replace(/"/g, '');
            const assetType = values[3].replace(/"/g, '');
            const status = values[6]?.replace(/"/g, '') || 'Active';
            
            // Only add active stocks not already in our list
            if (status === 'Active' && 
                assetType === 'Stock' && 
                !stocks.some(s => s.symbol === symbol)) {
              additionalStocks.push({
                symbol,
                name,
                exchange,
                price: 0,
                change: 0,
                changePercent: 0,
                marketCap: 0,
                peRatio: null,
                dividendYield: null,
                beta: null,
                volume: 0,
              });
            }
          }
        }
        
        // Combine all stocks
        setStocks(prev => [...prev, ...additionalStocks]);
      }
      
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };
  
  // Load data on mount
  useEffect(() => {
    // Check cache first
    const cached = localStorage.getItem('wallstsmart_screener_cache');
    const cacheTime = localStorage.getItem('wallstsmart_screener_cache_time');
    
    if (cached && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < 15 * 60 * 1000) { // 15 minutes cache
        try {
          const data = JSON.parse(cached);
          setStocks(data);
          return;
        } catch (e) {
          console.error('Cache parse error:', e);
        }
      }
    }
    
    // Fetch fresh data
    fetchMarketData();
  }, []);
  
  // Save to cache when stocks update
  useEffect(() => {
    if (stocks.length > 10) { // Only cache meaningful data
      localStorage.setItem('wallstsmart_screener_cache', JSON.stringify(stocks));
      localStorage.setItem('wallstsmart_screener_cache_time', Date.now().toString());
    }
  }, [stocks]);
  
  // Filter and sort stocks
  const filteredAndSortedStocks = useMemo(() => {
    let filtered = [...stocks];
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(stock =>
        stock.symbol.toLowerCase().includes(term) ||
        stock.name.toLowerCase().includes(term) ||
        stock.sector?.toLowerCase().includes(term)
      );
    }
    
    // Exchange filter
    if (selectedExchange !== 'all') {
      filtered = filtered.filter(stock => stock.exchange === selectedExchange);
    }
    
    // Sector filter
    if (selectedSector !== 'all') {
      filtered = filtered.filter(stock => stock.sector === selectedSector);
    }
    
    // Advanced filters
    if (filters.minMarketCap) {
      const min = parseFloat(filters.minMarketCap) * 1e9;
      filtered = filtered.filter(stock => stock.marketCap >= min);
    }
    if (filters.maxMarketCap) {
      const max = parseFloat(filters.maxMarketCap) * 1e9;
      filtered = filtered.filter(stock => stock.marketCap <= max);
    }
    if (filters.minPE) {
      const min = parseFloat(filters.minPE);
      filtered = filtered.filter(stock => stock.peRatio !== null && stock.peRatio >= min);
    }
    if (filters.maxPE) {
      const max = parseFloat(filters.maxPE);
      filtered = filtered.filter(stock => stock.peRatio !== null && stock.peRatio <= max);
    }
    if (filters.minDividendYield) {
      const min = parseFloat(filters.minDividendYield);
      filtered = filtered.filter(stock => stock.dividendYield !== null && stock.dividendYield >= min);
    }
    
    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    
    return filtered;
  }, [stocks, searchTerm, selectedExchange, selectedSector, filters, sortConfig]);
  
  // Get unique exchanges and sectors
  const exchanges = useMemo(() => 
    [...new Set(stocks.map(s => s.exchange))].filter(Boolean).sort(),
    [stocks]
  );
  
  const sectors = useMemo(() => 
    [...new Set(stocks.map(s => s.sector))].filter(Boolean).sort(),
    [stocks]
  );
  
  // Pagination
  const paginatedStocks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedStocks.slice(start, start + itemsPerPage);
  }, [filteredAndSortedStocks, currentPage]);
  
  const totalPages = Math.ceil(filteredAndSortedStocks.length / itemsPerPage);
  
  // Sort handler
  const handleSort = (key: keyof Stock) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Symbol', 'Name', 'Exchange', 'Sector', 'Price', 'Change %', 'Market Cap', 'P/E', 'Div Yield', 'Beta', 'Volume'];
    const rows = filteredAndSortedStocks.map(stock => [
      stock.symbol,
      stock.name,
      stock.exchange,
      stock.sector || '',
      stock.price.toFixed(2),
      stock.changePercent.toFixed(2),
      stock.marketCap,
      stock.peRatio?.toFixed(2) || '',
      stock.dividendYield ? `${(stock.dividendYield * 100).toFixed(2)}%` : '',
      stock.beta?.toFixed(2) || '',
      stock.volume,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallstsmart_screener_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Format helpers
  const formatMarketCap = (value: number): string => {
    if (!value) return '-';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${(value / 1e3).toFixed(2)}K`;
  };
  
  const formatNumber = (value: number | null, decimals = 2): string => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(decimals);
  };
  
  const formatPercent = (value: number | null): string => {
    if (value === null || value === undefined) return '-';
    return `${(value * 100).toFixed(2)}%`;
  };
  
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                Market Screener Pro
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm">
                <span className="text-gray-400">
                  <span className="text-green-400 font-semibold">{stocks.length.toLocaleString()}</span> stocks
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400">
                  <span className="text-blue-400 font-semibold">{exchanges.length}</span> exchanges
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400">
                  <span className="text-purple-400 font-semibold">{sectors.length}</span> sectors
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchMarketData()}
                disabled={loading}
                className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-gray-900 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search stocks..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
              />
            </div>
            
            <select
              value={selectedExchange}
              onChange={(e) => setSelectedExchange(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            >
              <option value="all">All Exchanges</option>
              {exchanges.map(exchange => (
                <option key={exchange} value={exchange}>{exchange}</option>
              ))}
            </select>
            
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            >
              <option value="all">All Sectors</option>
              {sectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
            
            <div className="text-sm text-gray-400 flex items-center justify-end">
              Showing {paginatedStocks.length} of {filteredAndSortedStocks.length} stocks
            </div>
          </div>
          
          {/* Advanced Filters */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="mt-4 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <Filter className="w-4 h-4" />
            Advanced Filters {showAdvancedFilters ? '▲' : '▼'}
          </button>
          
          {showAdvancedFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Min Market Cap (B)</label>
                <input
                  type="number"
                  value={filters.minMarketCap}
                  onChange={(e) => setFilters({ ...filters, minMarketCap: e.target.value })}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Max Market Cap (B)</label>
                <input
                  type="number"
                  value={filters.maxMarketCap}
                  onChange={(e) => setFilters({ ...filters, maxMarketCap: e.target.value })}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Min P/E Ratio</label>
                <input
                  type="number"
                  value={filters.minPE}
                  onChange={(e) => setFilters({ ...filters, minPE: e.target.value })}
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Max P/E Ratio</label>
                <input
                  type="number"
                  value={filters.maxPE}
                  onChange={(e) => setFilters({ ...filters, maxPE: e.target.value })}
                  placeholder="e.g. 70"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Min Dividend Yield (%)</label>
                <input
                  type="number"
                  value={filters.minDividendYield}
                  onChange={(e) => setFilters({ ...filters, minDividendYield: e.target.value })}
                  placeholder="e.g. 2"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Min ROE (%)</label>
                <input
                  type="number"
                  value={filters.minROE}
                  onChange={(e) => setFilters({ ...filters, minROE: e.target.value })}
                  placeholder="e.g. 15"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Min Revenue Growth (%)</label>
                <input
                  type="number"
                  value={filters.minRevenueGrowth}
                  onChange={(e) => setFilters({ ...filters, minRevenueGrowth: e.target.value })}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({
                    minMarketCap: '',
                    maxMarketCap: '',
                    minPE: '',
                    maxPE: '',
                    minDividendYield: '',
                    minROE: '',
                    minRevenueGrowth: '',
                  })}
                  className="px-4 py-2 bg-gray-800 rounded text-sm hover:bg-gray-700"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="bg-gray-900 rounded-xl p-8 text-center mb-6">
            <RefreshCw className="w-8 h-8 text-green-500 mx-auto mb-2 animate-spin" />
            <p className="text-gray-400">{loadingMessage}</p>
          </div>
        )}
        
        {/* Data Table */}
        {!loading && paginatedStocks.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No stocks found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/50">
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('symbol')}
                          className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          Symbol <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          Company <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <span className="text-xs font-medium text-gray-400 uppercase">Sector</span>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('price')}
                          className="text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          Price
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('changePercent')}
                          className="text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          Change %
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('marketCap')}
                          className="text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          Market Cap
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('peRatio')}
                          className="text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          P/E
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('dividendYield')}
                          className="text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          Div Yield
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('beta')}
                          className="text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          Beta
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('volume')}
                          className="text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          Volume
                        </button>
                      </th>
                      <th className="px-4 py-3 text-center">
                        <span className="text-xs font-medium text-gray-400 uppercase">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStocks.map((stock, index) => (
                      <tr
                        key={stock.symbol}
                        className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                          index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/stock/${stock.symbol}`)}
                            className="font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            {stock.symbol}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-200">{stock.name}</div>
                            <div className="text-xs text-gray-500">{stock.exchange}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs uppercase text-gray-400">
                            {stock.sector || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ${formatNumber(stock.price)}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${
                          stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {stock.changePercent >= 0 ? '+' : ''}{formatNumber(stock.changePercent)}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatMarketCap(stock.marketCap)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatNumber(stock.peRatio)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatPercent(stock.dividendYield)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatNumber(stock.beta)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {stock.volume.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleWatchlist(stock.symbol)}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            title={watchlist.has(stock.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                watchlist.has(stock.symbol)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-400'
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
              <div className="mt-6 bg-gray-900 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded ${
                          currentPage === page
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    {totalPages > 5 && (
                      <>
                        <span className="px-2">...</span>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className={`px-3 py-1 rounded ${
                            currentPage === totalPages
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-800 hover:bg-gray-700'
                          }`}
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
