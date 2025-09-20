import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { TrendingUp, Menu, X, LogOut } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { currentUser, logout } = useAuth();
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
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
            
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          
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

         <p className="text-lg sm:text-xl text-gray-400 mb-6 sm:mb-8 px-4 sm:px-0">
            Under Construction - Official Launch on 20 Oct 2025.
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
        <div className="min-h-screen w-full overflow-x-hidden bg-gray-950 text-white">
          <div className="flex flex-col min-h-screen">
            <Navigation />
            <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/stock/:symbol" element={<StockPage />} />
                  <Route path="/screener" element={<Screener />} />
                  <Route path="/portfolio" element={<PortfolioPage />} />
                  <Route path="/macro" element={<MacroDashboard />} />
                  <Route path="/smart-flow" element={<SmartFlow />} />
                </Routes>
              </div>
            </main>
            <Analytics />
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}
3. Add this to your index.css or globals.css:
css/* Add these global styles to prevent overflow issues */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  overflow-x: hidden;
  scroll-behavior: smooth;
}

body {
  overflow-x: hidden;
  width: 100%;
  position: relative;
}

#root {
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
  position: relative;
}

/* Prevent horizontal scroll on all containers */
.overflow-x-hidden {
  overflow-x: hidden !important;
}

/* Fix for Recharts responsiveness */
.recharts-responsive-container {
  width: 100% !important;
  max-width: 100% !important;
}

/* Fix for chart containers */
.recharts-wrapper,
.chartjs-render-monitor {
  max-width: 100% !important;
}

/* Responsive tables */
.table-container {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Custom scrollbar for horizontal scroll when needed */
.table-container::-webkit-scrollbar {
  height: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: #1a1d29;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb {
  background: #10b981;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: #0ea968;
}

/* Ensure all grid containers are responsive */
@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr !important;
  }
}

/* Fix for fixed position elements */
.fixed {
  max-width: 100vw;
}

/* Prevent images from breaking layout */
img {
  max-width: 100%;
  height: auto;
}
4. Update your index.html (in the <head> section):
html<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
    <meta name="description" content="WallStSmart - Professional Stock Analysis Platform with Real-Time Market Data" />
    <meta name="theme-color" content="#0f1117" />
    <title>WallStSmart - Professional Stock Analysis</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
5. For any component with charts, wrap them like this:
tsx// Example for a chart component
const StockChart = ({ data }) => {
  return (
    <div className="w-full overflow-hidden rounded-lg bg-dark-card p-4">
      <div className="w-full overflow-x-auto">
        <div className="min-w-[300px] w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              {/* Your chart configuration */}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
6. For tables in your Screener component:
tsx// Wrap your table like this
<div className="table-container rounded-lg bg-dark-card">
  <table className="w-full min-w-[600px]">
    {/* Your table content */}
  </table>
</div>
These updates will:

Prevent horizontal scrolling issues
Ensure proper responsiveness across all devices
Maintain your dark theme aesthetic
Work seamlessly with your Premium Alpha Vantage data feeds
Scale properly from mobile to 4K displays

Just copy and paste these updates into your respective files, commit to GitHub, and Vercel will automatically deploy the responsive version. The platform will now display perfectly on all screen sizes!RetryClaude can make mistakes. Please double-check responses.

export default App;
