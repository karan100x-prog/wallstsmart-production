import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Download, TrendingUp, Star, Search, ArrowUpDown, Filter } from 'lucide-react';

// Updated Screener Component - All Stocks with Pagination
export default function AllStocksScreener() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStocks, setTotalStocks] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'marketCap', direction: 'desc' });
  const [refreshing, setRefreshing] = useState(false);
  
  const stocksPerPage = 100;
  const API_KEY = 'NMSRS0ZDIOWF3CLL';

  // Mock data for demonstration - Replace with actual Alpha Vantage API calls
  const generateMockStocks = () => {
    const sectors = ['Technology', 'Healthcare', 'Finance', 'Consumer', 'Energy', 'Industrial'];
    const mockStocks = [];
    
    // Generate 500 mock stocks for demonstration
    for (let i = 1; i <= 500; i++) {
      mockStocks.push({
        symbol: `STK${String(i).padStart(3, '0')}`,
        name: `Company ${i} Inc.`,
        price: (Math.random() * 500 + 10).toFixed(2),
        change: (Math.random() * 10 - 5).toFixed(2),
        changePercent: (Math.random() * 10 - 5).toFixed(2),
        marketCap: Math.floor(Math.random() * 500000000000 + 1000000000),
        peRatio: (Math.random() * 50 + 5).toFixed(1),
        dividendYield: (Math.random() * 5).toFixed(2),
        roe: (Math.random() * 30 + 5).toFixed(1),
        volume: Math.floor(Math.random() * 50000000 + 1000000),
        sector: sectors[Math.floor(Math.random() * sectors.length)],
        fiftyTwoWeekHigh: (Math.random() * 600 + 20).toFixed(2),
        fiftyTwoWeekLow: (Math.random() * 300 + 5).toFixed(2),
        beta: (Math.random() * 2 + 0.5).toFixed(2),
        eps: (Math.random() * 20 + 1).toFixed(2)
      });
    }
    return mockStocks;
  };

  // Fetch all stocks
  const fetchAllStocks = async () => {
    setLoading(true);
    try {
      // In production, you would use LISTING_STATUS endpoint
      // const response = await fetch(`https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${API_KEY}`);
      
      // For now, using mock data
      const allStocksData = generateMockStocks();
      setTotalStocks(allStocksData.length);
      
      // Get current page stocks
      const startIndex = (currentPage - 1) * stocksPerPage;
      const endIndex = startIndex + stocksPerPage;
      const pageStocks = allStocksData.slice(startIndex, endIndex);
      
      setStocks(pageStocks);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format large numbers
  const formatNumber = (num, format) => {
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

  // Sort stocks
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    
    const sortedStocks = [...stocks].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      
      // Handle numeric values
      if (!isNaN(aVal) && !isNaN(bVal)) {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }
      
      if (direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    setStocks(sortedStocks);
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllStocks();
    setRefreshing(false);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Symbol', 'Company', 'Price', 'Change %', 'Market Cap', 'P/E', 'Div Yield', 'ROE', 'Volume'];
    const csvData = stocks.map(stock => [
      stock.symbol,
      stock.name,
      stock.price,
      stock.changePercent,
      stock.marketCap,
      stock.peRatio,
      stock.dividendYield,
      stock.roe,
      stock.volume
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallstsmart_stocks_page_${currentPage}.csv`;
    a.click();
  };

  // Pagination controls
  const totalPages = Math.ceil(totalStocks / stocksPerPage);
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Generate page numbers to show
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

  useEffect(() => {
    fetchAllStocks();
  }, [currentPage]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                All Stocks
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Complete market overview • {totalStocks.toLocaleString()} stocks available
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
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
        {/* Search and Info Bar */}
        <div className="bg-gray-900 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search stocks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm 
                           text-white placeholder-gray-500 w-64
                           focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
              <div className="text-sm text-gray-400">
                Showing {((currentPage - 1) * stocksPerPage) + 1} - {Math.min(currentPage * stocksPerPage, totalStocks)} of {totalStocks.toLocaleString()} stocks
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Page {currentPage} of {totalPages}</span>
            </div>
          </div>
        </div>

        {/* Main Table */}
        {loading ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <RefreshCw className="w-12 h-12 text-green-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">Loading Stocks...</h3>
            <p className="text-gray-500">Fetching market data</p>
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
                      <th className="text-left px-4 py-3">
                        <button
                          onClick={() => handleSort('name')}
                          className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1"
                        >
                          Company
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
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
                          onClick={() => handleSort('peRatio')}
                          className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto"
                        >
                          P/E
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-right px-4 py-3">
                        <button
                          onClick={() => handleSort('dividendYield')}
                          className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto"
                        >
                          Div Yield
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-right px-4 py-3">
                        <button
                          onClick={() => handleSort('roe')}
                          className="text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-white flex items-center gap-1 ml-auto"
                        >
                          ROE
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks
                      .filter(stock => 
                        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        stock.name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((stock, index) => (
                      <tr 
                        key={stock.symbol} 
                        className={`border-b border-gray-800 hover:bg-gray-850 transition-colors ${
                          index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-925'
                        }`}
                      >
                        <td className="sticky left-0 z-10 px-4 py-3 font-medium text-blue-400 bg-inherit">
                          {stock.symbol}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">{stock.name}</td>
                        <td className="px-4 py-3 text-right font-medium">${stock.price}</td>
                        <td className={`px-4 py-3 text-right font-medium ${
                          parseFloat(stock.changePercent) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {parseFloat(stock.changePercent) >= 0 ? '+' : ''}{stock.changePercent}%
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {formatNumber(stock.marketCap, 'marketCap')}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">{stock.peRatio}</td>
                        <td className="px-4 py-3 text-right text-sm">{stock.dividendYield}%</td>
                        <td className="px-4 py-3 text-right text-sm">{stock.roe}%</td>
                        <td className="px-4 py-3 text-center">
                          <button className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors">
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
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
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
                          onClick={() => handlePageChange(page)}
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
                    onClick={() => handlePageChange(currentPage + 1)}
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
                        handlePageChange(page);
                      }
                    }}
                    className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-center text-white
                             focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                  <span className="text-gray-400">of {totalPages}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
