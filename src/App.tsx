import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from 'react-router-dom';
import { TrendingUp, Menu, X } from 'lucide-react';
import { useState } from 'react';
import StockSearch from './components/StockSearch';
import StockDetail from './components/StockDetail';
import Screener from './pages/Screener';

function Navigation() {
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
          
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="hover:text-green-500 transition">Markets</Link>
            <Link to="/screener" className="hover:text-green-500 transition">Screener</Link>
            <Link to="/portfolio" className="hover:text-green-500 transition">Portfolio</Link>
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
              <Link to="/" className="px-2 py-1 hover:text-green-500 transition" onClick={() => setMobileMenuOpen(false)}>
                Markets
              </Link>
              <Link to="/screener" className="px-2 py-1 hover:text-green-500 transition" onClick={() => setMobileMenuOpen(false)}>
                Screener
              </Link>
              <Link to="/portfolio" className="px-2 py-1 hover:text-green-500 transition" onClick={() => setMobileMenuOpen(false)}>
                Portfolio
              </Link>
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
  const navigate = useNavigate();
  const { symbol } = useParams<{ symbol: string }>();
  
  if (!symbol) {
    navigate('/');
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
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center">
      <h1 className="text-3xl font-bold mb-4">Portfolio</h1>
      <p className="text-gray-400">Coming soon - Authentication will be added here</p>
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
          <Route path="/screener" element={<Screener />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
