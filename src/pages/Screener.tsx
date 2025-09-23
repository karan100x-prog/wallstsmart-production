import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * CompleteMarketScreener.tsx
 * - Accurate data only (no random placeholders)
 * - GLOBAL_QUOTE -> Price, Change, Change %, Volume
 * - OVERVIEW     -> MarketCap, PERatio, DividendYield
 * - localStorage caching with TTL (quotes ~60s, overview ~6h)
 * - Optional BACKEND aggregator for speed: REACT_APP_BACKEND_URL=/api
 */

// ===== Configuration =====
const API_KEY = 'NMSRS0ZDIOWF3CLL'; // (You already expose it; backend strongly recommended)
const BACKEND_URL =
  (import.meta as any)?.env?.VITE_BACKEND_URL ||
  (process as any)?.env?.REACT_APP_BACKEND_URL ||
  '';

const LISTING_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const QUOTE_TTL_MS = 60 * 1000; // 60s
const OVERVIEW_TTL_MS = 6 * 60 * 60 * 1000; // 6h

const LS_LISTING_KEY = 'wss_listing_v1';
const LS_LISTING_TS_KEY = 'wss_listing_ts_v1';
const LS_QUOTES_KEY = 'wss_quotes_v1'; // { [symbol]: { data, ts } }
const LS_OVERVIEW_KEY = 'wss_overviews_v1'; // { [symbol]: { data, ts } }

// Lower page size to reduce initial API load when not using backend
const STOCKS_PER_PAGE = 50;

// ===== Types (loose to stay compatible with JS projects) =====
type StockMeta = {
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
  status: string;
  ipoDate?: string | null;
  delistingDate?: string | null;
};

type QuoteRow = {
  price: number;
  change: number;
  changePercent: number; // %
  volume: number;
  ts: number;
};

type OverviewRow = {
  marketCap: number | null;
  peRatio: number | null;
  dividendYield: number | null; // as decimal (e.g., 0.0123)
  ts: number;
};

// ===== Utilities =====
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Robust CSV parser (handles quoted commas)
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let cur = '';
  let row: string[] = [];
  let i = 0;
  let inQuotes = false;

  while (i < csvText.length) {
    const ch = csvText[i];

    if (inQuotes) {
      if (ch === '"') {
        if (csvText[i + 1] === '"') {
          cur += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        cur += ch;
        i++;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ',') {
      row.push(cur);
      cur = '';
      i++;
      continue;
    }

    if (ch === '\n' || ch === '\r') {
      if (cur.length || row.length) {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
      }
      i++;
      while (csvText[i] === '\n' || csvText[i] === '\r') i++;
      continue;
    }

    cur += ch;
    i++;
  }

  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }

  return rows;
}

function parseListingCSV(csvText: string): StockMeta[] {
  const rows = parseCSV(csvText);
  if (rows.length <= 1) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const iSymbol = idx('symbol');
  const iName = idx('name');
  const iExchange = idx('exchange');
  const iAssetType = idx('asset type');
  const iIpo = idx('ipo date');
  const iDelist = idx('delisting date');
  const iStatus = idx('status');

  const out: StockMeta[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row?.length) continue;

    const assetType = (row[iAssetType] || '').trim();
    const status = (row[iStatus] || 'Active').trim();

    if ((assetType === 'Stock' || assetType === 'ETF') && status === 'Active') {
      out.push({
        symbol: (row[iSymbol] || '').trim(),
        name: (row[iName] || '').trim(),
        exchange: (row[iExchange] || '').trim(),
        assetType,
        status,
        ipoDate: row[iIpo] || null,
        delistingDate: row[iDelist] || null
      });
    }
  }
  return out;
}

function formatNumber(num: number | null | undefined, kind?: 'marketCap' | 'volume'): string {
  if (num == null || Number.isNaN(num)) return '-';
  if (kind === 'marketCap') {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${Math.round(num)}`;
  }
  if (kind === 'volume') {
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  }
  return num.toLocaleString();
}

// ===== LocalStorage helpers =====
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function saveJSON(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ===== Component =====
export default function CompleteMarketScreener() {
  const navigate = useNavigate();

  const [listing, setListing] = useState<StockMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExchange, setSelectedExchange] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'marketCap',
    direction: 'desc'
  });

  // Data caches in memory (synced to localStorage)
  const [quotes, setQuotes] = useState<Record<string, QuoteRow>>(() => loadJSON(LS_QUOTES_KEY, {}));
  const [overviews, setOverviews] = useState<Record<string, OverviewRow>>(() => loadJSON(LS_OVERVIEW_KEY, {}));

  // For UX indicators
  const [loadingQuotes, setLoadingQuotes] = useState<Set<string>>(new Set());
  const [loadingOverview, setLoadingOverview] = useState<Set<string>>(new Set());

  const isUsingBackend = Boolean(BACKEND_URL);

  // ===== Fetch Listing (LISTING_STATUS) =====
  useEffect(() => {
    const tryCache = () => {
      const cached = loadJSON<StockMeta[]>(LS_LISTING_KEY, []);
      const tsStr = localStorage.getItem(LS_LISTING_TS_KEY);
      if (cached.length && tsStr) {
        const age = Date.now() - parseInt(tsStr, 10);
        if (age < LISTING_TTL_MS) {
          setListing(cached);
          return true;
        }
      }
      return false;
    };

    async function fetchListing() {
      setLoading(true);
      try {
        if (!tryCache()) {
          // Try backend (CSV) first
          if (isUsingBackend) {
            const r = await fetch(`${BACKEND_URL}/listing`);
            if (r.ok) {
              const txt = await r.text();
              const parsed = parseListingCSV(txt);
              setListing(parsed);
              saveJSON(LS_LISTING_KEY, parsed);
              localStorage.setItem(LS_LISTING_TS_KEY, Date.now().toString());
              return;
            }
          }
          // Fallback: direct AV
          const r = await fetch(
            `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${API_KEY}`
          );
          if (!r.ok) throw new Error('LISTING_STATUS failed');
          const txt = await r.text();
          const parsed = parseListingCSV(txt);
          setListing(parsed);
          saveJSON(LS_LISTING_KEY, parsed);
          localStorage.setItem(LS_LISTING_TS_KEY, Date.now().toString());
        }
      } catch (e) {
        console.error('Error loading listing:', e);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    }

    fetchListing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Derived / filtered stocks =====
  const filteredStocks = useMemo(() => {
    let arr = listing;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      arr = arr.filter((s) => s.symbol.toLowerCase().includes(t) || s.name.toLowerCase().includes(t));
    }
    if (selectedExchange !== 'all') {
      arr = arr.filter((s) => s.exchange === selectedExchange);
    }
    return arr;
  }, [listing, searchTerm, selectedExchange]);

  // Merge metrics for sorting/display
  const mergedRows = useMemo(() => {
    return filteredStocks.map((s) => {
      const q = quotes[s.symbol];
      const o = overviews[s.symbol];
      return {
        ...s,
        price: q?.price ?? null,
        changePercent: q?.changePercent ?? null,
        change: q?.change ?? null,
        volume: q?.volume ?? null,
        marketCap: o?.marketCap ?? null,
        peRatio: o?.peRatio ?? null,
        dividendYield: o?.dividendYield ?? null
      };
    });
  }, [filteredStocks, quotes, overviews]);

  const sortedRows = useMemo(() => {
    const arr = [...mergedRows];
    const { key, direction } = sortConfig;

    arr.sort((a: any, b: any) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string' && typeof bv === 'string') {
        return direction === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const aNum = typeof av === 'number' ? av : parseFloat(av);
      const bNum = typeof bv === 'number' ? bv : parseFloat(bv);
      if (Number.isNaN(aNum) && Number.isNaN(bNum)) return 0;
      if (Number.isNaN(aNum)) return 1;
      if (Number.isNaN(bNum)) return -1;
      return direction === 'asc' ? aNum - bNum : bNum - aNum;
    });

    return arr;
  }, [mergedRows, sortConfig]);

  const totalStocks = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalStocks / STOCKS_PER_PAGE));
  const start = (currentPage - 1) * STOCKS_PER_PAGE;
  const end = start + STOCKS_PER_PAGE;
  const pageRows = sortedRows.slice(start, end);
  const visibleSymbols = pageRows.map((r) => r.symbol);

  // ===== Quotes & Overview fetchers (with cache + backend support) =====
  const getCachedQuote = (symbol: string): QuoteRow | null => {
    const row = quotes[symbol];
    if (!row) return null;
    if (Date.now() - row.ts > QUOTE_TTL_MS) return null;
    return row;
  };

  const getCachedOverview = (symbol: string): OverviewRow | null => {
    const row = overviews[symbol];
    if (!row) return null;
    if (Date.now() - row.ts > OVERVIEW_TTL_MS) return null;
    return row;
  };

  async function fetchQuotesForSymbols(symbols: string[]) {
    // Only fetch those that are stale/missing
    const need = symbols.filter((s) => !getCachedQuote(s));

    if (need.length === 0) return;

    // Use backend batch endpoint if available
    if (isUsingBackend) {
      // chunk into reasonable batches to avoid very long query strings
      const chunkSize = 60;
      for (let i = 0; i < need.length; i += chunkSize) {
        const chunk = need.slice(i, i + chunkSize);
        try {
          const r = await fetch(`${BACKEND_URL}/quote?symbols=${encodeURIComponent(chunk.join(','))}`);
          if (r.ok) {
            const json = await r.json(); // { [symbol]: <AV Global Quote object> }
            const next: Record<string, QuoteRow> = {};
            const now = Date.now();
            for (const sym of chunk) {
              const q = json[sym];
              if (q) {
                next[sym] = {
                  price: parseFloat(q['05. price'] || '0') || 0,
                  change: parseFloat(q['09. change'] || '0') || 0,
                  changePercent: parseFloat((q['10. change percent'] || '').replace('%', '')) || 0,
                  volume: parseInt(q['06. volume'] || '0', 10) || 0,
                  ts: now
                };
              }
            }
            setQuotes((prev) => {
              const merged = { ...prev, ...next };
              saveJSON(LS_QUOTES_KEY, merged);
              return merged;
            });
          }
        } catch (e) {
          console.error('Backend quote fetch failed:', e);
        }
      }
      return;
    }

    // Fallback: direct AV calls with pacing
    for (const sym of need) {
      setLoadingQuotes((prev) => new Set(prev).add(sym));
      try {
        const r = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
            sym
          )}&apikey=${API_KEY}`
        );
        const j = await r.json();
        const q = j?.['Global Quote'];
        if (q) {
          const now = Date.now();
          const row: QuoteRow = {
            price: parseFloat(q['05. price'] || '0') || 0,
            change: parseFloat(q['09. change'] || '0') || 0,
            changePercent: parseFloat((q['10. change percent'] || '').replace('%', '')) || 0,
            volume: parseInt(q['06. volume'] || '0', 10) || 0,
            ts: now
          };
          setQuotes((prev) => {
            const merged = { ...prev, [sym]: row };
            saveJSON(LS_QUOTES_KEY, merged);
            return merged;
          });
        }
      } catch (e) {
        console.error('GLOBAL_QUOTE failed', sym, e);
      } finally {
        setLoadingQuotes((prev) => {
          const n = new Set(prev);
          n.delete(sym);
          return n;
        });
      }
      // Pace to respect 75/min
      await sleep(1000);
    }
  }

  async function fetchOverviewForSymbols(symbols: string[]) {
    const need = symbols.filter((s) => !getCachedOverview(s));
    if (need.length === 0) return;

    for (const sym of need) {
      setLoadingOverview((prev) => new Set(prev).add(sym));
      try {
        if (isUsingBackend) {
          const r = await fetch(`${BACKEND_URL}/overview?symbol=${encodeURIComponent(sym)}`);
          if (r.ok) {
            const j = await r.json();
            const row: OverviewRow = {
              marketCap: j?.MarketCapitalization ? parseInt(j.MarketCapitalization, 10) : null,
              peRatio: j?.PERatio ? parseFloat(j.PERatio) : null,
              dividendYield: j?.DividendYield ? parseFloat(j.DividendYield) : null,
              ts: Date.now()
            };
            setOverviews((prev) => {
              const merged = { ...prev, [sym]: row };
              saveJSON(LS_OVERVIEW_KEY, merged);
              return merged;
            });
          }
        } else {
          // Direct AV
          const r = await fetch(
            `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(
              sym
            )}&apikey=${API_KEY}`
          );
          if (r.ok) {
            const j = await r.json();
            const row: OverviewRow = {
              marketCap: j?.MarketCapitalization ? parseInt(j.MarketCapitalization, 10) : null,
              peRatio: j?.PERatio ? parseFloat(j.PERatio) : null,
              dividendYield: j?.DividendYield ? parseFloat(j.DividendYield) : null,
              ts: Date.now()
            };
            setOverviews((prev) => {
              const merged = { ...prev, [sym]: row };
              saveJSON(LS_OVERVIEW_KEY, merged);
              return merged;
            });
          }
        }
      } catch (e) {
        console.error('OVERVIEW failed', sym, e);
      } finally {
        setLoadingOverview((prev) => {
          const n = new Set(prev);
          n.delete(sym);
          return n;
        });
      }
      // Pace (counted against AV limit too)
      if (!isUsingBackend) await sleep(1000);
    }
  }

  // Fetch visible data whenever listing/page/search/sort/exchange changes
  useEffect(() => {
    if (visibleSymbols.length === 0) return;
    // Fetch quotes quickly
    fetchQuotesForSymbols(visibleSymbols);
    // Fetch fundamentals (slower)
    fetchOverviewForSymbols(visibleSymbols);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, selectedExchange, sortConfig, listing]);

  // ===== Handlers =====
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      const dir: 'asc' | 'desc' =
        prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc';
      return { key, direction: dir };
    });
  };

  const navigateToStock = (symbol: string) => navigate(`/stock/${symbol}`);

  const exportToCSV = () => {
    const headers = [
      'Symbol',
      'Company',
      'Exchange',
      'Price',
      'Change%',
      'MarketCap',
      'P/E',
      'DivYield',
      'Volume'
    ];
    const rows = pageRows.map((r: any) => [
      r.symbol,
      `"${r.name}"`,
      r.exchange,
      r.price ?? '',
      r.changePercent ?? '',
      r.marketCap ?? '',
      r.peRatio ?? '',
      r.dividendYield ?? '',
      r.volume ?? ''
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallstsmart_screener_p${currentPage}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const max = 7;
    if (totalPages <= max) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  // ===== Render =====
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Market Screener
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              <span className="text-green-400 font-semibold">{listing.length.toLocaleString()}</span>{' '}
              active listings •{' '}
              <span className="text-blue-400 font-semibold">{new Set(listing.map(s => s.exchange)).size}</span>{' '}
              exchanges {isUsingBackend ? '• accelerated via backend cache' : ''}
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {(loadingQuotes.size > 0 || loadingOverview.size > 0) && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Loader className="w-4 h-4 animate-spin" />
                updating {loadingQuotes.size + loadingOverview.size}
              </span>
            )}
            <button
              onClick={() => {
                // Clear TTL to force fresh
                saveJSON(LS_QUOTES_KEY, {});
                saveJSON(LS_OVERVIEW_KEY, {});
                setQuotes({});
                setOverviews({});
                // refetch visible
                fetchQuotesForSymbols(visibleSymbols);
                fetchOverviewForSymbols(visibleSymbols);
              }}
              className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="bg-gray-900 rounded-xl p-4 mb-4 flex justify-between flex-wrap gap-4">
          <div className="flex gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by symbol or company..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <select
                value={selectedExchange}
                onChange={(e) => setSelectedExchange(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
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
          <div className="text-sm text-gray-400">
            {totalStocks > 0 &&
              `Showing ${start + 1} - ${Math.min(end, totalStocks)} of ${totalStocks.toLocaleString()}`}
          </div>
        </div>

        {/* Table */}
        {initialLoad && loading ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <RefreshCw className="w-12 h-12 text-green-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">Loading Market Data...</h3>
            <p className="text-gray-500">Fetching listings</p>
          </div>
        ) : pageRows.length === 0 ? (
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
                      <Th label="Symbol" onClick={() => handleSort('symbol')} />
                      <Th label="Company" onClick={() => handleSort('name')} />
                      <Th label="Exchange" onClick={() => handleSort('exchange')} />
                      <Th label="Price" align="right" onClick={() => handleSort('price')} />
                      <Th label="Change %" align="right" onClick={() => handleSort('changePercent')} />
                      <Th label="Market Cap" align="right" onClick={() => handleSort('marketCap')} />
                      <Th label="P/E" align="right" onClick={() => handleSort('peRatio')} />
                      <Th label="Div Yield" align="right" onClick={() => handleSort('dividendYield')} />
                      <Th label="Volume" align="right" onClick={() => handleSort('volume')} />
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row: any, idx: number) => {
                      const qLoading = loadingQuotes.has(row.symbol);
                      const oLoading = loadingOverview.has(row.symbol);
                      const anyLoading = qLoading || oLoading;

                      const changeClass =
                        row.changePercent == null
                          ? 'text-gray-400'
                          : row.changePercent >= 0
                          ? 'text-green-400'
                          : 'text-red-400';

                      return (
                        <tr
                          key={`${row.symbol}-${idx}`}
                          className={`border-b border-gray-800 hover:bg-gray-850 transition-colors ${
                            idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <button
                              onClick={() => navigate(`/stock/${row.symbol}`)}
                              className="font-medium text-blue-400 hover:text-blue-300 hover:underline transition-colors text-left group inline-flex items-center gap-1"
                            >
                              {row.symbol}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{row.name}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 bg-gray-800 rounded text-xs font-medium text-gray-300">
                              {row.exchange}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {row.price == null ? (anyLoading ? '…' : '-') : `$${row.price.toFixed(2)}`}
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${changeClass}`}>
                            {row.changePercent == null
                              ? anyLoading
                                ? '…'
                                : '-'
                              : `${row.changePercent >= 0 ? '+' : ''}${row.changePercent.toFixed(2)}%`}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {row.marketCap == null ? (oLoading ? '…' : '-') : formatNumber(row.marketCap, 'marketCap')}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {row.peRatio == null ? (oLoading ? '…' : '-') : row.peRatio.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {row.dividendYield == null
                              ? (oLoading ? '…' : '-')
                              : `${(row.dividendYield * 100).toFixed(2)}%`}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {row.volume == null ? (qLoading ? '…' : '-') : formatNumber(row.volume, 'volume')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors group"
                              title="Add to watchlist"
                            >
                              <Star className="w-4 h-4 text-gray-400 group-hover:text-yellow-400 transition-colors" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((pg, i) =>
                        pg === '...' ? (
                          <span key={`ellipsis-${i}`} className="px-3 py-2 text-gray-500">
                            ...
                          </span>
                        ) : (
                          <button
                            key={pg as number}
                            onClick={() => setCurrentPage(pg as number)}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              currentPage === pg
                                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold'
                                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                            }`}
                          >
                            {pg}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
                      min={1}
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const page = parseInt(e.target.value, 10);
                        if (!Number.isNaN(page) && page >= 1 && page <= totalPages) setCurrentPage(page);
                      }}
                      className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-center text-white focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
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

// Small header cell helper
function Th({
  label,
  align,
  onClick
}: {
  label: string;
  align?: 'left' | 'right';
  onClick?: () => void;
}) {
  return (
    <th className={`${align === 'right' ? 'text-right' : 'text-left'} px-4 py-3`}>
      <button
        onClick={onClick}
        className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto"
        style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start', width: '100%' }}
      >
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </button>
    </th>
  );
}
