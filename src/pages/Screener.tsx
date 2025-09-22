import React, { useState, useEffect } from 'react';
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

// Complete Market Screener with Real Alpha Vantage Integration
export default function CompleteMarketScreener() {
  const navigate = useNavigate();
  const [allStocksData, setAllStocksData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'marketCap', direction: 'desc' });
  const [selectedExchange, setSelectedExchange] = useState('all');
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [marketStats, setMarketStats] = useState({
    totalStocks: 0,
    activeStocks: 0,
    delistedStocks: 0,
    exchanges: [],
  });

  const stocksPerPage = 100;
  const API_KEY = 'NMSRS0ZDIOWF3CLL';
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

  // -------- Watchlist Helpers ----------
  const isInWatchlist = (symbol: string) => {
    const existing = JSON.parse(localStorage.getItem('wallstsmart_watchlist') || '[]');
    return existing.includes(symbol);
  };

  const toggleWatchlist = (symbol: string) => {
    const existing = JSON.parse(localStorage.getItem('wallstsmart_watchlist') || '[]');
    const updated = existing.includes(symbol)
      ? existing.filter((s: string) => s !== symbol)
      : [...existing, symbol];
    localStorage.setItem('wallstsmart_watchlist', JSON.stringify(updated));
    setAllStocksData([...allStocksData]); // trigger re-render
  };

  // -------- API Fetch --------
  const fetchAllStocksFromAPI = async (skipCache = false) => {
    setLoading(true);
    try {
      console.log('Fetching fresh data from Alpha Vantage API...');

      const listingResponse = await fetch(
        `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${API_KEY}`
      );

      if (!listingResponse.ok) throw new Error('Failed to fetch listing data');

      const csvText = await listingResponse.text();
      const stocks = parseCSVToStocks(csvText);

      const enhancedStocks = await enhanceStocksWithQuotes(stocks);

      setAllStocksData(enhancedStocks);
      updateMarketStats(enhancedStocks);

      localStorage.setItem('wallstsmart_stocks', JSON.stringify(enhancedStocks));
      localStorage.setItem('wallstsmart_stocks_timestamp', Date.now().toString());

      setCacheAge(null);
      console.log('Fresh data fetched and cached successfully');
    } catch (error) {
      console.error('Error fetching stocks:', error);
      if (!skipCache) loadFromCache();
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const parseCSVToStocks = (csvText: string) => {
    const lines = csvText.split('\n');
    const stocks: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const matches = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (matches && matches.length >= 7) {
          const values = matches.map((val) => val.replace(/^"|"$/g, '').trim());
          const stock = {
            symbol: values[0],
            name: values[1],
            exchange: values[2],
            assetType: values[3],
            ipoDate: values[4],
            delistingDate: values[5] || null,
            status: values[6] || 'Active',
            price: 0,
            change: 0,
            changePercent: 0,
            marketCap: 0,
            peRatio: 0,
            volume: 0,
            industry: '',
            country: '',
            psRatio: 0,
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

  const enhanceStocksWithQuotes = async (stocks: any[]) => {
    const enhancedStocks = [...stocks];
    const firstPageSymbols = stocks.slice(0, 50).map((s) => s.symbol);

    for (const symbol of firstPageSymbols) {
      try {
        // GLOBAL_QUOTE
        const quoteRes = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
        );
        if (quoteRes.ok) {
          const data = await quoteRes.json();
          const quote = data['Global Quote'];
          const idx = enhancedStocks.findIndex((s) => s.symbol === symbol);
          if (quote && idx !== -1) {
            enhancedStocks[idx] = {
              ...enhancedStocks[idx],
              price: parseFloat(quote['05. price']) || 0,
              change: parseFloat(quote['09. change']) || 0,
              changePercent: parseFloat(quote['10. change percent']?.replace('%', '')) || 0,
              volume: parseInt(quote['06. volume']) || 0,
            };
          }
        }

        // OVERVIEW
        const overviewRes = await fetch(
          `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`
        );
        if (overviewRes.ok) {
          const ov = await overviewRes.json();
          const idx = enhancedStocks.findIndex((s) => s.symbol === symbol);
          if (ov && idx !== -1) {
            enhancedStocks[idx] = {
              ...enhancedStocks[idx],
              industry: ov.Industry || 'N/A',
              country: ov.Country || 'N/A',
              psRatio: parseFloat(ov.PriceToSalesRatioTTM) || 0,
              peRatio: parseFloat(ov.PERatio) || 0,
              marketCap: parseFloat(ov.MarketCapitalization) || 0,
            };
          }
        }

        await new Promise((r) => setTimeout(r, 800)); // rate limit
      } catch (e) {
        console.error(`Error fetching data for ${symbol}`, e);
      }
    }
    return enhancedStocks;
  };

  const loadFromCache = () => {
    const cached = localStorage.getItem('wallstsmart_stocks');
    const timestamp = localStorage.getItem('wallstsmart_stocks_timestamp');
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      const stocks = JSON.parse(cached);
      setAllStocksData(stocks);
      updateMarketStats(stocks);
      setCacheAge(age);
      return true;
    }
    return false;
  };

  const updateMarketStats = (stocks: any[]) => {
    const exchanges = [...new Set(stocks.map((s) => s.exchange))].filter(Boolean);
    setMarketStats({
      totalStocks: stocks.length,
      activeStocks: stocks.filter((s) => s.status === 'Active').length,
      delistedStocks: stocks.filter((s) => s.status === 'Delisted').length,
      exchanges: exchanges,
    });
  };

  const formatNumber = (num: number, format?: string) => {
    if (!num) return '-';
    if (format === 'marketCap') {
      if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
      if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
      return `$${num.toFixed(0)}`;
    }
    if (format === 'volume') {
      if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
      if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
      return num.toLocaleString();
    }
    return num.toLocaleString();
  };

  const getFilteredAndSortedStocks = () => {
    let filtered = [...allStocksData];
    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedExchange !== 'all') {
      filtered = filtered.filter((s) => s.exchange === selectedExchange);
    }
    filtered.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (!isNaN(aVal) && !isNaN(bVal)) {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }
      return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });
    return filtered;
  };

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getCurrentPageStocks = () => {
    const filtered = getFilteredAndSortedStocks();
    return filtered.slice((currentPage - 1) * stocksPerPage, currentPage * stocksPerPage);
  };

  useEffect(() => {
    if (forceRefresh) return;
    const cached = localStorage.getItem('wallstsmart_stocks');
    const timestamp = localStorage.getItem('wallstsmart_stocks_timestamp');
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < CACHE_DURATION) {
        loadFromCache();
        setInitialLoad(false);
        return;
      }
    }
    fetchAllStocksFromAPI();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedExchange, sortConfig]);

  const displayedStocks = getCurrentPageStocks();

  return (
    <div className="min-h-screen bg-gray-950 text-white text-xs">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            Screener
          </h1>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Main Table */}
        <div className="bg-gray-900 rounded-xl overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-850">
                  <th>Symbol</th>
                  <th>Company</th>
                  <th>Exchange</th>
                  <th>Industry</th>
                  <th>Country</th>
                  <th>Price</th>
                  <th>Change %</th>
                  <th>Market Cap</th>
                  <th>P/E</th>
                  <th>PS Ratio</th>
                  <th>Daily Volume</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedStocks.map((stock, i) => (
                  <tr key={`${stock.symbol}-${i}`} className="border-b border-gray-800">
                    <td>
                      <button
                        onClick={() => navigate(`/stock/${stock.symbol}`)}
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {stock.symbol}
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                    <td>{stock.name}</td>
                    <td>{stock.exchange}</td>
                    <td>{stock.industry || '-'}</td>
                    <td>{stock.country || '-'}</td>
                    <td>${stock.price ? stock.price.toFixed(2) : '-'}</td>
                    <td className={stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {stock.changePercent ? stock.changePercent.toFixed(2) + '%' : '-'}
                    </td>
                    <td>{formatNumber(stock.marketCap, 'marketCap')}</td>
                    <td>{stock.peRatio ? stock.peRatio.toFixed(2) : '-'}</td>
                    <td>{stock.psRatio ? stock.psRatio.toFixed(2) : '-'}</td>
                    <td>{formatNumber(stock.volume, 'volume')}</td>
                    <td>
                      <button onClick={() => toggleWatchlist(stock.symbol)}>
                        <Star
                          className={`w-4 h-4 ${
                            isInWatchlist(stock.symbol) ? 'text-yellow-400' : 'text-gray-400'
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
      </div>
    </div>
  );
}
