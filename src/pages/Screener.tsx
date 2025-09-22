import React, { useEffect, useMemo, useState } from 'react';
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
  country?: string;
  psRatio: number | null;
};

export default function CompleteMarketScreener(): JSX.Element {
  const navigate = useNavigate();

  const [allStocksData, setAllStocksData] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Stock | 'name' | 'symbol'; direction: 'asc' | 'desc' }>({
    key: 'marketCap',
    direction: 'desc',
  });
  const [selectedExchange, setSelectedExchange] = useState('all');
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [marketStats, setMarketStats] = useState({
    totalStocks: 0,
    activeStocks: 0,
    delistedStocks: 0,
    exchanges: [] as string[],
  });

  // Watchlist is stored in state to avoid localStorage access during SSR/render
  const [watchlist, setWatchlist] = useState<string[]>([]);

  const stocksPerPage = 100;
  const API_KEY = 'NMSRS0ZDIOWF3CLL';
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // ---------- Helpers ----------
  const normalizeStock = (raw: any): Stock => {
    const numberOrZero = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    return {
      symbol: raw.symbol ?? raw.Symbol ?? '',
      name: raw.name ?? raw.Name ?? '',
      exchange: raw.exchange ?? raw.Exchange ?? '',
      assetType: raw.assetType ?? raw.asset_type ?? '',
      ipoDate: raw.ipoDate ?? raw.ipo_date ?? '',
      delistingDate: raw.delistingDate ?? raw.delisting_date ?? null,
      status: raw.status ?? raw.Status ?? 'Active',
      price: numberOrZero(raw.price ?? raw['05. price']),
      change: numberOrZero(raw.change ?? raw['09. change']),
      changePercent: numberOrZero(raw.changePercent ?? raw['10. change percent']?.replace?.('%', '')),
      marketCap: numberOrZero(raw.marketCap ?? raw.MarketCapitalization ?? raw.market_cap),
      peRatio: (() => {
        const p = Number(raw.peRatio ?? raw.PERatio);
        return Number.isFinite(p) && p !== 0 ? p : null;
      })(),
      volume: numberOrZero(raw.volume ?? raw['06. volume']),
      industry: raw.industry ?? raw.Industry ?? 'N/A',
      country: raw.country ?? raw.Country ?? 'N/A',
      psRatio: (() => {
        const p = Number(raw.psRatio ?? raw.PriceToSalesRatioTTM);
        return Number.isFinite(p) && p !== 0 ? p : null;
      })(),
    };
  };

  const safeCurrency = (v: number) => (Number.isFinite(v) ? `$${v.toFixed(2)}` : '-');
  const safeNumber = (v: number | null | undefined, decimals = 2) =>
    Number.isFinite(Number(v as any)) ? (Number(v).toFixed(decimals)) : '-';
  const formatMarketCap = (n: number) => {
    if (!Number.isFinite(n) || n === 0) return '-';
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    return `$${n.toFixed(0)}`;
  };
  const formatVolume = (n: number) => {
    if (!Number.isFinite(n) || n === 0) return '-';
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
    return n.toLocaleString();
  };

  // ---------- Watchlist (localStorage access inside useEffect) ----------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const existing = JSON.parse(localStorage.getItem('wallstsmart_watchlist') || '[]');
      setWatchlist(Array.isArray(existing) ? existing : []);
    } catch {
      setWatchlist([]);
    }
  }, []);

  const toggleWatchlist = (symbol: string) => {
    try {
      const existing = [...watchlist];
      const updated = existing.includes(symbol) ? existing.filter((s) => s !== symbol) : [...existing, symbol];
      localStorage.setItem('wallstsmart_watchlist', JSON.stringify(updated));
      setWatchlist(updated);
    } catch (e) {
      console.error('Failed to toggle watchlist', e);
    }
  };

  const isInWatchlist = (symbol: string) => watchlist.includes(symbol);

  // ---------- Fetching & caching ----------
  const loadFromCache = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const cached = localStorage.getItem('wallstsmart_stocks');
      const timestamp = localStorage.getItem('wallstsmart_stocks_timestamp');
      if (cached && timestamp) {
        const age = Date.now() - Number(timestamp);
        const parsed = JSON.parse(cached) as any[];
        const normalized = parsed.map(normalizeStock);
        setAllStocksData(normalized);
        updateMarketStats(normalized);
        setCacheAge(age);
        return true;
      }
    } catch (e) {
      console.warn('Failed to load cache', e);
    }
    return false;
  };

  const updateMarketStats = (stocks: Stock[]) => {
    const exchanges = [...new Set(stocks.map((s) => s.exchange))].filter(Boolean);
    setMarketStats({
      totalStocks: stocks.length,
      activeStocks: stocks.filter((s) => s.status === 'Active').length,
      delistedStocks: stocks.filter((s) => s.status === 'Delisted').length,
      exchanges,
    });
  };

  const fetchAllStocksFromAPI = async (skipCache = false) => {
    setLoading(true);
    try {
      const listingResponse = await fetch(`https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${API_KEY}`);
      if (!listingResponse.ok) throw new Error('Failed to fetch listing');
      const csvText = await listingResponse.text();

      // parse CSV robustly
      const lines = csvText.split('\n');
      const parsed: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (!matches) continue;
        const values = matches.map((v) => v.replace(/^"|"$/g, '').trim());
        const stock = {
          symbol: values[0],
          name: values[1],
          exchange: values[2],
          assetType: values[3],
          ipoDate: values[4],
          delistingDate: values[5] || null,
          status: values[6] || 'Active',
        };
        if (stock.status === 'Active' && (stock.assetType === 'Stock' || stock.assetType === 'ETF')) {
          parsed.push(stock);
        }
      }

      // Only fetch quotes/overview for the first N symbols to stay within rate limits and keep UI responsive
      const firstSymbols = parsed.slice(0, 50).map((s) => s.symbol);

      // Start with normalized base objects
      let enhanced = parsed.map((p) => normalizeStock({ ...p }));

      for (const symbol of firstSymbols) {
        try {
          // GLOBAL_QUOTE
          const qRes = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`
          );
          if (qRes.ok) {
            const qJson = await qRes.json();
            const quote = qJson['Global Quote'];
            const idx = enhanced.findIndex((s) => s.symbol === symbol);
            if (idx !== -1 && quote) {
              enhanced[idx] = {
                ...enhanced[idx],
                price: Number(quote['05. price']) || enhanced[idx].price || 0,
                change: Number(quote['09. change']) || enhanced[idx].change || 0,
                changePercent: Number((quote['10. change percent'] || '').replace('%', '')) || enhanced[idx].changePercent || 0,
                volume: Number(quote['06. volume']) || enhanced[idx].volume || 0,
              };
            }
          }

          // OVERVIEW
          const ovRes = await fetch(
            `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`
          );
          if (ovRes.ok) {
            const ov = await ovRes.json();
            const idx = enhanced.findIndex((s) => s.symbol === symbol);
            if (idx !== -1 && ov) {
              enhanced[idx] = {
                ...enhanced[idx],
                industry: ov.Industry || enhanced[idx].industry || 'N/A',
                country: ov.Country || enhanced[idx].country || 'N/A',
                psRatio: Number.isFinite(Number(ov.PriceToSalesRatioTTM)) ? Number(ov.PriceToSalesRatioTTM) : enhanced[idx].psRatio,
                peRatio: Number.isFinite(Number(ov.PERatio)) ? Number(ov.PERatio) : enhanced[idx].peRatio,
                marketCap: Number.isFinite(Number(ov.MarketCapitalization)) ? Number(ov.MarketCapitalization) : enhanced[idx].marketCap,
              };
            }
          }

          // Respect rate limits
          await new Promise((r) => setTimeout(r, 800));
        } catch (inner) {
          console.warn(`Failed to fetch quote/overview for ${symbol}`, inner);
        }
      }

      // Normalize everything again to ensure numbers
      const normalized = enhanced.map(normalizeStock);

      setAllStocksData(normalized);
      updateMarketStats(normalized);

      // Cache normalized data
      try {
        localStorage.setItem('wallstsmart_stocks', JSON.stringify(normalized));
        localStorage.setItem('wallstsmart_stocks_timestamp', String(Date.now()));
        setCacheAge(null);
      } catch {
        // ignore storage failures
      }
    } catch (e) {
      console.error('fetchAllStocksFromAPI error:', e);
      if (!skipCache) loadFromCache();
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // ---------- Table helpers ----------
  const getFilteredAndSortedStocks = (): Stock[] => {
    let list = [...allStocksData];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (selectedExchange !== 'all') {
      list = list.filter((s) => s.exchange === selectedExchange);
    }

    const key = sortConfig.key as keyof Stock;
    list.sort((a: any, b: any) => {
      const aVal = a[key] ?? (typeof a === 'string' ? a : 0);
      const bVal = b[key] ?? (typeof b === 'string' ? b : 0);

      const aNum = Number(aVal);
      const bNum = Number(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // fallback string compare
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return list;
  };

  const handleSort = (key: keyof Stock | 'name' | 'symbol') => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getCurrentPageStocks = (): Stock[] => {
    const filtered = getFilteredAndSortedStocks();
    const start = (currentPage - 1) * stocksPerPage;
    return filtered.slice(start, start + stocksPerPage);
  };

  // ---------- Initial load ----------
  useEffect(() => {
    if (forceRefresh) return;
    const cached = localStorage.getItem('wallstsmart_stocks');
    const timestamp = localStorage.getItem('wallstsmart_stocks_timestamp');
    if (cached && timestamp) {
      const age = Date.now() - Number(timestamp);
      if (age < CACHE_DURATION) {
        // use cache but normalize
        loadFromCache();
        setInitialLoad(false);
        return;
      }
    }
    fetchAllStocksFromAPI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => setCurrentPage(1), [searchTerm, selectedExchange, sortConfig]);

  // Derived values
  const filtered = useMemo(() => getFilteredAndSortedStocks(), [allStocksData, searchTerm, selectedExchange, sortConfig]);
  const totalStocks = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalStocks / stocksPerPage));
  const displayedStocks = getCurrentPageStocks();

  // ---------- CSV Export ----------
  const exportToCSV = () => {
    try {
      const page = displayedStocks;
      const headers = ['Symbol', 'Company', 'Exchange', 'Industry', 'Country', 'Price', 'Change %', 'Market Cap', 'P/E', 'PS Ratio', 'Daily Volume'];
      const rows = page.map((s) => [
        s.symbol,
        `"${s.name.replace(/"/g, '""')}"`,
        s.exchange,
        s.industry ?? '',
        s.country ?? '',
        Number.isFinite(s.price) ? s.price.toFixed(2) : '',
        Number.isFinite(s.changePercent) ? s.changePercent.toFixed(2) : '',
        s.marketCap ? s.marketCap : '',
        s.peRatio ? s.peRatio.toFixed(2) : '',
        s.psRatio ? s.psRatio.toFixed(2) : '',
        s.volume ? s.volume : '',
      ]);
      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wallstsmart_screener_page_${currentPage}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export failed', e);
    }
  };

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gray-950 text-white text-xs">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Screener
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              <span className="text-green-400 font-semibold">{marketStats.totalStocks.toLocaleString()}</span> total stocks •{' '}
              <span className="text-blue-400 font-semibold ml-2">{marketStats.exchanges.length}</span> exchanges •{' '}
              <span className="text-yellow-400 font-semibold ml-2">{cacheAge ? 'Cached data' : 'Real-time data'}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setForceRefresh(true); fetchAllStocksFromAPI(true).finally(()=>setForceRefresh(false)); }} disabled={loading} className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={exportToCSV} className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-gray-900 rounded-xl p-4 mb-4 flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} placeholder="Search by symbol or company name..." className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500"/>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <select value={selectedExchange} onChange={(e)=>setSelectedExchange(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
              <option value="all">All Exchanges</option>
              <option value="NYSE">NYSE</option>
              <option value="NASDAQ">NASDAQ</option>
              <option value="AMEX">AMEX</option>
              <option value="TSX">TSX</option>
              <option value="LSE">LSE</option>
              <option value="XETRA">XETRA</option>
              <option value="EURONEXT">EURONEXT</option>
              <option value="TSE">TSE</option>
              <option value="HKEX">HKEX</option>
            </select>
          </div>
          <div className="ml-auto text-sm text-gray-400">
            {totalStocks > 0 && <>Showing {(currentPage-1)*stocksPerPage + 1} - {Math.min(currentPage*stocksPerPage, totalStocks)} of {totalStocks.toLocaleString()} stocks</>}
          </div>
        </div>

        {/* Table */}
        {initialLoad && loading ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <RefreshCw className="w-12 h-12 text-green-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">Loading Complete Market Data...</h3>
            <p className="text-gray-500">Fetching all stocks (first page only for fast initial load)</p>
          </div>
        ) : displayedStocks.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
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
                      <th className="px-4 py-3 text-left sticky left-0 bg-gray-850 z-10">
                        <button onClick={()=>handleSort('symbol')} className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1">Symbol <ArrowUpDown className="w-3 h-3" /></button>
                      </th>
                      <th className="px-4 py-3 min-w-[200px]">
                        <button onClick={()=>handleSort('name')} className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1">Company <ArrowUpDown className="w-3 h-3" /></button>
                      </th>
                      <th className="px-4 py-3"><button onClick={()=>handleSort('exchange')} className="text-xs font-medium text-gray-400 uppercase">Exchange</button></th>
                      <th className="px-4 py-3"><button onClick={()=>handleSort('industry')} className="text-xs font-medium text-gray-400 uppercase">Industry</button></th>
                      <th className="px-4 py-3"><button onClick={()=>handleSort('country')} className="text-xs font-medium text-gray-400 uppercase">Country</button></th>
                      <th className="px-4 py-3 text-right"><button onClick={()=>handleSort('price')} className="text-xs font-medium text-gray-400 uppercase">Price</button></th>
                      <th className="px-4 py-3 text-right"><button onClick={()=>handleSort('changePercent')} className="text-xs font-medium text-gray-400 uppercase">Change %</button></th>
                      <th className="px-4 py-3 text-right"><button onClick={()=>handleSort('marketCap')} className="text-xs font-medium text-gray-400 uppercase">Market Cap</button></th>
                      <th className="px-4 py-3 text-right"><button onClick={()=>handleSort('peRatio')} className="text-xs font-medium text-gray-400 uppercase">P/E</button></th>
                      <th className="px-4 py-3 text-right"><button onClick={()=>handleSort('psRatio')} className="text-xs font-medium text-gray-400 uppercase">PS Ratio</button></th>
                      <th className="px-4 py-3 text-right"><button onClick={()=>handleSort('volume')} className="text-xs font-medium text-gray-400 uppercase">Daily Volume</button></th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedStocks.map((stock, idx) => (
                      <tr key={`${stock.symbol}-${idx}`} className={`border-b border-gray-800 ${idx%2===0 ? 'bg-gray-900' : 'bg-gray-900/50'}`}>
                        <td className="sticky left-0 z-10 px-4 py-3 bg-inherit">
                          <button onClick={()=>navigate(`/stock/${stock.symbol}`)} className="font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1">
                            {stock.symbol} <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate" title={stock.name}>{stock.name}</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-800 rounded text-xs font-medium text-gray-300">{stock.exchange}</span></td>
                        <td className="px-4 py-3">{stock.industry ?? '-'}</td>
                        <td className="px-4 py-3">{stock.country ?? '-'}</td>
                        <td className="px-4 py-3 text-right font-medium">{Number.isFinite(stock.price) ? `$${stock.price.toFixed(2)}` : '-'}</td>
                        <td className={`px-4 py-3 text-right font-medium ${Number(stock.changePercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{Number.isFinite(stock.changePercent) ? (stock.changePercent >= 0 ? '+' : '') + stock.changePercent.toFixed(2) + '%' : '-'}</td>
                        <td className="px-4 py-3 text-right">{formatMarketCap(stock.marketCap)}</td>
                        <td className="px-4 py-3 text-right">{stock.peRatio ? stock.peRatio.toFixed(2) : '-'}</td>
                        <td className="px-4 py-3 text-right">{stock.psRatio ? stock.psRatio.toFixed(2) : '-'}</td>
                        <td className="px-4 py-3 text-right">{formatVolume(stock.volume)}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={()=>toggleWatchlist(stock.symbol)} title="Toggle watchlist" className="p-1.5 hover:bg-gray-800 rounded-lg">
                            <Star className={`w-4 h-4 ${isInWatchlist(stock.symbol) ? 'text-yellow-400' : 'text-gray-400'}`} />
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
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <button disabled={currentPage===1} onClick={()=>setCurrentPage(p => Math.max(1, p-1))} className="px-3 py-2 bg-gray-800 rounded-lg">
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({length: Math.min(totalPages, 7)}, (_,i)=> {
                        const page = Math.min(totalPages, i+1);
                        return (
                          <button key={page} onClick={()=>setCurrentPage(page)} className={`px-3 py-2 rounded-lg ${currentPage===page ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}>{page}</button>
                        );
                      })}
                    </div>
                    <button disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p => Math.min(totalPages, p+1))} className="px-3 py-2 bg-gray-800 rounded-lg">
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-400">Jump to page:</span>
                    <input type="number" min={1} max={totalPages} value={currentPage} onChange={(e)=> {
                      const v = Number(e.target.value);
                      if (v>=1 && v<=totalPages) setCurrentPage(v);
                    }} className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-center text-white"/>
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
