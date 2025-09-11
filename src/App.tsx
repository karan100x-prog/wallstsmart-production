import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { TrendingUp, Menu, X, LogOut, User } from 'lucide-react';
import { useEffect, useState } from 'react';  // <-- Only ONE import from react
import StockSearch from './components/StockSearch';
import StockDetail from './components/StockDetail';
import Screener from './pages/Screener';
import { supabase } from './lib/supabase';
import AuthForm from './components/AuthForm';

function Navigation({ user, onSignOut }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <TrendingUp className="h-6 sm:h-8 w-6 sm:w-8 text-green-500" />
            <span className="text-lg sm:text-xl font-bold">WallStSmart</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="hover:text-green-500 transition">
              Markets
            </Link>
            <Link to="/screener" className="hover:text-green-500 transition">
              Screener
            </Link>
            <Link to="/portfolio" className="hover:text-green-500 transition">
              Portfolio
            </Link>
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-300">{user.email}</span>
                </div>
                <button 
                  onClick={onSignOut}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition">
                Sign In
              </button>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
        
        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 py-4">
            <div className="flex flex-col gap-4">
              <Link 
                to="/" 
                className="px-2 py-1 hover:text-green-500 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Markets
              </Link>
              <Link 
                to="/screener" 
                className="px-2 py-1 hover:text-green-500 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Screener
              </Link>
              <Link 
                to="/portfolio" 
                className="px-2 py-1 hover:text-green-500 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Portfolio
              </Link>
              {user ? (
                <>
                  <div className="px-2 py-1 text-sm text-gray-300 border-t border-gray-800 pt-4">
                    {user.email}
                  </div>
                  <button 
                    onClick={onSignOut}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition w-full"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition w-full">
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
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
  
  useEffect(() => {
    if (!symbol) {
      navigate('/', { replace: true });
    }
  }, [symbol, navigate]);
  
  if (!symbol) {
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

function PortfolioPage({ user }) {
  if (!user) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center">
        <h2 className="text-2xl font-bold mb-4">Please sign in to view your portfolio</h2>
        <p className="text-gray-400">Track your investments and monitor performance</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold mb-8">My Portfolio</h1>
      <div className="grid gap-6">
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Portfolio Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded p-4">
              <p className="text-gray-400 text-sm">Total Value</p>
              <p className="text-2xl font-bold text-green-500">$0.00</p>
            </div>
            <div className="bg-gray-800 rounded p-4">
              <p className="text-gray-400 text-sm">Today's Change</p>
              <p className="text-2xl font-bold">$0.00</p>
            </div>
            <div className="bg-gray-800 rounded p-4">
              <p className="text-gray-400 text-sm">Total Return</p>
              <p className="text-2xl font-bold">0.00%</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Holdings</h2>
          <p className="text-gray-400">No holdings yet. Start by searching for stocks to add to your portfolio.</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-green-500 mx-auto mb-4 animate-pulse" />
          <p className="text-xl">Loading WallStSmart...</p>
        </div>
      </div>
    );
  }

  // Show auth form if user is not logged in and trying to access protected routes
  const [showAuth, setShowAuth] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-gray-950 text-white">
        <Navigation user={user} onSignOut={handleSignOut} />
        
        {showAuth && !user ? (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="relative">
              <button 
                onClick={() => setShowAuth(false)}
                className="absolute -top-10 right-0 text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
              <AuthForm />
            </div>
          </div>
        ) : null}

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/stock/:symbol" element={<StockPage />} />
          <Route path="/screener" element={<Screener />} />
          <Route path="/portfolio" element={<PortfolioPage user={user} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
