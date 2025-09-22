import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Star,
  Search,
  ArrowUpDown,
  Globe,
  ExternalLink,
  Clock,
  AlertCircle,
  TrendingUp,
  Activity,
  DollarSign,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Stock = {
  symbol: string;
  name: string;
  exchange: string;
  assetType?: string;
  ipoDate?: string;
  delistingDate?: string | null;
  status?: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  peRatio: number | null;
  volume: number;
  industry?: string;
  sector?: string;
  country?: string;
  psRatio: number | null;
  pegRatio: number | null;
  eps: number | null;
  beta: number | null;
  dividendYield: number | null;
  profitMargin: number | null;
  operatingMargin: number | null;
  returnOnEquity: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  enterpriseValue: number | null;
  evToRevenue: number | null;
  evToEbitda: number | null;
  weekHigh52: number | null;
  weekLow52: number | null;
  movingAverage50: number | null;
  movingAverage200: number | null;
  rsi: number | null;
  lastUpdated?: string;
};

export default function EnhancedMarketScreener(): JSX.Element {
  const navigate = useNavigate();

  const [allStocksData, setAllStocksData] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Stock; direction: 'asc' | 'desc' }>({
    key: 'marketCap',
    direction: 'desc',
  });
  const [selectedExchange, setSelectedExchange] = useState('all');
  const [selectedSector, setSelectedSector] = useState('all');
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [dataProgress, setDataProgress] = useState({ current: 0, total: 0 });
  const [marketStats, setMarketStats] = useState({
    totalStocks: 0,
    activeStocks: 0,
    delistedStocks: 0,
    exchanges: [] as string[],
    sectors: [] as string[],
    lastUpdate: null as Date | null,
  });

  // Advanced filters
  const [filters, setFilters] = useState({
    minMarketCap: '',
    maxMarketCap: '',
    minPE: '',
    maxPE: '',
    minDividendYield: '',
    minROE: '',
    minRevenueGrowth: '',
  });

  // Watchlist state
  const [watchlist, setWatchlist] = useState<string[]>([]);

  const stocksPerPage = 50;
  const API_KEY = 'NMSRS0ZDIOWF3CLL';
  const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours for fundamentals
  const QUOTE_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for quotes

  // API call queue management
  const [apiQueue, setApiQueue] = useState<Array<() => Promise<void>>>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Rate limiting: 75 calls per minute
  const CALLS_PER_MINUTE = 75;
  const DELAY_BETWEEN_CALLS = 60000 / CALLS_PER_MINUTE; // ~800ms

  // ---------- Enhanced Data Normalization ----------
  const normalizeStock = (raw: any): Stock => {
    const safeNumber = (value: any, defaultValue = 0): number => {
      const num = Number(value);
      return Number.isFinite(num) && num !== 0 ? num : defaultValue;
    };

    const safeNumberOrNull = (value: any): number | null => {
      const num = Number(value);
      return Number.isFinite(num) && num !== 0 ? num : null;
    };

    return {
      symbol: raw.symbol || raw.Symbol || '',
      name: raw.name || raw.Name || raw.CompanyName || '',
      exchange: raw.exchange || raw.Exchange || '',
      assetType: raw.assetType || raw.AssetType || 'Stock',
      ipoDate: raw.ipoDate || raw.IPODate || '',
      delistingDate: raw.delistingDate || null,
      status: raw.status || raw.Status || 'Active',
      
      // Price data
      price: safeNumber(raw.price || raw['05. price'] || raw.LatestPrice),
      change: safeNumber(raw.change || raw['09. change'] || raw.Change),
      changePercent: safeNumber((raw.changePercent || raw['10. change percent'] || '0').toString().replace('%', '')),
      volume: safeNumber(raw.volume || raw['06. volume'] || raw.Volume),
      
      // Valuation metrics
      marketCap: safeNumber(raw.marketCap || raw.MarketCapitalization),
      peRatio: safeNumberOrNull(raw.peRatio || raw.PERatio || raw.TrailingPE),
      psRatio: safeNumberOrNull(raw.psRatio || raw.PriceToSalesRatioTTM),
      pegRatio: safeNumberOrNull(raw.pegRatio || raw.PEGRatio),
      priceToBook: safeNumberOrNull(raw.priceToBook || raw.PriceToBookRatio),
      forwardPE: safeNumberOrNull(raw.forwardPE || raw.ForwardPE),
      
      // Company metrics
      eps: safeNumberOrNull(raw.eps || raw.EPS),
      beta: safeNumberOrNull(raw.beta || raw.Beta),
      dividendYield: safeNumberOrNull(raw.dividendYield || raw.DividendYield),
      
      // Profitability metrics
      profitMargin: safeNumberOrNull(raw.profitMargin || raw.ProfitMargin),
      operatingMargin: safeNumberOrNull(raw.operatingMargin || raw.OperatingMarginTTM),
      returnOnEquity: safeNumberOrNull(raw.returnOnEquity || raw.ReturnOnEquityTTM),
      
      // Financial health
      debtToEquity: safeNumberOrNull(raw.debtToEquity || raw.DebtToEquityRatio),
      currentRatio: safeNumberOrNull(raw.currentRatio || raw.CurrentRatio),
      
      // Growth metrics
      revenueGrowth: safeNumberOrNull(raw.revenueGrowth || raw.QuarterlyRevenueGrowthYOY),
      epsGrowth: safeNumberOrNull(raw.epsGrowth || raw.QuarterlyEarningsGrowthYOY),
      
      // Enterprise metrics
      enterpriseValue: safeNumberOrNull(raw.enterpriseValue || raw.EnterpriseValue),
      evToRevenue: safeNumberOrNull(raw.evToRevenue || raw.EVToRevenue),
      evToEbitda: safeNumberOrNull(raw.evToEbitda || raw.EVToEBITDA),
      
      // Technical indicators
      weekHigh52: safeNumberOrNull(raw.weekHigh52 || raw['52WeekHigh']),
      weekLow52: safeNumberOrNull(raw.weekLow52 || raw['52WeekLow']),
      movingAverage50: safeNumberOrNull(raw.movingAverage50 || raw['50DayMovingAverage']),
      movingAverage200: safeNumberOrNull(raw.movingAverage200 || raw['200DayMovingAverage']),
      rsi: safeNumberOrNull(raw.rsi),
      
      // Metadata
      industry: raw.industry || raw.Industry || 'N/A',
      sector: raw.sector || raw.Sector || 'N/A',
      country: raw.country || raw.Country || 'USA',
      lastUpdated: raw.lastUpdated || new Date().toISOString(),
    };
  };

  // ---------- Smart Data Fetching with Batching ----------
  const fetchStockDataBatch = async (symbols: string[]): Promise<Partial<Stock>[]> => {
    const results: Partial<Stock>[] = [];
    
    for (const symbol of symbols) {
      try {
        // Use OVERVIEW for comprehensive fundamental data
        const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;
        const overviewResponse = await fetch(overviewUrl);
        
        if (!overviewResponse.ok) {
          console.warn(`Failed to fetch overview for ${symbol}`);
          continue;
        }
        
        const overviewData = await overviewResponse.json();
        
        // Check if we got valid data
        if (overviewData.Symbol) {
          results.push({
            symbol: overviewData.Symbol,
            name: overviewData.Name,
            exchange: overviewData.Exchange,
            sector: overviewData.Sector,
            industry: overviewData.Industry,
            marketCap: Number(overviewData.MarketCapitalization),
            peRatio: Number(overviewData.PERatio) || null,
            pegRatio: Number(overviewData.PEGRatio) || null,
            priceToBook: Number(overviewData.PriceToBookRatio) || null,
            dividendYield: Number(overviewData.DividendYield) || null,
            eps: Number(overviewData.EPS) || null,
            beta: Number(overviewData.Beta) || null,
            profitMargin: Number(overviewData.ProfitMargin) || null,
            operatingMargin: Number(overviewData.OperatingMarginTTM) || null,
            returnOnEquity: Number(overviewData.ReturnOnEquityTTM) || null,
            evToRevenue: Number(overviewData.EVToRevenue) || null,
            evToEbitda: Number(overviewData.EVToEBITDA) || null,
            forwardPE: Number(overviewData.ForwardPE) || null,
            psRatio: Number(overviewData.PriceToSalesRatioTTM) || null,
            weekHigh52: Number(overviewData['52WeekHigh']) || null,
            weekLow52: Number(overviewData['52WeekLow']) || null,
            movingAverage50: Number(overviewData['50DayMovingAverage']) || null,
            movingAverage200: Number(overviewData['200DayMovingAverage']) || null,
            country: overviewData.Country,
            lastUpdated: new Date().toISOString(),
          });
        }
        
        // Respect rate limit
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CALLS));
        
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
      }
    }
    
    return results;
  };

  // ---------- Fetch Real-time Quotes ----------
  const fetchQuoteBatch = async (symbols: string[]): Promise<Map<string, any>> => {
    const quotes = new Map();
    
    // Use REALTIME_BULK_QUOTES for efficiency (up to 100 symbols at once)
    const batchSize = 100;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const symbolList = batch.join(',');
      
      try {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=REALTIME_BULK_QUOTES&symbol=${symbolList}&apikey=${API_KEY}`
        );
        
        if (response.ok) {
          const data = await response.text();
          // Parse CSV response
          const lines = data.split('\n');
          const headers = lines[0].split(',');
          
          for (let j = 1; j < lines.length; j++) {
            const values = lines[j].split(',');
            if (values.length > 1) {
              const symbol = values[0];
              quotes.set(symbol, {
                price: Number(values[1]) || 0,
                volume: Number(values[2]) || 0,
                timestamp: values[3],
              });
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CALLS));
      } catch (error) {
        console.error('Error fetching quote batch:', error);
      }
    }
    
    return quotes;
  };

  // ---------- Progressive Data Loading Strategy ----------
  const loadMarketData = async (forceRefresh = false) => {
    setLoading(true);
    setDataProgress({ current: 0, total: 0 });
    
    try {
      // Step 1: Get listing of all active stocks
      const listingResponse = await fetch(
        `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${API_KEY}`
      );
      
      if (!listingResponse.ok) throw new Error('Failed to fetch listing');
      
      const csvText = await listingResponse.text();
      const stocks = parseListingCSV(csvText);
      
      // Filter for active stocks only
      const activeStocks = stocks.filter(s => 
        s.status === 'Active' && 
        (s.assetType === 'Stock' || s.assetType === 'ETF')
      );
      
      setDataProgress({ current: 0, total: activeStocks.length });
      
      // Step 2: Load cached data if available
      if (!forceRefresh) {
        const cached = loadFromCache();
        if (cached) {
          setAllStocksData(cached);
          setInitialLoad(false);
          setLoading(false);
          return;
        }
      }
      
      // Step 3: Prioritize data fetching
      // Get top stocks by market cap first (these are most likely to be searched)
      const prioritySymbols = getPrioritySymbols(activeStocks);
      
      // Fetch fundamental data for priority stocks
      const fundamentals = await fetchStockDataBatch(prioritySymbols);
      
      // Merge with listing data
      const enrichedStocks = activeStocks.map(stock => {
        const fundamental = fundamentals.find(f => f.symbol === stock.symbol);
        return normalizeStock({ ...stock, ...fundamental });
      });
      
      // Step 4: Get real-time quotes for visible stocks
      const quotes = await fetchQuoteBatch(prioritySymbols);
      
      // Update with quote data
      const finalStocks = enrichedStocks.map(stock => {
        const quote = quotes.get(stock.symbol);
        if (quote) {
          return {
            ...stock,
            price: quote.price || stock.price,
            volume: quote.volume || stock.volume,
          };
        }
        return stock;
      });
      
      setAllStocksData(finalStocks);
      updateMarketStats(finalStocks);
      
      // Cache the data
      saveToCache(finalStocks);
      
    } catch (error) {
      console.error('Error loading market data:', error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // ---------- Helper Functions ----------
  const parseListingCSV = (csvText: string): Partial<Stock>[] => {
    const lines = csvText.split('\n');
    const stocks: Partial<Stock>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Robust CSV parsing
      const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const cleaned = values.map(v => v.replace(/^"|"$/g, '').trim());
      
      if (cleaned.length >= 7) {
        stocks.push({
          symbol: cleaned[0],
          name: cleaned[1],
          exchange: cleaned[2],
          assetType: cleaned[3],
          ipoDate: cleaned[4],
          delistingDate: cleaned[5] || null,
          status: cleaned[6] || 'Active',
        });
      }
    }
    
    return stocks;
  };

  const getPrioritySymbols = (stocks: Partial<Stock>[]): string[] => {
    // Get popular tickers and major exchanges first
    const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B', 'JPM', 'V'];
    const majorExchanges = ['NYSE', 'NASDAQ'];
    
    const priorityStocks = stocks
      .filter(s => s.symbol && (
        popularTickers.includes(s.symbol) || 
        majorExchanges.includes(s.exchange || '')
      ))
      .slice(0, 100) // Limit to top 100 for initial load
      .map(s => s.symbol!);
    
    return [...new Set(priorityStocks)];
  };

  const updateMarketStats = (stocks: Stock[]) => {
    const exchanges = [...new Set(stocks.map(s => s.exchange))].filter(Boolean);
    const sectors = [...new Set(stocks.map(s => s.sector))].filter(s => s && s !== 'N/A');
    
    setMarketStats({
      totalStocks: stocks.length,
      activeStocks: stocks.filter(s => s.status === 'Active').length,
      delistedStocks: stocks.filter(s => s.status === 'Delisted').length,
      exchanges,
      sectors,
      lastUpdate: new Date(),
    });
  };

  // ---------- Caching System ----------
  const loadFromCache = (): Stock[] | null => {
    try {
      const cached = localStorage.getItem('wallstsmart_enhanced_stocks');
      const timestamp = localStorage.getItem('wallstsmart_enhanced_timestamp');
      
      if (cached && timestamp) {
        const age = Date.now() - Number(timestamp);
        if (age < CACHE_DURATION) {
          const parsed = JSON.parse(cached);
          setCacheAge(age);
          return parsed.map(normalizeStock);
        }
      }
    } catch (error) {
      console.error('Cache load error:', error);
    }
    return null;
  };

  const saveToCache = (stocks: Stock[]) => {
    try {
      localStorage.setItem('wallstsmart_enhanced_stocks', JSON.stringify(stocks));
      localStorage.setItem('wallstsmart_enhanced_timestamp', String(Date.now()));
    } catch (error) {
      console.error('Cache save error:', error);
    }
  };

  // ---------- Filtering and Sorting ----------
  const getFilteredAndSortedStocks = useCallback((): Stock[] => {
    let filtered = [...allStocksData];
    
    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.symbol.toLowerCase().includes(term) || 
        s.name.toLowerCase().includes(term) ||
        s.industry?.toLowerCase().includes(term) ||
        s.sector?.toLowerCase().includes(term)
      );
    }
    
    // Exchange filter
    if (selectedExchange !== 'all') {
      filtered = filtered.filter(s => s.exchange === selectedExchange);
    }
    
    // Sector filter
    if (selectedSector !== 'all') {
      filtered = filtered.filter(s => s.sector === selectedSector);
    }
    
    // Advanced filters
    if (filters.minMarketCap) {
      const min = Number(filters.minMarketCap) * 1e9; // Convert billions to number
      filtered = filtered.filter(s => s.marketCap >= min);
    }
    if (filters.maxMarketCap) {
      const max = Number(filters.maxMarketCap) * 1e9;
      filtered = filtered.filter(s => s.marketCap <= max);
    }
    if (filters.minPE) {
      const min = Number(filters.minPE);
      filtered = filtered.filter(s => s.peRatio !== null && s.peRatio >= min);
    }
    if (filters.maxPE) {
      const max = Number(filters.maxPE);
      filtered = filtered.filter(s => s.peRatio !== null && s.peRatio <= max);
    }
    if (filters.minDividendYield) {
      const min = Number(filters.minDividendYield);
      filtered = filtered.filter(s => s.dividendYield !== null && s.dividendYield >= min);
    }
    if (filters.minROE) {
      const min = Number(filters.minROE);
      filtered = filtered.filter(s => s.returnOnEquity !== null && s.returnOnEquity >= min);
    }
    if (filters.minRevenueGrowth) {
      const min = Number(filters.minRevenueGrowth);
      filtered = filtered.filter(s => s.revenueGrowth !== null && s.revenueGrowth >= min);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      // Handle null values
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bVal === null) return sortConfig.direction === 'asc' ? -1 : 1;
      
      // Numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // String comparison
      return sortConfig.direction === 'asc' 
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    
    return filtered;
  }, [allStocksData, searchTerm, selectedExchange, selectedSector, filters, sortConfig]);

  // ---------- Format Helpers ----------
  const formatLargeNumber = (num: number | null): string => {
    if (num === null || !Number.isFinite(num)) return '-';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatPercent = (num: number | null): string => {
    if (num === null || !Number.isFinite(num)) return '-';
    return `${num.toFixed(2)}%`;
  };

  const formatNumber = (num: number | null, decimals = 2): string => {
    if (num === null || !Number.isFinite(num)) return '-';
    return num.toFixed(decimals);
  };

  // ---------- Export Functionality ----------
  const exportToCSV = () => {
    const data = getFilteredAndSortedStocks();
    const headers = [
      'Symbol', 'Name', 'Exchange', 'Sector', 'Industry', 'Country',
      'Price', 'Change %', 'Volume', 'Market Cap', 'P/E', 'P/S', 'PEG',
      'EPS', 'Dividend Yield', 'Beta', 'ROE', 'Profit Margin',
      '52W High', '52W Low', 'MA50', 'MA200'
    ];
    
    const rows = data.map(s => [
      s.symbol,
      s.name,
      s.exchange,
      s.sector || '',
      s.industry || '',
      s.country || '',
      formatNumber(s.price),
      formatPercent(s.changePercent),
      s.volume,
      s.marketCap,
      formatNumber(s.peRatio),
      formatNumber(s.psRatio),
      formatNumber(s.pegRatio),
      formatNumber(s.eps),
      formatPercent(s.dividendYield),
      formatNumber(s.beta),
      formatPercent(s.returnOnEquity),
      formatPercent(s.profitMargin),
      formatNumber(s.weekHigh52),
      formatNumber(s.weekLow52),
      formatNumber(s.movingAverage50),
      formatNumber(s.movingAverage200),
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

  // ---------- Effects ----------
  useEffect(() => {
    loadMarketData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedExchange, selectedSector, filters]);

  // Pagination
  const filteredStocks = useMemo(() => getFilteredAndSortedStocks(), [getFilteredAndSortedStocks]);
  const totalPages = Math.ceil(filteredStocks.length / stocksPerPage);
  const displayedStocks = filteredStocks.slice(
    (currentPage - 1) * stocksPerPage,
    currentPage * stocksPerPage
  );

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-40">
        <div className="max-w-[1900px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                Market Screener Pro
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-gray-400">
                  <span className="text-green-400 font-semibold">{marketStats.totalStocks.toLocaleString()}</span> stocks
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400">
                  <span className="text-blue-400 font-semibold">{marketStats.exchanges.length}</span> exchanges
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400">
                  <span className="text-purple-400 font-semibold">{marketStats.sectors.length}</span> sectors
                </span>
                {cacheAge && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Clock className="w-3 h-3" />
                      Cached {Math.floor(cacheAge / 1000 / 60)}m ago
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadMarketData(true)}
                disabled={loading}
                className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
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
          
          {loading && dataProgress.total > 0 && (
            <div className="mt-3">
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(dataProgress.current / dataProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Loading data: {dataProgress.current} / {dataProgress.total} stocks
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1900px] mx-auto px-4 py-6">
        {/* Filters Section */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search stocks..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <select
              value={selectedExchange}
              onChange={(e) => setSelectedExchange(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Exchanges</option>
              {marketStats.exchanges.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
            
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Sectors</option>
              {marketStats.sectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
            
            <div className="text-sm text-gray-400 flex items-center">
              Showing {displayedStocks.length} of {filteredStocks.length} stocks
            </div>
          </div>
          
          {/* Advanced Filters */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Advanced Filters ▼
            </summary>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Min Market Cap (B)</label>
                <input
                  type="number"
                  value={filters.minMarketCap}
                  onChange={(e) => setFilters({...filters, minMarketCap: e.target.value})}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Max Market Cap (B)</label>
                <input
                  type="number"
                  value={filters.maxMarketCap}
                  onChange={(e) => setFilters({...filters, maxMarketCap: e.target.value})}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Min P/E Ratio</label>
                <input
                  type="number"
                  value={filters.minPE}
                  onChange={(e) => setFilters({...filters, minPE: e.target.value})}
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Max P/E Ratio</label>
                <input
                  type="number"
                  value={filters.maxPE}
                  onChange={(e) => setFilters({...filters, maxPE: e.target.value})}
                  placeholder="e.g. 30"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Min Dividend Yield (%)</label>
                <input
                  type="number"
                  value={filters.minDividendYield}
                  onChange={(e) => setFilters({...filters, minDividendYield: e.target.value})}
                  placeholder="e.g. 2"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Min ROE (%)</label>
                <input
                  type="number"
                  value={filters.minROE}
                  onChange={(e) => setFilters({...filters, minROE: e.target.value})}
                  placeholder="e.g. 15"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Min Revenue Growth (%)</label>
                <input
                  type="number"
                  value={filters.minRevenueGrowth}
                  onChange={(e) => setFilters({...filters, minRevenueGrowth: e.target.value})}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
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
                  className="px-4 py-2 bg-gray-800 rounded text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </details>
        </div>

        {/* Data Table */}
        {loading && initialLoad ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <RefreshCw className="w-12 h-12 text-green-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">Loading Market Data...</h3>
            <p className="text-gray-500">Fetching comprehensive financial metrics</p>
          </div>
        ) : displayedStocks.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No stocks found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 rounded-xl overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-850">
                      <th className="px-4 py-3 text-left sticky left-0 bg-gray-850 z-10">
                        <button
                          onClick={() => setSortConfig({ key: 'symbol', direction: sortConfig.key === 'symbol' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                          className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          Symbol <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left min-w-[200px]">
                        <button
                          onClick={() => setSortConfig({ key: 'name', direction: sortConfig.key === 'name' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
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
                          onClick={() => setSortConfig({ key: 'price', direction: sortConfig.key === 'price' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                          className="text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          Price
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSortConfig({ key: 'changePercent', direction: sortConfig.key === 'changePercent' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                          className="text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          Change %
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSortConfig({ key: 'marketCap', direction: sortConfig.key === 'marketCap' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                          className="text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          Market Cap
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSortConfig({ key: 'peRatio', direction: sortConfig.key === 'peRatio' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                          className="text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          P/E
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSortConfig({ key: 'dividendYield', direction: sortConfig.key === 'dividendYield' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                          className="text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          Div Yield
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSortConfig({ key: 'beta', direction: sortConfig.key === 'beta' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                          className="text-xs font-medium text-gray-400 uppercase hover:text-white"
                        >
                          Beta
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSortConfig({ key: 'volume', direction: sortConfig.key === 'volume' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
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
                    {displayedStocks.map((stock, index) => (
                      <tr
                        key={`${stock.symbol}-${index}`}
                        className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                          index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'
                        }`}
                      >
                        <td className="px-4 py-3 sticky left-0 bg-inherit z-10">
                          <button
                            onClick={() => navigate(`/stock/${stock.symbol}`)}
                            className="font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            {stock.symbol}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-200">{stock.name}</div>
                            <div className="text-xs text-gray-500">{stock.exchange}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gray-800 rounded text-xs">
                            {stock.sector || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ${formatNumber(stock.price)}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${
                          stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {stock.changePercent >= 0 ? '+' : ''}
                          {formatPercent(stock.changePercent)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatLargeNumber(stock.marketCap)}
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
                          {stock.volume?.toLocaleString() || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                            title="Add to watchlist"
                          >
                            <Star className="w-4 h-4 text-gray-400 hover:text-yellow-400" />
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
              <div className="bg-gray-900 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      {totalPages > 5 && (
                        <>
                          <span className="px-2 text-gray-500">...</span>
                          <button
                            onClick={() => setCurrentPage(totalPages)}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              currentPage === totalPages
                                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                            }`}
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
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
