import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, Star } from 'lucide-react';
import axios from 'axios';

export default function Portfolio() {
  const { currentUser } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHolding, setNewHolding] = useState({
    symbol: '',
    quantity: '',
    avgPrice: ''
  });
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [liveQuotes, setLiveQuotes] = useState({});
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' or 'watchlist'

  const ALPHA_VANTAGE_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;

  useEffect(() => {
    if (currentUser) {
      fetchHoldings();
      fetchWatchlist();
    }
  }, [currentUser]);

  useEffect(() => {
    if (holdings.length > 0 && activeTab === 'portfolio') {
      fetchLivePrices();
      const interval = setInterval(fetchLivePrices, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [holdings, activeTab]);

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
        
        // Add delay to respect API rate limits
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
    try {
      await addDoc(collection(db, 'portfolios'), {
        userId: currentUser.uid,
        symbol: newHolding.symbol.toUpperCase(),
        quantity: parseFloat(newHolding.quantity),
        avgPrice: parseFloat(newHolding.avgPrice),
        createdAt: new Date().toISOString()
      });
      
      setShowAddModal(false);
      setNewHolding({ symbol: '', quantity: '', avgPrice: '' });
      fetchHoldings();
    } catch (error) {
      console.error('Error adding holding:', error);
    }
  };

  const addToWatchlist = async (symbol) => {
    try {
      // Check if already in watchlist
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
        totalCurrentValue += invested; // Use cost basis if no live price
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

  const metrics = calculateMetrics();

  if (loading) {
    return <div className="text-center py-10">Loading portfolio...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
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
          {/* Portfolio Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Portfolio</h1>
            <div className="flex gap-4">
              <button
                onClick={fetchLivePrices}
                disabled={pricesLoading}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${pricesLoading ? 'animate-spin' : ''}`} />
                Refresh Prices
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

          {/* Holdings Table */}
          {holdings.length > 0 ? (
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
                    
                    return (
                      <tr key={holding.id} className="border-t border-gray-800">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{holding.symbol}</span>
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

      {/* Add Holding Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Add New Holding</h2>
            <form onSubmit={addHolding} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Stock Symbol</label>
                <input
                  type="text"
                  value={newHolding.symbol}
                  onChange={(e) => setNewHolding({...newHolding, symbol: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="AAPL"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Number of Shares</label>
                <input
                  type="number"
                  step="0.01"
                  value={newHolding.quantity}
                  onChange={(e) => setNewHolding({...newHolding, quantity: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="10"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Price (per share)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newHolding.avgPrice}
                  onChange={(e) => setNewHolding({...newHolding, avgPrice: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="150.00"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg font-semibold"
                >
                  Add Holding
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
  );
}
