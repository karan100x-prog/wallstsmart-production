import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { 
  Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, Star, Search, AlertCircle,
  Target, PieChart, BarChart3, Calendar, DollarSign, Award, Info, X
} from 'lucide-react';
import axios from 'axios';

// Sector definitions for categorization
const SECTORS = {
  'Technology': ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'AVGO', 'ORCL', 'ADBE', 'CRM', 'INTC'],
  'Healthcare': ['JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'MRK', 'ABT', 'CVS', 'DHR', 'AMGN'],
  'Finance': ['BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'AXP', 'SCHW'],
  'Consumer Discretionary': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'TGT', 'LOW', 'BKNG'],
  'Consumer Staples': ['WMT', 'PG', 'KO', 'PEP', 'COST', 'MDLZ', 'MO', 'CL', 'GIS'],
  'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PXD', 'VLO', 'PSX'],
  'Industrials': ['UPS', 'RTX', 'BA', 'HON', 'UNP', 'LMT', 'CAT', 'GE', 'MMM'],
  'Materials': ['LIN', 'APD', 'SHW', 'FCX', 'ECL', 'NEM', 'DD', 'DOW'],
  'Real Estate': ['AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'SPG', 'O', 'WELL'],
  'Utilities': ['NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL'],
  'Communication': ['GOOGL', 'META', 'DIS', 'CMCSA', 'VZ', 'T', 'NFLX', 'TMUS']
};

// Helper function to determine sector
const getSector = (symbol) => {
  for (const [sector, symbols] of Object.entries(SECTORS)) {
    if (symbols.includes(symbol.toUpperCase())) {
      return sector;
    }
  }
  return 'Other';
};

// Footer Component
const Footer = () => (
  <footer className="bg-gray-900 border-t border-gray-800 mt-20">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-center items-center gap-6">
        <div className="flex gap-8">
          <a href="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</a>
          <a href="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</a>
          <a href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
            Follow us on 𝕏
          </a>
        </div>
      </div>
      <div className="text-center mt-6">
        <p className="text-gray-400">© 2025 WallStSmart. Professional financial analysis.</p>
        <p className="text-gray-500 text-sm mt-2">Real-time market data • Professional-grade analytics</p>
      </div>
    </div>
  </footer>
);

export default function Portfolio() {
  const { currentUser } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [goals, setGoals] = useState({
    oneYear: 0,
    threeYear: 0,
    fiveYear: 0
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [newHolding, setNewHolding] = useState({
    symbol: '',
    quantity: '',
    avgPrice: '',
    sector: ''
  });
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [liveQuotes, setLiveQuotes] = useState({});
  const [activeTab, setActiveTab] = useState('portfolio');
  const [activeView, setActiveView] = useState('holdings'); // 'holdings', 'goals', 'sectors'
  
  // Validation states
  const [symbolValidation, setSymbolValidation] = useState({
    isValidating: false,
    isValid: false,
    error: '',
    companyName: '',
    currentPrice: null
  });
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const ALPHA_VANTAGE_KEY = 'NMSRS0ZDIOWF3CLL';

  useEffect(() => {
    if (currentUser) {
      fetchHoldings();
      fetchWatchlist();
      fetchGoals();
    }
  }, [currentUser]);

  useEffect(() => {
    if (holdings.length > 0 && activeTab === 'portfolio') {
      fetchLivePrices();
      const interval = setInterval(fetchLivePrices, 60000);
      return () => clearInterval(interval);
    }
  }, [holdings, activeTab]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (newHolding.symbol.length >= 2) {
        searchSymbol(newHolding.symbol);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [newHolding.symbol]);

  // Fetch user's financial goals
  const fetchGoals = async () => {
    try {
      const docRef = doc(db, 'goals', currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setGoals(docSnap.data());
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  // Save/Update goals
  const saveGoals = async (newGoals) => {
    try {
      await setDoc(doc(db, 'goals', currentUser.uid), {
        ...newGoals,
        updatedAt: new Date().toISOString()
      });
      setGoals(newGoals);
      setShowGoalsModal(false);
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  };

  const searchSymbol = async (keywords) => {
    setIsSearching(true);
    try {
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${keywords}&apikey=${ALPHA_VANTAGE_KEY}`
      );
      
      if (response.data.bestMatches) {
        const matches = response.data.bestMatches
          .filter(match => {
            const symbol = match['1. symbol'];
            const type = match['3. type'];
            const region = match['4. region'];
            
            return type === 'Equity' && 
                   region === 'United States' &&
                   !symbol.includes('.') &&
                   symbol.length <= 5;
          })
          .slice(0, 5)
          .map(match => ({
            symbol: match['1. symbol'],
            name: match['2. name'],
            type: match['3. type'],
            region: match['4. region']
          }));
        
        setSearchResults(matches);
      }
    } catch (error) {
      console.error('Symbol search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const validateSymbol = async (symbol) => {
    if (!symbol) {
      setSymbolValidation({
        isValidating: false,
        isValid: false,
        error: 'Please enter a symbol',
        companyName: '',
        currentPrice: null
      });
      return;
    }

    setSymbolValidation({
      ...symbolValidation,
      isValidating: true,
      error: ''
    });

    try {
      const quoteResponse = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol.toUpperCase()}&apikey=${ALPHA_VANTAGE_KEY}`
      );

      if (quoteResponse.data['Global Quote'] && quoteResponse.data['Global Quote']['05. price']) {
        const quote = quoteResponse.data['Global Quote'];
        const currentPrice = parseFloat(quote['05. price']);

        let companyName = symbol.toUpperCase();
        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          const overviewResponse = await axios.get(
            `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol.toUpperCase()}&apikey=${ALPHA_VANTAGE_KEY}`
          );
          
          if (overviewResponse.data.Name) {
            companyName = overviewResponse.data.Name;
          }
        } catch (error) {
          console.log('Could not fetch company name, using symbol');
        }

        // Auto-detect sector
        const detectedSector = getSector(symbol);
        setNewHolding(prev => ({
          ...prev,
          sector: detectedSector
        }));

        setSymbolValidation({
          isValidating: false,
          isValid: true,
          error: '',
          companyName: companyName,
          currentPrice: currentPrice
        });

        if (!newHolding.avgPrice) {
          setNewHolding(prev => ({
            ...prev,
            avgPrice: currentPrice.toFixed(2)
          }));
        }
      } else {
        setSymbolValidation({
          isValidating: false,
          isValid: false,
          error: 'Invalid symbol or symbol not found',
          companyName: '',
          currentPrice: null
        });
      }
    } catch (error) {
      console.error('Symbol validation error:', error);
      setSymbolValidation({
        isValidating: false,
        isValid: false,
        error: 'Error validating symbol. Please try again.',
        companyName: '',
        currentPrice: null
      });
    }
  };

  const fetchHoldings = async () => {
    try {
      const q = query(collection(db, 'portfolios'), where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const portfolioData = [];
      querySnapshot.forEach((doc) => {
        portfolioData.push({ id: doc.id, ...doc.data() });
      });
      setHoldings(portfolioData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setLoading(false);
    }
  };

  const fetchWatchlist = async () => {
    try {
      const q = query(collection(db, 'watchlist'), where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const watchlistData = [];
      querySnapshot.forEach((doc) => {
        watchlistData.push({ id: doc.id, ...doc.data() });
      });
      setWatchlist(watchlistData);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    }
  };

  const fetchLivePrices = async () => {
    setPricesLoading(true);
    const quotes = {};
    
    for (const holding of holdings) {
      try {
        const response = await axios.get(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${holding.symbol}&apikey=${ALPHA_VANTAGE_KEY}`
        );
        
        if (response.data['Global Quote']) {
          const quote = response.data['Global Quote'];
          quotes[holding.symbol] = {
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: quote['10. change percent'],
            high: parseFloat(quote['03. high']),
            low: parseFloat(quote['04. low']),
            volume: quote['06. volume']
          };
        }
        
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`Error fetching price for ${holding.symbol}:`, error);
      }
    }
    
    setLiveQuotes(quotes);
    setPricesLoading(false);
  };

  const addHolding = async (e) => {
    e.preventDefault();
    
    if (!symbolValidation.isValid) {
      alert('Please enter a valid stock symbol');
      return;
    }

    try {
      await addDoc(collection(db, 'portfolios'), {
        userId: currentUser.uid,
        symbol: newHolding.symbol.toUpperCase(),
        companyName: symbolValidation.companyName,
        quantity: parseFloat(newHolding.quantity),
        avgPrice: parseFloat(newHolding.avgPrice),
        sector: newHolding.sector || 'Other',
        createdAt: new Date().toISOString()
      });
      
      setShowAddModal(false);
      setNewHolding({ symbol: '', quantity: '', avgPrice: '', sector: '' });
      setSymbolValidation({
        isValidating: false,
        isValid: false,
        error: '',
        companyName: '',
        currentPrice: null
      });
      setSearchResults([]);
      fetchHoldings();
    } catch (error) {
      console.error('Error adding holding:', error);
    }
  };

  const selectSymbolFromSearch = (result) => {
    setNewHolding(prev => ({
      ...prev,
      symbol: result.symbol
    }));
    setSearchResults([]);
    validateSymbol(result.symbol);
  };

  const addToWatchlist = async (symbol) => {
    try {
      const exists = watchlist.some(item => item.symbol === symbol);
      if (exists) {
        alert('Already in watchlist!');
        return;
      }

      await addDoc(collection(db, 'watchlist'), {
        userId: currentUser.uid,
        symbol: symbol,
        addedAt: new Date().toISOString()
      });
      
      fetchWatchlist();
    } catch (error) {
      console.error('Error adding to watchlist:', error);
    }
  };

  const removeFromWatchlist = async (watchlistId) => {
    try {
      await deleteDoc(doc(db, 'watchlist', watchlistId));
      fetchWatchlist();
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  const deleteHolding = async (holdingId) => {
    if (window.confirm('Are you sure you want to remove this holding?')) {
      try {
        await deleteDoc(doc(db, 'portfolios', holdingId));
        fetchHoldings();
      } catch (error) {
        console.error('Error deleting holding:', error);
      }
    }
  };

  const calculateMetrics = () => {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    
    holdings.forEach(holding => {
      const invested = holding.quantity * holding.avgPrice;
      totalInvested += invested;
      
      if (liveQuotes[holding.symbol]) {
        totalCurrentValue += holding.quantity * liveQuotes[holding.symbol].price;
      } else {
        totalCurrentValue += invested;
      }
    });
    
    const totalGainLoss = totalCurrentValue - totalInvested;
    const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
    
    return {
      totalInvested: totalInvested.toFixed(2),
      totalCurrentValue: totalCurrentValue.toFixed(2),
      totalGainLoss: totalGainLoss.toFixed(2),
      totalGainLossPercent: totalGainLossPercent.toFixed(2)
    };
  };

  const calculateSectorAllocation = () => {
    const sectorData = {};
    let totalValue = 0;
    
    holdings.forEach(holding => {
      const sector = holding.sector || getSector(holding.symbol);
      const value = holding.quantity * (liveQuotes[holding.symbol]?.price || holding.avgPrice);
      
      if (!sectorData[sector]) {
        sectorData[sector] = {
          value: 0,
          holdings: 0,
          symbols: []
        };
      }
      
      sectorData[sector].value += value;
      sectorData[sector].holdings += 1;
      sectorData[sector].symbols.push(holding.symbol);
      totalValue += value;
    });
    
    // Calculate percentages
    Object.keys(sectorData).forEach(sector => {
      sectorData[sector].percentage = ((sectorData[sector].value / totalValue) * 100).toFixed(1);
    });
    
    return { sectorData, totalValue };
  };

  const calculateGoalProgress = () => {
    const currentValue = parseFloat(calculateMetrics().totalCurrentValue);
    
    return {
      oneYear: {
        target: goals.oneYear,
        current: currentValue,
        remaining: Math.max(0, goals.oneYear - currentValue),
        progress: goals.oneYear > 0 ? Math.min(100, (currentValue / goals.oneYear) * 100) : 0,
        monthlyRequired: goals.oneYear > currentValue ? ((goals.oneYear - currentValue) / 12).toFixed(2) : 0
      },
      threeYear: {
        target: goals.threeYear,
        current: currentValue,
        remaining: Math.max(0, goals.threeYear - currentValue),
        progress: goals.threeYear > 0 ? Math.min(100, (currentValue / goals.threeYear) * 100) : 0,
        monthlyRequired: goals.threeYear > currentValue ? ((goals.threeYear - currentValue) / 36).toFixed(2) : 0
      },
      fiveYear: {
        target: goals.fiveYear,
        current: currentValue,
        remaining: Math.max(0, goals.fiveYear - currentValue),
        progress: goals.fiveYear > 0 ? Math.min(100, (currentValue / goals.fiveYear) * 100) : 0,
        monthlyRequired: goals.fiveYear > currentValue ? ((goals.fiveYear - currentValue) / 60).toFixed(2) : 0
      }
    };
  };

  const metrics = calculateMetrics();
  const { sectorData } = calculateSectorAllocation();
  const goalProgress = calculateGoalProgress();

  if (loading) {
    return <div className="text-center py-10">Loading portfolio...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow max-w-7xl mx-auto w-full px-4">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`pb-4 px-2 font-semibold transition-colors ${
              activeTab === 'portfolio' 
                ? 'text-green-500 border-b-2 border-green-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`pb-4 px-2 font-semibold transition-colors ${
              activeTab === 'watchlist' 
                ? 'text-green-500 border-b-2 border-green-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Watchlist ({watchlist.length})
          </button>
        </div>

        {activeTab === 'portfolio' ? (
          <>
            {/* Portfolio Header with View Toggle */}
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold">My Portfolio</h1>
              <div className="flex gap-4">
                <div className="flex bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setActiveView('holdings')}
                    className={`px-4 py-2 rounded transition-colors ${
                      activeView === 'holdings' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Holdings
                  </button>
                  <button
                    onClick={() => setActiveView('goals')}
                    className={`px-4 py-2 rounded transition-colors ${
                      activeView === 'goals' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Goals
                  </button>
                  <button
                    onClick={() => setActiveView('sectors')}
                    className={`px-4 py-2 rounded transition-colors ${
                      activeView === 'sectors' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Sectors
                  </button>
                </div>
                <button
                  onClick={fetchLivePrices}
                  disabled={pricesLoading}
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`h-5 w-5 ${pricesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Add Holding
                </button>
              </div>
            </div>

            {/* Portfolio Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-900 rounded-lg p-6">
                <p className="text-gray-400 mb-2">Total Invested</p>
                <p className="text-2xl font-bold">${metrics.totalInvested}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-6">
                <p className="text-gray-400 mb-2">Current Value</p>
                <p className="text-2xl font-bold">${metrics.totalCurrentValue}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-6">
                <p className="text-gray-400 mb-2">Total Return</p>
                <p className={`text-2xl font-bold ${parseFloat(metrics.totalGainLoss) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${metrics.totalGainLoss}
                </p>
                <p className={`text-sm ${parseFloat(metrics.totalGainLossPercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ({metrics.totalGainLossPercent}%)
                </p>
              </div>
              <div className="bg-gray-900 rounded-lg p-6">
                <p className="text-gray-400 mb-2">Holdings</p>
                <p className="text-2xl font-bold">{holdings.length}</p>
              </div>
            </div>

            {/* Dynamic Content Based on View */}
            {activeView === 'holdings' && (
              holdings.length > 0 ? (
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left">Symbol</th>
                        <th className="px-6 py-3 text-left">Shares</th>
                        <th className="px-6 py-3 text-left">Avg Cost</th>
                        <th className="px-6 py-3 text-left">Current Price</th>
                        <th className="px-6 py-3 text-left">Market Value</th>
                        <th className="px-6 py-3 text-left">Gain/Loss</th>
                        <th className="px-6 py-3 text-left">Sector</th>
                        <th className="px-6 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map((holding) => {
                        const livePrice = liveQuotes[holding.symbol]?.price || holding.avgPrice;
                        const marketValue = holding.quantity * livePrice;
                        const costBasis = holding.quantity * holding.avgPrice;
                        const gainLoss = marketValue - costBasis;
                        const gainLossPercent = ((gainLoss / costBasis) * 100).toFixed(2);
                        const sector = holding.sector || getSector(holding.symbol);
                        
                        return (
                          <tr key={holding.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div>
                                  <span className="font-semibold">{holding.symbol}</span>
                                  {holding.companyName && (
                                    <p className="text-xs text-gray-400">{holding.companyName}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => addToWatchlist(holding.symbol)}
                                  className="text-gray-400 hover:text-yellow-500"
                                  title="Add to watchlist"
                                >
                                  <Star className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4">{holding.quantity}</td>
                            <td className="px-6 py-4">${holding.avgPrice.toFixed(2)}</td>
                            <td className="px-6 py-4">
                              ${livePrice.toFixed(2)}
                              {liveQuotes[holding.symbol] && (
                                <span className={`text-xs ml-2 ${liveQuotes[holding.symbol].change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {liveQuotes[holding.symbol].changePercent}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">${marketValue.toFixed(2)}</td>
                            <td className={`px-6 py-4 ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              <div className="flex items-center gap-1">
                                {gainLoss >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                ${Math.abs(gainLoss).toFixed(2)} ({gainLossPercent}%)
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-gray-800 rounded text-xs">{sector}</span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => deleteHolding(holding.id)}
                                className="text-red-500 hover:text-red-400"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-lg p-10 text-center">
                  <p className="text-gray-400 mb-4">No holdings yet</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg"
                  >
                    Add Your First Holding
                  </button>
                </div>
              )
            )}

            {activeView === 'goals' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Financial Goals</h2>
                  <button
                    onClick={() => setShowGoalsModal(true)}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Target className="h-5 w-5" />
                    Set Goals
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 1 Year Goal */}
                  <div className="bg-gray-900 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">1 Year Goal</h3>
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-gray-400 text-sm">Target</p>
                        <p className="text-2xl font-bold">${goals.oneYear.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Progress</p>
                        <div className="w-full bg-gray-700 rounded-full h-3 mt-2">
                          <div 
                            className="bg-green-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${goalProgress.oneYear.progress}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-300 mt-1">{goalProgress.oneYear.progress.toFixed(1)}% Complete</p>
                      </div>
                      <div className="pt-2 border-t border-gray-800">
                        <p className="text-gray-400 text-sm">Remaining</p>
                        <p className="text-lg font-semibold">${goalProgress.oneYear.remaining.toLocaleString()}</p>
                        {goalProgress.oneYear.monthlyRequired > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            Save ${goalProgress.oneYear.monthlyRequired}/month
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3 Year Goal */}
                  <div className="bg-gray-900 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">3 Year Goal</h3>
                      <Award className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-gray-400 text-sm">Target</p>
                        <p className="text-2xl font-bold">${goals.threeYear.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Progress</p>
                        <div className="w-full bg-gray-700 rounded-full h-3 mt-2">
                          <div 
                            className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${goalProgress.threeYear.progress}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-300 mt-1">{goalProgress.threeYear.progress.toFixed(1)}% Complete</p>
                      </div>
                      <div className="pt-2 border-t border-gray-800">
                        <p className="text-gray-400 text-sm">Remaining</p>
                        <p className="text-lg font-semibold">${goalProgress.threeYear.remaining.toLocaleString()}</p>
                        {goalProgress.threeYear.monthlyRequired > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            Save ${goalProgress.threeYear.monthlyRequired}/month
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 5 Year Goal */}
                  <div className="bg-gray-900 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">5 Year Goal</h3>
                      <Target className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-gray-400 text-sm">Target</p>
                        <p className="text-2xl font-bold">${goals.fiveYear.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Progress</p>
                        <div className="w-full bg-gray-700 rounded-full h-3 mt-2">
                          <div 
                            className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${goalProgress.fiveYear.progress}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-300 mt-1">{goalProgress.fiveYear.progress.toFixed(1)}% Complete</p>
                      </div>
                      <div className="pt-2 border-t border-gray-800">
                        <p className="text-gray-400 text-sm">Remaining</p>
                        <p className="text-lg font-semibold">${goalProgress.fiveYear.remaining.toLocaleString()}</p>
                        {goalProgress.fiveYear.monthlyRequired > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            Save ${goalProgress.fiveYear.monthlyRequired}/month
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Goal Achievement Tips */}
                <div className="bg-gray-900 rounded-lg p-6 mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-semibold">Tips to Achieve Your Goals</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-300">• Diversify across sectors to reduce risk</p>
                      <p className="text-sm text-gray-300">• Set up automatic monthly investments</p>
                      <p className="text-sm text-gray-300">• Reinvest dividends for compound growth</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-300">• Review and rebalance quarterly</p>
                      <p className="text-sm text-gray-300">• Consider index funds for stability</p>
                      <p className="text-sm text-gray-300">• Keep 3-6 months emergency fund</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === 'sectors' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-4">Sector Allocation</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sector Distribution */}
                  <div className="bg-gray-900 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Portfolio Distribution
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(sectorData).map(([sector, data]) => (
                        <div key={sector}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm">{sector}</span>
                            <span className="text-sm font-semibold">{data.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                sector === 'Technology' ? 'bg-blue-500' :
                                sector === 'Healthcare' ? 'bg-red-500' :
                                sector === 'Finance' ? 'bg-green-500' :
                                sector === 'Energy' ? 'bg-yellow-500' :
                                sector === 'Consumer Discretionary' ? 'bg-purple-500' :
                                sector === 'Industrials' ? 'bg-orange-500' :
                                'bg-gray-500'
                              }`}
                              style={{ width: `${data.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sector Details */}
                  <div className="bg-gray-900 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Sector Details
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(sectorData).map(([sector, data]) => (
                        <div key={sector} className="border-b border-gray-800 pb-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold">{sector}</p>
                              <p className="text-xs text-gray-400">
                                {data.holdings} holding{data.holdings > 1 ? 's' : ''}: {data.symbols.join(', ')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${data.value.toFixed(2)}</p>
                              <p className="text-xs text-gray-400">{data.percentage}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Diversification Score */}
                <div className="bg-gray-900 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Diversification Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-gray-400 text-sm">Number of Sectors</p>
                      <p className="text-2xl font-bold">{Object.keys(sectorData).length}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Largest Sector Weight</p>
                      <p className="text-2xl font-bold">
                        {Math.max(...Object.values(sectorData).map(d => parseFloat(d.percentage)))}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Diversification Score</p>
                      <p className="text-2xl font-bold text-green-500">
                        {Object.keys(sectorData).length >= 5 ? 'Good' : 
                         Object.keys(sectorData).length >= 3 ? 'Fair' : 'Poor'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Watchlist Tab */
          <div>
            <h1 className="text-3xl font-bold mb-8">My Watchlist</h1>
            {watchlist.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {watchlist.map((item) => (
                  <div key={item.id} className="bg-gray-900 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold">{item.symbol}</span>
                      <button
                        onClick={() => removeFromWatchlist(item.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      Added {new Date(item.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg p-10 text-center">
                <Star className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No stocks in your watchlist</p>
                <p className="text-sm text-gray-500">Add stocks from your portfolio or search results</p>
              </div>
            )}
          </div>
        )}

        {/* Goals Modal */}
        {showGoalsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Set Financial Goals</h2>
                <button
                  onClick={() => setShowGoalsModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                saveGoals({
                  oneYear: parseFloat(formData.get('oneYear')) || 0,
                  threeYear: parseFloat(formData.get('threeYear')) || 0,
                  fiveYear: parseFloat(formData.get('fiveYear')) || 0
                });
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">1 Year Goal ($)</label>
                  <input
                    type="number"
                    name="oneYear"
                    defaultValue={goals.oneYear}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="25000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">3 Year Goal ($)</label>
                  <input
                    type="number"
                    name="threeYear"
                    defaultValue={goals.threeYear}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="100000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">5 Year Goal ($)</label>
                  <input
                    type="number"
                    name="fiveYear"
                    defaultValue={goals.fiveYear}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="250000"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg font-semibold"
                  >
                    Save Goals
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGoalsModal(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enhanced Add Holding Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6">Add New Holding</h2>
              <form onSubmit={addHolding} className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium mb-1">Stock Symbol</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newHolding.symbol}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setNewHolding({...newHolding, symbol: value});
                        if (value.length === 0) {
                          setSymbolValidation({
                            isValidating: false,
                            isValid: false,
                            error: '',
                            companyName: '',
                            currentPrice: null
                          });
                        }
                      }}
                      onBlur={() => {
                        if (newHolding.symbol && !symbolValidation.isValid) {
                          validateSymbol(newHolding.symbol);
                        }
                      }}
                      className={`w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 ${
                        symbolValidation.error ? 'focus:ring-red-500 border border-red-500' : 
                        symbolValidation.isValid ? 'focus:ring-green-500 border border-green-500' :
                        'focus:ring-green-500'
                      }`}
                      placeholder="AAPL"
                      required
                    />
                    {symbolValidation.isValidating && (
                      <div className="absolute right-3 top-2">
                        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    )}
                    {symbolValidation.isValid && (
                      <div className="absolute right-3 top-2">
                        <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded-lg mt-1 max-h-60 overflow-auto">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectSymbolFromSearch(result)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-semibold">{result.symbol}</span>
                              <p className="text-xs text-gray-400">{result.name}</p>
                            </div>
                            <span className="text-xs text-gray-500">{result.region}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {symbolValidation.error && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {symbolValidation.error}
                    </p>
                  )}
                  {symbolValidation.isValid && (
                    <div className="text-green-500 text-xs mt-1">
                      <p className="flex items-center gap-1">
                        ✓ Valid: {symbolValidation.companyName}
                      </p>
                      {symbolValidation.currentPrice && (
                        <p className="text-gray-400">
                          Current price: ${symbolValidation.currentPrice.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Sector</label>
                  <select
                    value={newHolding.sector}
                    onChange={(e) => setNewHolding({...newHolding, sector: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Auto-detect</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Energy">Energy</option>
                    <option value="Consumer Discretionary">Consumer Discretionary</option>
                    <option value="Consumer Staples">Consumer Staples</option>
                    <option value="Industrials">Industrials</option>
                    <option value="Materials">Materials</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Communication">Communication</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Number of Shares</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newHolding.quantity}
                    onChange={(e) => setNewHolding({...newHolding, quantity: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="10"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Purchase Price (per share)
                    {symbolValidation.currentPrice && (
                      <button
                        type="button"
                        onClick={() => setNewHolding({...newHolding, avgPrice: symbolValidation.currentPrice.toFixed(2)})}
                        className="ml-2 text-xs text-green-500 hover:text-green-400"
                      >
                        Use current price
                      </button>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newHolding.avgPrice}
                    onChange={(e) => setNewHolding({...newHolding, avgPrice: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={symbolValidation.currentPrice ? symbolValidation.currentPrice.toFixed(2) : "150.00"}
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={!symbolValidation.isValid || symbolValidation.isValidating}
                    className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Holding
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewHolding({ symbol: '', quantity: '', avgPrice: '', sector: '' });
                      setSymbolValidation({
                        isValidating: false,
                        isValid: false,
                        error: '',
                        companyName: '',
                        currentPrice: null
                      });
                      setSearchResults([]);
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
