import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { TrendingUp, Menu, X, LogOut, Search } from 'lucide-react';
import { useState } from 'react';
import StockSearch from './components/StockSearch';
import StockDetail from './components/StockDetail';
import Screener from './pages/Screener';
import Portfolio from './components/Portfolio';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import MacroDashboard from './components/MacroDashboard';
import SmartFlow from './components/SmartFlow';
import { Analytics } from '@vercel/analytics/react';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { currentUser, logout } = useAuth();
  
  // Check if we're on the home page
  const isHomePage = location.pathname === '/';
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };
  
  const handleSearchSelect = (symbol: string) => {
    navigate(`/stock/${symbol}`);
    setShowSearch(false);
  };
  
  return (
    <>
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <TrendingUp className="h-6 sm:h-8 w-6 sm:w-8 text-green-500" />
              <span className="text-lg sm:text-xl font-bold">WallStSmart</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              {/* Search Icon - Only show when not on home page */}
              {!isHomePage && (
                <button 
                  onClick={() => setShowSearch(!showSearch)}
                  className="hover:text-green-500 transition p-2 rounded-lg hover:bg-gray-800"
                  title="Search stocks"
                >
                  <Search className="h-5 w-5" />
                </button>
              )}
              
              <Link to="/macro" className="hover:text-green-500 transition">Macro</Link>
              <Link to="/screener" className="hover:text-green-500 transition">Screener</Link>
              <Link to="/portfolio" className="hover:text-green-500 transition">Portfolio</Link>
              <Link to="/smart-flow" className="nav-link">Smart Flow</Link>
              
              {currentUser ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">{currentUser.email}</span>
                  <button 
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowLogin(true)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition"
                >
                  Sign In
                </button>
              )}
            </div>
            
            <div className="flex md:hidden items-center gap-2">
              {/* Mobile Search Icon - Only show when not on home page */}
              {!isHomePage && (
                <button 
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-2 hover:text-green-500 transition"
                  title="Search stocks"
                >
                  <Search className="h-5 w-5" />
                </button>
              )}
              
              <button 
                className="p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
          
          {/* Search Bar - Shows when search icon is clicked */}
          {showSearch && !isHomePage && (
            <div className="pb-4 px-2">
              <div className="max-w-md mx-auto">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search stocks by symbol or name..."
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500 pr-10"
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      if (value && e.nativeEvent instanceof KeyboardEvent && e.nativeEvent.key === 'Enter') {
                        handleSearchSelect(value);
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const value = (e.target as HTMLInputElement).value.toUpperCase();
                        if (value) {
                          handleSearchSelect(value);
                        }
                      }
                    }}
                    autoFocus
                  />
                  <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          )}
          
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-800 py-4">
              <div className="flex flex-col gap-4">
                <Link to="/macro" className="px-2 py-1 hover:text-green-500 transition" onClick={() => setMobileMenuOpen(false)}>
                  Macro
                </Link>
                <Link to="/screener" className="px-2 py-1 hover:text-green-500 transition" onClick={() => setMobileMenuOpen(false)}>
                  Screener
                </Link>
                <Link to="/portfolio" className="px-2 py-1 hover:text-green-500 transition" onClick={() => setMobileMenuOpen(false)}>
                  Portfolio
                </Link>
                <Link to="/smart-flow" className="px-2 py-1 hover:text-green-500 transition" onClick={() => setMobileMenuOpen(false)}>
                  Smart Flow
                </Link>
                {currentUser ? (
                  <>
                    <div className="px-2 py-1 text-sm text-gray-400">{currentUser.email}</div>
                    <button 
                      onClick={handleLogout}
                      className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition w-full"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setShowLogin(true)}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition w-full"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
      
      {showLogin && <Login onClose={() => setShowLogin(false)} />}
    </>
  );
}

function HomePage() {
  const navigate = useNavigate();
  
  const handleSelectStock = (symbol: string) => {
    navigate(`/stock/${symbol}`);
  };

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-20">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Professional Stock Analysis
            <span className="text-green-500 block sm:inline"> Made Simple</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 mb-6 sm:mb-8 px-4 sm:px-0">
            Smarter Decision. Smarter Returns.
          </p>
        </div>
      </div>
      
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-10 sm:pb-16 md:pb-20">
        <div className="w-full sm:max-w-[80%] md:max-w-[70%] lg:max-w-[60%] mx-auto">
          <StockSearch onSelectStock={handleSelectStock} />
        </div>
      </div>
    </>
  );
}

function StockPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  
  if (!symbol) {
    navigate('/', { replace: true });
    return null;
  }
  
  return (
    <div className="w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <StockDetail symbol={symbol} />
      </div>
    </div>
  );
}

function PortfolioPage() {
  const { currentUser } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  
  if (!currentUser) {
    return (
      <>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center">
          <h2 className="text-2xl font-bold mb-4">Sign in to access your portfolio</h2>
          <p className="text-gray-400 mb-6">Track your investments and create watchlists</p>
          <button 
            onClick={() => setShowLogin(true)}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold"
          >
            Sign In
          </button>
        </div>
        {showLogin && <Login onClose={() => setShowLogin(false)} />}
      </>
    );
  }
  
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
      <Portfolio />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-950 text-white">
          <Navigation />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/stock/:symbol" element={<StockPage />} />
            <Route path="/screener" element={<Screener />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/macro" element={<MacroDashboard />} />
            <Route path="/smart-flow" element={<SmartFlow />} />
          </Routes>
          <Analytics />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
