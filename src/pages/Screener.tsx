import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Loader,
  Eye,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * EnhancedMarketScreener.tsx
 * - Typescript React single-file screener improved for UX and performance
 * - Improvements included:
 *   1) Robust CSV parsing
 *   2) useMemo for expensive calculations
 *   3) Debounced search
 *   4) Client-side rate limiter (token-bucket style) + safe delays
 *   5) Pruning stale cache entries
 *   6) No fake market-cap calculation; optional OVERVIEW fetch to get sharesOutstanding
 *   7) Export full filtered list option
 *   8) Graceful fallback to optional BACKEND aggregation endpoint (set BACKEND_URL in env)
 *
 * NOTE: For production scale you MUST add a server-side throttling + shared cache (Vercel serverless + Redis/Upstash/Vercel KV).
 */

type StockMeta = {
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
  ipoDate?: string | null;
  delistingDate?: string | null;
  status?: string;
};

type RealTimeData = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  dayHigh?: number;
  dayLow?: number;
  previousClose?: number;
  marketCap?: number | null; // null if unknown
  timestamp: number;
  hasRealData: boolean;
};

// Config
const API_KEY = process.env.REACT_APP_ALPHA_VANTAGE_KEY || 'NMSRS0ZDIOWF3CLL';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || ''; // optional server-side aggregator
const METADATA_CACHE_KEY = 'wallstsmart_stocks_metadata_v2';
const REALTIME_CACHE_KEY = 'wallstsmart_realtime_data_v2';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const STALE_PRUNE_MS = 60 * 60 * 1000; // prune anything older than 1 hour from cache
const CALLS_PER_MINUTE = 75; // AlphaVantage premium example
const TOKEN_REFILL_INTERVAL_MS = 60 * 1000; // refill window

const PRIORITY_SYMBOLS = ['AAPL','MSFT','GOOGL','AMZN','META','NVDA','TSLA','BRK.B','JPM','V'];

// ----------------- Helpers -----------------
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// Robust CSV parser (handles quoted fields with commas)
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  let curRow: string[] = [];
  let cur = '';
  let inQuotes = false;

  while (i < csvText.length) {
    const ch = csvText[i];

    if (inQuotes) {
      if (ch === '"') {
        // peek next
        if (csvText[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        cur += ch;
        i++;
        continue;
      }
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ',') {
      curRow.push(cur);
      cur = '';
      i++;
      continue;
    }

    if (ch === '\n' || ch === '\r') {
      // handle CRLF
      // Ignore empty CR or LF if consecutive
      if (cur !== '' || curRow.length > 0) {
        curRow.push(cur);
        rows.push(curRow);
        cur = '';
        curRow = [];
      }
      // skip additional \n or \r
      i++;
      while (csvText[i] === '\n' || csvText[i] === '\r') i++;
      continue;
    }

    cur += ch;
    i++;
  }

  // last
  if (cur !== '' || curRow.length > 0) {
    curRow.push(cur);
    rows.push(curRow);
  }

  return rows;
}

// Parse LISTING_STATUS result to StockMeta[]
function parseListingCSV(csvText: string): StockMeta[] {
  const rows = parseCSV(csvText);
  if (rows.length <= 1) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  const colIndex = (name: string) => header.indexOf(name);

  const symbolIdx = colIndex('symbol');
  const nameIdx = colIndex('name');
  const exchangeIdx = colIndex('exchange');
  const assetTypeIdx = colIndex('asset type');
  const ipoIdx = colIndex('ipo date');
  const delistIdx = colIndex('delisting date');
  const statusIdx = colIndex('status');

  const out: StockMeta[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const symbol = row[symbolIdx] || row[0];
    const name = row[nameIdx] || row[1] || '';
    const exchange = row[exchangeIdx] || '';
    const assetType = (row[assetTypeIdx] || '').trim();
    const ipoDate = row[ipoIdx] || null;
    const delistingDate = row[delistIdx] || null;
    const status = row[statusIdx] || 'Active';

    if ((assetType === 'Stock' || assetType === 'ETF') && status === 'Active') {
      out.push({ symbol: symbol.trim(), name: name.trim(), exchange: exchange.trim(), assetType, ipoDate, delistingDate, status });
    }
  }

  return out;
}

// Rate limiter token bucket
class RateLimiter {
  tokens: number;
  capacity: number;
  refillInterval: number;
  lastRefill: number;

  constructor(capacity = CALLS_PER_MINUTE, refillInterval = TOKEN_REFILL_INTERVAL_MS) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillInterval = refillInterval;
    this.lastRefill = Date.now();
  }

  refill() {
    const now = Date.now();
    if (now - this.lastRefill >= this.refillInterval) {
      this.tokens = this.capacity;
      this.lastRefill = now;
    }
  }

  async removeTokenOrWait() {
    while (true) {
      this.refill();
      if (this.tokens > 0) {
        this.tokens -= 1;
        return;
      }
      // wait a short amount before checking again
      await sleep(500);
    }
  }
}

// ----------------- Component -----------------
export default function EnhancedMarketScreener(): JSX.Element {
  const navigate = useNavigate();

  const [stocksMetadata, setStocksMetadata] = useState<StockMeta[]>([]);
  const [realTimeDataCache, setRealTimeDataCache] = useState<Map<string, RealTimeData>>(new Map());
  const [displayedData, setDisplayedData] = useState<Map<string, RealTimeData>>(new Map());
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, RealTimeData>>(new Map());
  const [loadingSymbols, setLoadingSymbols] = useState<Set<string>>(new Set());
  const [failedSymbols, setFailedSymbols] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [autoUpdate, setAutoUpdate] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTermRaw, setSearchTermRaw] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // debounced
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'marketCap', direction: 'desc' });
  const [selectedExchange, setSelectedExchange] = useState('all');
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try { const saved = localStorage.getItem('wallstsmart_watchlist'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  const fetchQueueRef = useRef<string[]>([]);
  const isFetchingRef = useRef(false);
  const rateLimiterRef = useRef(new RateLimiter());
  const lastCacheTimestampRef = useRef<number | null>(null);

  const stocksPerPage = 100;

  // Debounce searchTermRaw -> searchTerm
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchTermRaw.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTermRaw]);

  // Load metadata from cache
  const loadMetadataFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(METADATA_CACHE_KEY);
      const ts = localStorage.getItem(METADATA_CACHE_KEY + '_timestamp');
      if (cached && ts) {
        const age = Date.now() - parseInt(ts, 10);
        const stocks: StockMeta[] = JSON.parse(cached);
        setStocksMetadata(stocks);
        lastCacheTimestampRef.current = parseInt(ts, 10);
        return { stocks, age };
      }
    } catch (e) {
      console.warn('Failed to load metadata cache', e);
    }
    return null;
  }, []);

  const loadRealTimeDataFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(REALTIME_CACHE_KEY);
      const ts = localStorage.getItem(REALTIME_CACHE_KEY + '_timestamp');
      if (cached && ts) {
        const age = Date.now() - parseInt(ts, 10);
        if (age < CACHE_DURATION) {
          const arr: [string, RealTimeData][] = JSON.parse(cached);
          const map = new Map(arr);
          setRealTimeDataCache(new Map(map));
          setDisplayedData(new Map(map));
          setCacheAge(age);
          lastCacheTimestampRef.current = parseInt(ts, 10);
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to load realtime cache', e);
    }
    return false;
  }, []);

  // Save caches
  const saveRealTimeCache = useCallback((map: Map<string, RealTimeData>) => {
    try {
      const arr = Array.from(map.entries());
      localStorage.setItem(REALTIME_CACHE_KEY, JSON.stringify(arr));
      localStorage.setItem(REALTIME_CACHE_KEY + '_timestamp', Date.now().toString());
    } catch (e) { console.warn('Failed to save realtime cache', e); }
  }, []);

  // Prune stale items from cache periodically
  useEffect(() => {
    const prune = () => {
      setRealTimeDataCache(prev => {
        const now = Date.now();
        const next = new Map(prev);
        for (const [k, v] of prev.entries()) {
          if (now - v.timestamp > STALE_PRUNE_MS) next.delete(k);
        }
        if (next.size !== prev.size) saveRealTimeCache(next);
        return next;
      });
    };

    const id = setInterval(prune, 10 * 60 * 1000); // every 10 minutes
    return () => clearInterval(id);
  }, [saveRealTimeCache]);

  // Queue symbols safely
  const queueSymbolsForFetch = useCallback((symbols: string[]) => {
    const uniqueSymbols = Array.from(new Set(symbols));
    const toAdd = uniqueSymbols.filter(s =>
      !fetchQueueRef.current.includes(s) &&
      !realTimeDataCache.has(s) &&
      !loadingSymbols.has(s) &&
      !failedSymbols.has(s)
    );
    if (toAdd.length === 0) return;
    fetchQueueRef.current.push(...toAdd);
    processFetchQueue();
  }, [realTimeDataCache, loadingSymbols, failedSymbols]);

  // Fetch single global quote via either backend aggregator or direct
  const fetchQuoteDirect = useCallback(async (symbol: string): Promise<any | null> => {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const json = await resp.json();
      return json?.['Global Quote'] || null;
    } catch (e) {
      console.error('fetchQuoteDirect error', e);
      return null;
    }
  }, []);

  // Optional: fetch company overview (to get sharesOutstanding)
  const fetchOverview = useCallback(async (symbol: string) => {
    try {
      const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      console.warn('Overview fetch failed', e);
      return null;
    }
  }, []);

  // Build RealTimeData from Global Quote JSON
  const buildRealTimeData = useCallback(async (symbol: string, quoteJson: any): Promise<RealTimeData | null> => {
    if (!quoteJson) return null;
    const price = parseFloat(quoteJson['05. price']) || 0;
    const change = parseFloat(quoteJson['09. change']) || 0;
    const changePercent = parseFloat((quoteJson['10. change percent'] || '').replace('%', '')) || 0;
    const volume = parseInt(quoteJson['06. volume'] || '0', 10) || 0;
    const dayHigh = parseFloat(quoteJson['03. high']) || undefined;
    const dayLow = parseFloat(quoteJson['04. low']) || undefined;
    const previousClose = parseFloat(quoteJson['08. previous close']) || undefined;

    const data: RealTimeData = {
      symbol,
      price,
      change,
      changePercent,
      volume,
      dayHigh,
      dayLow,
      previousClose,
      marketCap: null, // left null unless we fetch overview
      timestamp: Date.now(),
      hasRealData: true,
    };

    return data;
  }, []);

  // Safe single-symbol quote fetch that respects the client-side rate limiter
  const fetchRealTimeQuote = useCallback(async (symbol: string): Promise<RealTimeData | null> => {
    if (loadingSymbols.has(symbol) || failedSymbols.has(symbol)) return null;

    setLoadingSymbols(prev => new Set(prev).add(symbol));
    try {
      // If a backend aggregator is configured, prefer it (reduces per-client rate pressure)
      let quoteJson = null;
      if (BACKEND_URL) {
        try {
          const resp = await fetch(`${BACKEND_URL}/quote?symbol=${encodeURIComponent(symbol)}`);
          if (resp.ok) quoteJson = await resp.json();
        } catch (e) {
          console.warn('Backend aggregator unreachable, falling back to direct');
        }
      }

      if (!quoteJson) {
        // rate limiter
        await rateLimiterRef.current.removeTokenOrWait();
        quoteJson = await fetchQuoteDirect(symbol);
      }

      const rt = await buildRealTimeData(symbol, quoteJson);
      if (!rt) {
        setFailedSymbols(prev => new Set(prev).add(symbol));
        return null;
      }

      // Optionally fetch overview for market cap for priority symbols only (to reduce calls)
      if (PRIORITY_SYMBOLS.includes(symbol) && rt.price > 0) {
        await rateLimiterRef.current.removeTokenOrWait();
        const overview = await fetchOverview(symbol);
        if (overview && overview.SharesOutstanding) {
          const shares = parseFloat(overview.SharesOutstanding);
          if (!isNaN(shares) && shares > 0) {
            rt.marketCap = Math.round(rt.price * shares);
          }
        }
      }

      // Update caches
      setRealTimeDataCache(prev => {
        const next = new Map(prev);
        next.set(symbol, rt);
        saveRealTimeCache(next);
        return next;
      });

      // Add to pending updates (applied by UI controls or auto-update)
      setPendingUpdates(prev => {
        const next = new Map(prev);
        next.set(symbol, rt);
        return next;
      });

      return rt;
    } catch (e) {
      console.error('fetchRealTimeQuote error for', symbol, e);
      setFailedSymbols(prev => new Set(prev).add(symbol));
      return null;
    } finally {
      setLoadingSymbols(prev => {
        const next = new Set(prev);
        next.delete(symbol);
        return next;
      });
    }
  }, [loadingSymbols, failedSymbols, fetchQuoteDirect, buildRealTimeData, fetchOverview]);

  // Queue processor
  const processFetchQueue = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    while (fetchQueueRef.current.length > 0) {
      const symbol = fetchQueueRef.current.shift();
      if (!symbol) continue;
      if (realTimeDataCache.has(symbol) || loadingSymbols.has(symbol) || failedSymbols.has(symbol)) continue;

      await fetchRealTimeQuote(symbol);
      // small gap to avoid tight loops even if rate limiter allows
      await sleep(200);
    }

    isFetchingRef.current = false;
  }, [realTimeDataCache, loadingSymbols, failedSymbols, fetchRealTimeQuote]);

  // Apply pending updates to displayed data
  const applyPendingUpdates = useCallback(() => {
    if (pendingUpdates.size === 0) return;
    setDisplayedData(prev => {
      const next = new Map(prev);
      for (const [k, v] of pendingUpdates.entries()) next.set(k, v);
      return next;
    });
    setPendingUpdates(new Map());
  }, [pendingUpdates]);

  // Fetch metadata (LISTING_STATUS)
  const fetchStockMetadata = useCallback(async () => {
    setLoading(true);
    try {
      if (BACKEND_URL) {
        try {
          const resp = await fetch(`${BACKEND_URL}/listing`);
          if (resp.ok) {
            const json = await resp.json();
            setStocksMetadata(json);
            localStorage.setItem(METADATA_CACHE_KEY, JSON.stringify(json));
            localStorage.setItem(METADATA_CACHE_KEY + '_timestamp', Date.now().toString());
            return;
          }
        } catch (e) { /* fall through to direct */ }
      }

      const resp = await fetch(`https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${API_KEY}`);
      if (!resp.ok) throw new Error('Failed to fetch listing');
      const txt = await resp.text();
      const parsed = parseListingCSV(txt);
      setStocksMetadata(parsed);
      localStorage.setItem(METADATA_CACHE_KEY, JSON.stringify(parsed));
      localStorage.setItem(METADATA_CACHE_KEY + '_timestamp', Date.now().toString());

      // queue priority
      queueSymbolsForFetch(PRIORITY_SYMBOLS);
    } catch (e) {
      console.error('fetchStockMetadata failed', e);
      // fallback to cache if available
      loadMetadataFromCache();
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [queueSymbolsForFetch, loadMetadataFromCache]);

  // Initial load
  useEffect(() => {
    const meta = loadMetadataFromCache();
    const rtLoaded = loadRealTimeDataFromCache();
    if (!meta) fetchStockMetadata();
    else {
      // still queue priority for freshness
      queueSymbolsForFetch(PRIORITY_SYMBOLS);
      setInitialLoad(false);
    }
  }, [fetchStockMetadata, loadMetadataFromCache, loadRealTimeDataFromCache, queueSymbolsForFetch]);

  // When page/filters change, queue visible symbols
  useEffect(() => {
    if (stocksMetadata.length === 0) return;
    applyPendingUpdates();

    const visible = getCurrentPageStocksMemo(stocksMetadata, displayedData, searchTerm, selectedExchange, sortConfig, currentPage, stocksPerPage);
    const symbolsToFetch = visible.filter(s => !s.hasRealData).map(s => s.symbol).slice(0, 12);
    if (symbolsToFetch.length > 0) queueSymbolsForFetch(symbolsToFetch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, selectedExchange, sortConfig, stocksMetadata, displayedData]);

  // Auto apply pending updates when enabled
  useEffect(() => {
    if (!autoUpdate) return;
    if (pendingUpdates.size === 0) return;
    const id = setInterval(() => applyPendingUpdates(), 3500);
    return () => clearInterval(id);
  }, [autoUpdate, pendingUpdates, applyPendingUpdates]);

  // Fetch watchlist
  useEffect(() => {
    if (watchlist.length > 0 && stocksMetadata.length > 0) {
      queueSymbolsForFetch(watchlist);
    }
  }, [watchlist, stocksMetadata, queueSymbolsForFetch]);

  // Reset page when filters change
  useEffect(() => setCurrentPage(1), [searchTerm, selectedExchange, sortConfig]);

  // ----------------- Memoized computations -----------------
  // Combined stock data memo
  const combinedDataMemo = useMemo(() => {
    const map = displayedData;
    return stocksMetadata.map(stock => {
      const d = map.get(stock.symbol);
      if (d) return { ...stock, ...d, hasRealData: true };
      return { ...stock, price: 0, change: 0, changePercent: 0, marketCap: null, volume: 0, hasRealData: false } as any;
    });
  }, [stocksMetadata, displayedData]);

  const filteredAndSortedMemo = useMemo(() => {
    let filtered = combinedDataMemo;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter(s => s.symbol.toLowerCase().includes(t) || s.name.toLowerCase().includes(t));
    }
    if (selectedExchange !== 'all') filtered = filtered.filter(s => s.exchange === selectedExchange);

    const sortKey = sortConfig.key;
    filtered.sort((a: any, b: any) => {
      // prioritize real data
      if (a.hasRealData && !b.hasRealData) return -1;
      if (!a.hasRealData && b.hasRealData) return 1;

      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (!isNaN(aVal) && !isNaN(bVal)) {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (sortConfig.direction === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [combinedDataMemo, searchTerm, selectedExchange, sortConfig]);

  // Helper used in effects (non-hook)
  function getCurrentPageStocksMemo(meta: StockMeta[], displayed: Map<string, RealTimeData>, search: string, exchange: string, sort: any, page: number, perPage: number) {
    const combined = meta.map(stock => ({ ...(displayed.get(stock.symbol) ? { ...(displayed.get(stock.symbol) as any) } : {}), ...stock }));
    let filtered = combined;
    if (search) {
      const t = search.toLowerCase();
      filtered = filtered.filter(s => s.symbol?.toLowerCase()?.includes(t) || s.name?.toLowerCase()?.includes(t));
    }
    if (exchange !== 'all') filtered = filtered.filter(s => s.exchange === exchange);
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }

  // ----------------- UI Helpers -----------------
  const formatNumber = (num: number | null | undefined, format?: string) => {
    if (num == null || isNaN(num as any)) return '-';
    if (format === 'marketCap') {
      if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
      if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
      if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
      return `$${Math.round(num)}`;
    }
    if (format === 'volume') {
      if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
      if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
      return num.toLocaleString();
    }
    return num.toLocaleString();
  };

  const hasPendingUpdate = (symbol: string) => pendingUpdates.has(symbol) && !displayedData.has(symbol);

  // ----------------- Actions -----------------
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const toggleWatchlist = (symbol: string) => {
    setWatchlist(prev => {
      const isIn = prev.includes(symbol);
      const next = isIn ? prev.filter(s => s !== symbol) : [...prev, symbol];
      try { localStorage.setItem('wallstsmart_watchlist', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const navigateToStock = (symbol: string) => navigate(`/stock/${symbol}`);

  const handleRefresh = async () => {
    applyPendingUpdates();
    setFailedSymbols(new Set());
    fetchQueueRef.current = [];
    await fetchStockMetadata();
    const visible = filteredAndSortedMemo.slice((currentPage - 1) * stocksPerPage, currentPage * stocksPerPage);
    queueSymbolsForFetch(visible.map(s => s.symbol));
  };

  const refreshSymbol = async (symbol: string) => {
    setFailedSymbols(prev => { const next = new Set(prev); next.delete(symbol); return next; });
    await fetchRealTimeQuote(symbol);
    // apply immediately
    applyPendingUpdates();
  };

  const exportToCSV = (exportAll = false) => {
    const data = exportAll ? filteredAndSortedMemo : filteredAndSortedMemo.slice((currentPage - 1) * stocksPerPage, currentPage * stocksPerPage);
    const headers = ['Symbol','Company','Exchange','Price','Change %','Market Cap','Volume','Data Status','In Watchlist'];
    const rows = data.map((s: any) => [
      s.symbol,
      `"${s.name}"`,
      s.exchange,
      s.hasRealData ? (s.price?.toFixed(2) ?? '') : 'N/A',
      s.hasRealData ? (s.changePercent != null ? `${(s.changePercent >= 0 ? '+' : '')}${s.changePercent.toFixed(2)}%` : '') : 'N/A',
      s.marketCap ? s.marketCap : 'N/A',
      s.hasRealData ? s.volume : 'N/A',
      s.hasRealData ? 'Real-Time' : 'Pending',
      watchlist.includes(s.symbol) ? 'Yes' : 'No'
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `wallstsmart_screener_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  // Pagination
  const totalStocks = filteredAndSortedMemo.length;
  const totalPages = Math.max(1, Math.ceil(totalStocks / stocksPerPage));

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const max = 7;
    if (totalPages <= max) for (let i=1;i<=totalPages;i++) pages.push(i);
    else {
      if (currentPage <= 4) { for (let i=1;i<=5;i++) pages.push(i); pages.push('...'); pages.push(totalPages); }
      else if (currentPage >= totalPages - 3) { pages.push(1); pages.push('...'); for (let i=totalPages-4;i<=totalPages;i++) pages.push(i); }
      else { pages.push(1); pages.push('...'); pages.push(currentPage-1); pages.push(currentPage); pages.push(currentPage+1); pages.push('...'); pages.push(totalPages); }
    }
    return pages;
  };

  // ----------------- Render -----------------
  const displayedStocks = filteredAndSortedMemo.slice((currentPage - 1) * stocksPerPage, currentPage * stocksPerPage);
  const stocksWithRealData = displayedStocks.filter(s => s.hasRealData).length;
  const pendingUpdateCount = Array.from(pendingUpdates.keys()).filter(symbol => displayedStocks.some((s:any) => s.symbol === symbol)).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">Smart Screener</h1>
              <p className="text-gray-400 text-sm mt-1">
                <span className="text-green-400 font-semibold ml-0">{totalStocks.toLocaleString()}</span> stocks •
                <span className="text-blue-400 font-semibold ml-2">{new Set(stocksMetadata.map(s => s.exchange)).size}</span> exchanges •
                <span className="text-yellow-400 font-semibold ml-2">{stocksWithRealData}/{displayedStocks.length} loaded</span>
                {pendingUpdateCount > 0 && (<span className="text-orange-400 ml-2"> • {pendingUpdateCount} updates pending</span>)}
                {watchlist.length > 0 && (<span className="text-purple-400 ml-2"> • <Star className="inline w-3 h-3 mr-1 fill-current" />{watchlist.length} watchlist</span>)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {pendingUpdateCount > 0 && (
                <button onClick={applyPendingUpdates} className="px-4 py-2 bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2" title="Apply pending updates">
                  <Eye className="w-4 h-4" /> Show Updates ({pendingUpdateCount})
                </button>
              )}
              <button onClick={() => setAutoUpdate(prev => !prev)} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${autoUpdate ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 hover:bg-gray-700'}`} title={autoUpdate ? 'Disable auto-update' : 'Enable auto-update'}>
                <RefreshCw className={`w-4 h-4 ${autoUpdate ? 'animate-spin' : ''}`} /> {autoUpdate ? 'Auto' : 'Manual'}
              </button>
              <button onClick={handleRefresh} disabled={loading} className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <div className="relative inline-flex">
                <button onClick={() => exportToCSV(false)} className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export Page
                </button>
                <button onClick={() => exportToCSV(true)} className="ml-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Update notice */}
        {pendingUpdateCount > 0 && !autoUpdate && (
          <div className="bg-orange-900/20 border border-orange-600/30 rounded-lg p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><AlertCircle className="w-5 h-5 text-orange-500" /><p className="text-sm text-orange-200">{pendingUpdateCount} stock{pendingUpdateCount>1 ? 's have' : ' has'} new data available. Click "Show Updates" to apply.</p></div>
            <button onClick={applyPendingUpdates} className="text-orange-400 hover:text-orange-300 text-sm font-medium">Show Updates</button>
          </div>
        )}

        {/* Loading indicator */}
        {loadingSymbols.size > 0 && (
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 mb-4 flex items-center gap-3"><Loader className="w-5 h-5 text-blue-500 animate-spin" /><p className="text-sm text-blue-200">Loading data for {loadingSymbols.size} symbol{loadingSymbols.size>1 ? 's' : ''}...</p></div>
        )}

        {/* Filters */}
        <div className="bg-gray-900 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchTermRaw} onChange={e => setSearchTermRaw(e.target.value)} placeholder="Search by symbol or company..." className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>

              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <select value={selectedExchange} onChange={e => setSelectedExchange(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20">
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

            <div className="text-sm text-gray-400">Showing {((currentPage-1)*stocksPerPage)+1} - {Math.min(currentPage*stocksPerPage, totalStocks)} of {totalStocks.toLocaleString()}</div>
          </div>
        </div>

        {/* Table or placeholders */}
        {initialLoad && loading ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center"><RefreshCw className="w-12 h-12 text-green-500 mx-auto mb-4 animate-spin" /><h3 className="text-lg font-medium text-gray-300 mb-2">Loading Market Data...</h3><p className="text-gray-500">Fetching stocks from global exchanges</p></div>
        ) : displayedStocks.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center"><Search className="w-12 h-12 text-gray-500 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-300 mb-2">No stocks found</h3><p className="text-gray-500">Try adjusting your search or filters</p></div>
        ) : (
          <>
            <div className="bg-gray-900 rounded-xl overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-850">
                      <th className="sticky left-0 bg-gray-850 z-10 text-left px-4 py-3"><button onClick={() => handleSort('symbol')} className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1">Symbol <ArrowUpDown className="w-3 h-3" /></button></th>
                      <th className="text-left px-4 py-3 min-w-[200px]"><button onClick={() => handleSort('name')} className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1">Company <ArrowUpDown className="w-3 h-3" /></button></th>
                      <th className="text-left px-4 py-3"><span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Exchange</span></th>
                      <th className="text-right px-4 py-3"><button onClick={() => handleSort('price')} className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto">Price <ArrowUpDown className="w-3 h-3" /></button></th>
                      <th className="text-right px-4 py-3"><button onClick={() => handleSort('changePercent')} className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto">Change <ArrowUpDown className="w-3 h-3" /></button></th>
                      <th className="text-right px-4 py-3"><button onClick={() => handleSort('marketCap')} className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto">Market Cap <ArrowUpDown className="w-3 h-3" /></button></th>
                      <th className="text-right px-4 py-3"><button onClick={() => handleSort('volume')} className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto">Volume <ArrowUpDown className="w-3 h-3" /></button></th>
                      <th className="text-center px-4 py-3"><span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedStocks.map((stock: any, index: number) => {
                      const isPending = hasPendingUpdate(stock.symbol);
                      return (
                        <tr key={`${stock.symbol}-${index}`} className={`border-b border-gray-800 hover:bg-gray-850 transition-colors ${index%2===0 ? 'bg-gray-900' : 'bg-gray-900/50'} ${!stock.hasRealData ? 'opacity-60' : ''} ${isPending ? 'ring-1 ring-orange-500/30' : ''}`}>
                          <td className="sticky left-0 z-10 px-4 py-3 bg-inherit"><div className="flex items-center gap-2"><button onClick={() => navigateToStock(stock.symbol)} className="font-medium text-blue-400 hover:text-blue-300 hover:underline transition-colors text-left group flex items-center gap-1">{stock.symbol} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></button>{loadingSymbols.has(stock.symbol) && <Loader className="w-3 h-3 text-gray-400 animate-spin" />}{isPending && <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">new</span>}</div></td>
                          <td className="px-4 py-3"><button onClick={() => navigateToStock(stock.symbol)} className="text-sm text-gray-300 hover:text-white transition-colors max-w-xs truncate block text-left" title={stock.name}>{stock.name}</button></td>
                          <td className="px-4 py-3 text-sm"><span className="px-2 py-1 bg-gray-800 rounded text-xs font-medium text-gray-300">{stock.exchange}</span></td>
                          <td className="px-4 py-3 text-right font-medium">{stock.hasRealData ? `$${(stock.price || 0).toFixed(2)}` : <span className="text-gray-500">--</span>}</td>
                          <td className={`px-4 py-3 text-right font-medium ${stock.hasRealData ? (stock.changePercent>=0 ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}`}>{stock.hasRealData ? `${stock.changePercent>=0 ? '+' : ''}${(stock.changePercent||0).toFixed(2)}%` : '--'}</td>
                          <td className="px-4 py-3 text-right text-sm">{stock.marketCap ? formatNumber(stock.marketCap,'marketCap') : <span className="text-gray-500">--</span>}</td>
                          <td className="px-4 py-3 text-right text-sm">{stock.hasRealData && stock.volume ? formatNumber(stock.volume,'volume') : <span className="text-gray-500">--</span>}</td>
                          <td className="px-4 py-3"><div className="flex items-center justify-center gap-1"><button onClick={() => toggleWatchlist(stock.symbol)} className="p-1.5 hover:bg-gray-800 rounded-lg transition-all group" title={watchlist.includes(stock.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}><Star className={`w-4 h-4 transition-all ${watchlist.includes(stock.symbol) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400 group-hover:text-yellow-400'}`} /></button>{!stock.hasRealData && !loadingSymbols.has(stock.symbol) && <button onClick={() => refreshSymbol(stock.symbol)} className="p-1.5 hover:bg-gray-800 rounded-lg transition-all group" title="Load data"><RefreshCw className="w-4 h-4 text-gray-400 group-hover:text-green-400" /></button>}</div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages>1 && (
              <div className="bg-gray-900 rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(prev => Math.max(1, prev-1))} disabled={currentPage===1} className="px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Previous</button>
                    <div className="flex items-center gap-1">{getPageNumbers().map((page, idx) => page === '...' ? <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-500">...</span> : (<button key={page} onClick={() => setCurrentPage(Number(page))} className={`px-3 py-2 rounded-lg transition-colors ${currentPage===page ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}>{page}</button>))}</div>
                    <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev+1))} disabled={currentPage===totalPages} className="px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1">Next <ChevronRight className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-3 text-sm"><span className="text-gray-400">Jump to page:</span><input type="number" min={1} max={totalPages} value={currentPage} onChange={(e) => { const p = parseInt(e.target.value); if (!isNaN(p) && p>=1 && p<=totalPages) setCurrentPage(p); }} className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-center text-white focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20" /><span className="text-gray-400">of {totalPages.toLocaleString()}</span></div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
