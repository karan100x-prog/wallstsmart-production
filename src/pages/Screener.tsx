import React, { useState, useEffect, useMemo } from 'react';
import { screenerService } from '../services/screenerService';
import { ChevronDown, ChevronUp, Filter, Download, Save, TrendingUp, DollarSign, Activity, Shield, Users, Zap, Search, X, Info, Star, RefreshCw } from 'lucide-react';

// Screener Component
export default function StockScreener() {
  const [activeFilters, setActiveFilters] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [savedScreens, setSavedScreens] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // table or cards

  // Filter Categories and Structure
  const filterCategories = {
    fundamentals: {
      name: 'Fundamentals',
      icon: <DollarSign className="w-4 h-4" />,
      color: 'blue',
      filters: {
        marketCap: {
          name: 'Market Cap',
          type: 'range',
          min: 0,
          max: 3000000000000,
          options: [
            { label: 'Nano (<$50M)', min: 0, max: 50000000 },
            { label: 'Micro ($50M-$300M)', min: 50000000, max: 300000000 },
            { label: 'Small ($300M-$2B)', min: 300000000, max: 2000000000 },
            { label: 'Mid ($2B-$10B)', min: 2000000000, max: 10000000000 },
            { label: 'Large ($10B-$200B)', min: 10000000000, max: 200000000000 },
            { label: 'Mega (>$200B)', min: 200000000000, max: null }
          ]
        },
        peRatio: {
          name: 'P/E Ratio',
          type: 'range',
          min: 0,
          max: 100,
          step: 0.1
        },
        pegRatio: {
          name: 'PEG Ratio',
          type: 'range',
          min: 0,
          max: 5,
          step: 0.1
        },
        priceToBook: {
          name: 'Price to Book',
          type: 'range',
          min: 0,
          max: 20,
          step: 0.1
        },
        dividendYield: {
          name: 'Dividend Yield %',
          type: 'range',
          min: 0,
          max: 15,
          step: 0.1,
          suffix: '%'
        },
        revenue: {
          name: 'Revenue (TTM)',
          type: 'range',
          min: 0,
          max: 1000000000000,
          format: 'currency'
        }
      }
    },
    growth: {
      name: 'Growth Metrics',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'green',
      filters: {
        revenueGrowth: {
          name: 'Revenue Growth (YoY)',
          type: 'range',
          min: -50,
          max: 200,
          step: 1,
          suffix: '%'
        },
        earningsGrowth: {
          name: 'Earnings Growth (YoY)',
          type: 'range',
          min: -50,
          max: 200,
          step: 1,
          suffix: '%'
        },
        revenueGrowth5Y: {
          name: '5Y Revenue CAGR',
          type: 'range',
          min: -20,
          max: 100,
          step: 1,
          suffix: '%'
        }
      }
    },
    profitability: {
      name: 'Profitability',
      icon: <Activity className="w-4 h-4" />,
      color: 'purple',
      filters: {
        grossMargin: {
          name: 'Gross Margin %',
          type: 'range',
          min: 0,
          max: 100,
          step: 1,
          suffix: '%'
        },
        operatingMargin: {
          name: 'Operating Margin %',
          type: 'range',
          min: -50,
          max: 50,
          step: 1,
          suffix: '%'
        },
        netMargin: {
          name: 'Net Profit Margin %',
          type: 'range',
          min: -50,
          max: 50,
          step: 1,
          suffix: '%'
        },
        roe: {
          name: 'ROE %',
          type: 'range',
          min: -50,
          max: 100,
          step: 1,
          suffix: '%'
        },
        roa: {
          name: 'ROA %',
          type: 'range',
          min: -20,
          max: 50,
          step: 1,
          suffix: '%'
        }
      }
    },
    financial_health: {
      name: 'Financial Health',
      icon: <Shield className="w-4 h-4" />,
      color: 'amber',
      filters: {
        debtToEquity: {
          name: 'Debt to Equity',
          type: 'range',
          min: 0,
          max: 5,
          step: 0.1
        },
        currentRatio: {
          name: 'Current Ratio',
          type: 'range',
          min: 0,
          max: 10,
          step: 0.1
        },
        quickRatio: {
          name: 'Quick Ratio',
          type: 'range',
          min: 0,
          max: 10,
          step: 0.1
        },
        freeCashFlow: {
          name: 'Free Cash Flow',
          type: 'range',
          min: -1000000000,
          max: 100000000000,
          format: 'currency'
        }
      }
    },
    technical: {
      name: 'Technical',
      icon: <Zap className="w-4 h-4" />,
      color: 'red',
      filters: {
        price52WeekHigh: {
          name: '% Below 52W High',
          type: 'range',
          min: 0,
          max: 100,
          step: 1,
          suffix: '%'
        },
        aboveMA50: {
          name: 'Price vs 50-Day MA',
          type: 'select',
          options: [
            { value: 'above', label: 'Above 50-Day MA' },
            { value: 'below', label: 'Below 50-Day MA' }
          ]
        },
        rsi: {
          name: 'RSI (14)',
          type: 'range',
          min: 0,
          max: 100,
          step: 1
        },
        volume: {
          name: 'Volume vs Avg',
          type: 'range',
          min: 0,
          max: 500,
          step: 10,
          suffix: '%'
        },
        beta: {
          name: 'Beta',
          type: 'range',
          min: -2,
          max: 5,
          step: 0.1
        }
      }
    },
    ownership: {
      name: 'Ownership',
      icon: <Users className="w-4 h-4" />,
      color: 'indigo',
      filters: {
        institutionalOwnership: {
          name: 'Institutional %',
          type: 'range',
          min: 0,
          max: 100,
          step: 1,
          suffix: '%'
        },
        insiderOwnership: {
          name: 'Insider %',
          type: 'range',
          min: 0,
          max: 100,
          step: 1,
          suffix: '%'
        },
        shortInterest: {
          name: 'Short Interest %',
          type: 'range',
          min: 0,
          max: 50,
          step: 1,
          suffix: '%'
        }
      }
    }
  };

  // Preset Screens
  const presetScreens = [
    {
      id: 'buffett',
      name: 'Warren Buffett Style',
      icon: '🎩',
      description: 'High quality, profitable companies with moats',
      filters: {
        roe: { min: 15, max: 100 },
        debtToEquity: { min: 0, max: 0.5 },
        netMargin: { min: 10, max: 50 },
        peRatio: { min: 5, max: 25 }
      }
    },
    {
      id: 'growth',
      name: 'Growth at Reasonable Price',
      icon: '🚀',
      description: 'Fast growers at fair valuations',
      filters: {
        revenueGrowth: { min: 15, max: 200 },
        pegRatio: { min: 0, max: 1.5 },
        grossMargin: { min: 40, max: 100 }
      }
    },
    {
      id: 'dividend',
      name: 'Dividend Aristocrats+',
      icon: '💎',
      description: 'Reliable dividend payers with growth',
      filters: {
        dividendYield: { min: 2.5, max: 8 },
        peRatio: { min: 10, max: 25 },
        debtToEquity: { min: 0, max: 1 }
      }
    },
    {
      id: 'momentum',
      name: 'Momentum Leaders',
      icon: '⚡',
      description: 'Breaking out with strong volume',
      filters: {
        price52WeekHigh: { min: 0, max: 10 },
        volume: { min: 150, max: 500 },
        rsi: { min: 50, max: 70 }
      }
    },
    {
      id: 'value',
      name: 'Deep Value Opportunities',
      icon: '🔍',
      description: 'Undervalued with improving fundamentals',
      filters: {
        priceToBook: { min: 0, max: 1 },
        peRatio: { min: 0, max: 15 },
        freeCashFlow: { min: 0, max: 100000000000 }
      }
    }
  ];

  // Mock results data
  const mockResults = [
    { symbol: 'AAPL', name: 'Apple Inc.', marketCap: 3200000000000, peRatio: 32.5, dividendYield: 0.43, roe: 147, revenueGrowth: 8.1, price: 226.79, change: -1.23, changePercent: -0.54 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', marketCap: 3100000000000, peRatio: 35.8, dividendYield: 0.72, roe: 47, revenueGrowth: 15.7, price: 500.37, change: 1.96, changePercent: 0.39 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', marketCap: 2100000000000, peRatio: 27.3, dividendYield: 0, roe: 29, revenueGrowth: 13.5, price: 239.17, change: -0.46, changePercent: -0.19 },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway', marketCap: 980000000000, peRatio: 9.2, dividendYield: 0, roe: 21, revenueGrowth: 5.2, price: 467.23, change: 2.15, changePercent: 0.46 },
    { symbol: 'JNJ', name: 'Johnson & Johnson', marketCap: 385000000000, peRatio: 15.3, dividendYield: 3.01, roe: 43, revenueGrowth: 2.3, price: 158.42, change: -0.83, changePercent: -0.52 }
  ];

  // Toggle category expansion
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Apply preset
  const applyPreset = (preset) => {
    setSelectedPreset(preset.id);
    setActiveFilters(preset.filters);
    // Expand relevant categories
    const categories = new Set();
    Object.keys(preset.filters).forEach(filter => {
      Object.entries(filterCategories).forEach(([catKey, catValue]) => {
        if (catValue.filters[filter]) {
          categories.add(catKey);
        }
      });
    });
    const newExpanded = {};
    categories.forEach(cat => {
      newExpanded[cat] = true;
    });
    setExpandedCategories(newExpanded);
  };

  // Handle filter change
  const handleFilterChange = (filterKey, value) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (value === null || (value.min === undefined && value.max === undefined)) {
        delete newFilters[filterKey];
      } else {
        newFilters[filterKey] = value;
      }
      return newFilters;
    });
    setSelectedPreset(null); // Clear preset when manually changing filters
  };

  // Format large numbers
  const formatNumber = (num, format) => {
    if (format === 'currency') {
      if (num >= 1000000000000) return `$${(num / 1000000000000).toFixed(2)}T`;
      if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
      if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
      return `$${num.toFixed(0)}`;
    }
    return num.toLocaleString();
  };

  // Run screen
const runScreen = async () => {
  setLoading(true);
  try {
    const filteredStocks = await screenerService.runScreen(activeFilters);
    setResults(filteredStocks);
  } catch (error) {
    console.error('Screening error:', error);
    // You can add a toast notification here
  } finally {
    setLoading(false);
  }
};

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters({});
    setSelectedPreset(null);
    setResults([]);
  };

  // Count active filters
  const activeFilterCount = Object.keys(activeFilters).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                Stock Screener
              </h1>
              <p className="text-gray-400 text-sm mt-1">Find your next investment opportunity</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Screen
              </button>
              <button className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-1 space-y-4">
            {/* Preset Screens */}
            <div className="bg-gray-900 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Preset Screens
              </h3>
              <div className="space-y-2">
                {presetScreens.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedPreset === preset.id
                        ? 'bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30'
                        : 'bg-gray-800 hover:bg-gray-750 border border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{preset.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{preset.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{preset.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Categories */}
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Filters {activeFilterCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                      {activeFilterCount}
                    </span>
                  )}
                </h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {Object.entries(filterCategories).map(([catKey, category]) => (
                  <div key={catKey} className="border border-gray-800 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleCategory(catKey)}
                      className="w-full px-3 py-2 bg-gray-800/50 hover:bg-gray-800 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`text-${category.color}-400`}>
                          {category.icon}
                        </div>
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      {expandedCategories[catKey] ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {expandedCategories[catKey] && (
                      <div className="p-3 space-y-3 bg-gray-850">
                        {Object.entries(category.filters).map(([filterKey, filter]) => (
                          <div key={filterKey}>
                            <label className="text-xs text-gray-400 mb-1 block">
                              {filter.name}
                            </label>
                            {filter.type === 'range' && (
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  placeholder="Min"
                                  className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-green-500 focus:outline-none"
                                  value={activeFilters[filterKey]?.min || ''}
                                  onChange={(e) => handleFilterChange(filterKey, {
                                    ...activeFilters[filterKey],
                                    min: e.target.value ? Number(e.target.value) : undefined
                                  })}
                                />
                                <input
                                  type="number"
                                  placeholder="Max"
                                  className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-green-500 focus:outline-none"
                                  value={activeFilters[filterKey]?.max || ''}
                                  onChange={(e) => handleFilterChange(filterKey, {
                                    ...activeFilters[filterKey],
                                    max: e.target.value ? Number(e.target.value) : undefined
                                  })}
                                />
                              </div>
                            )}
                            {filter.type === 'select' && (
                              <select
                                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-green-500 focus:outline-none"
                                value={activeFilters[filterKey] || ''}
                                onChange={(e) => handleFilterChange(filterKey, e.target.value || null)}
                              >
                                <option value="">All</option>
                                {filter.options.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Run Screen Button */}
              <button
                onClick={runScreen}
                disabled={loading}
                className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg font-semibold hover:from-green-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Screening...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Run Screen
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main Content - Results */}
          <div className="lg:col-span-3">
            {/* Results Header */}
            <div className="bg-gray-900 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {results.length > 0 ? `${results.length} Stocks Found` : 'No Results Yet'}
                  </h2>
                  {activeFilterCount > 0 && (
                    <p className="text-sm text-gray-400 mt-1">
                      {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      viewMode === 'table' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      viewMode === 'cards' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Cards
                  </button>
                </div>
              </div>
            </div>

            {/* Results Display */}
            {results.length === 0 ? (
              <div className="bg-gray-900 rounded-xl p-12 text-center">
                <Filter className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">Start Your Search</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Select filters or choose a preset screen, then click "Run Screen" to find stocks matching your criteria.
                </p>
              </div>
            ) : viewMode === 'table' ? (
              <div className="bg-gray-900 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Symbol</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Company</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Change</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Market Cap</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">P/E</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Div Yield</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">ROE</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((stock, index) => (
                        <tr key={stock.symbol} className={`border-b border-gray-800 hover:bg-gray-850 transition-colors ${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-925'}`}>
                          <td className="px-4 py-3 font-medium text-blue-400">{stock.symbol}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{stock.name}</td>
                          <td className="px-4 py-3 text-right font-medium">${stock.price.toFixed(2)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right text-sm">{formatNumber(stock.marketCap, 'currency')}</td>
                          <td className="px-4 py-3 text-right text-sm">{stock.peRatio.toFixed(1)}</td>
                          <td className="px-4 py-3 text-right text-sm">{stock.dividendYield.toFixed(2)}%</td>
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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map(stock => (
                  <div key={stock.symbol} className="bg-gray-900 rounded-xl p-4 hover:bg-gray-850 transition-colors border border-gray-800">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-blue-400">{stock.symbol}</h3>
                        <p className="text-sm text-gray-400">{stock.name}</p>
                      </div>
                      <button className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors">
                        <Star className="w-4 h-4 text-gray-400 hover:text-yellow-400" />
                      </button>
                    </div>
                    <div className="flex items-baseline gap-3 mb-4">
                      <span className="text-2xl font-bold">${stock.price.toFixed(2)}</span>
                      <span className={`text-sm font-medium ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Market Cap</span>
                        <p className="font-medium">{formatNumber(stock.marketCap, 'currency')}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">P/E Ratio</span>
                        <p className="font-medium">{stock.peRatio.toFixed(1)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Div Yield</span>
                        <p className="font-medium">{stock.dividendYield.toFixed(2)}%</p>
                      </div>
                      <div>
                        <span className="text-gray-500">ROE</span>
                        <p className="font-medium">{stock.roe}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
