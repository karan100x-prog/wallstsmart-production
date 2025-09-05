import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { TrendingUp, Search, Activity, DollarSign, BarChart3 } from 'lucide-react';
import { useEffect } from 'react';
import StockSearch from './components/StockSearch';
import StockDetail from './components/StockDetail';

function Navigation() {
  const navigate = useNavigate();
  
  return (
    <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <TrendingUp className="h-8 w-8 text-green-500" />
            <span className="text-xl font-bold">WallStSmart</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-green-500 transition">Markets</a>
            <a href="#" className="hover:text-green-500 transition">Screener</a>
            <a href="#" className="hover:text-green-500 transition">Portfolio</a>
            <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition">
              Sign In
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function HomePage() {
  const navigate = useNavigate();
  
  const handleSelectStock = (symbol: string) => {
    navigate(`/stock/${symbol}`);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            Professional Stock Analysis
            <span className="text-green-500"> Made Simple</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Real-time data powered by Premium Alpha Vantage API
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <Activity className="h-8 w-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold">Real-Time</div>
            <div className="text-gray-400">Market Data</div>
          </div>
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <BarChart3 className="h-8 w-8 text-blue-500 mb-2" />
            <div className="text-2xl font-bold">10,000+</div>
            <div className="text-gray-400">Stocks Tracked</div>
          </div>
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <DollarSign className="h-8 w-8 text-yellow-500 mb-2" />
            <div className="text-2xl font-bold">Premium</div>
            <div className="text-gray-400">API Access</div>
          </div>
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <Search className="h-8 w-8 text-purple-500 mb-2" />
            <div className="text-2xl font-bold">Advanced</div>
            <div className="text-gray-400">Screening Tools</div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <StockSearch onSelectStock={handleSelectStock} />
      </div>
    </>
  );
}


function StockPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!symbol) {
      navigate('/', { replace: true });
    }
  }, [symbol, navigate]);
  
  if (!symbol) {
    return null;
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <StockDetail symbol={symbol} onBack={() => navigate('/')} />
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-950 text-white">
        <Navigation />
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/stock/:symbol" element={<StockPage />} />
</Routes>
      </div>
    </Router>
  );
}

export default App;
