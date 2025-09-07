import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StockSearch from './components/StockSearch';
import StockDetail from './components/StockDetail';
import StockChart from './components/StockChart';
import InstitutionalFlow from './pages/InstitutionalFlow';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <Routes>
          {/* Home page - just StockSearch, no header */}
          <Route path="/" element={
            <div className="w-full">
              <StockSearch />
            </div>
          } />
          
          {/* Stock Detail page */}
          <Route path="/stock/:symbol" element={
            <div className="w-full">
              <Header />
              <StockDetail />
            </div>
          } />
          
          {/* Chart page */}
          <Route path="/chart/:symbol" element={
            <div className="w-full">
              <Header />
              <StockChart />
            </div>
          } />
          
          {/* Institutional Flow page */}
          <Route path="/institutional" element={
            <div className="w-full">
              <Header />
              <InstitutionalFlow />
            </div>
          } />
          
          {/* Screener page - to be implemented */}
          <Route path="/screener" element={
            <div className="w-full">
              <Header />
              <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-white mb-8">Stock Screener</h1>
                <p className="text-gray-400">Coming soon...</p>
              </div>
            </div>
          } />
          
          {/* Portfolio page - to be implemented */}
          <Route path="/portfolio" element={
            <div className="w-full">
              <Header />
              <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-white mb-8">Portfolio</h1>
                <p className="text-gray-400">Coming soon...</p>
              </div>
            </div>
          } />
          
          {/* News page - to be implemented */}
          <Route path="/news" element={
            <div className="w-full">
              <Header />
              <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-white mb-8">Market News</h1>
                <p className="text-gray-400">Coming soon...</p>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

// Simple header component for non-home pages
const Header: React.FC = () => {
  return (
    <header className="border-b border-gray-700 bg-black/20 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <a href="/" className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            WallStSmart
          </a>
          <nav className="hidden md:flex gap-6">
            <a href="/screener" className="text-gray-300 hover:text-green-400 transition-colors">Screener</a>
            <a href="/portfolio" className="text-gray-300 hover:text-green-400 transition-colors">Portfolio</a>
            <a href="/institutional" className="text-gray-300 hover:text-green-400 transition-colors">Flow</a>
            <a href="/news" className="text-gray-300 hover:text-green-400 transition-colors">News</a>
            <button className="bg-gradient-to-r from-green-500 to-blue-500 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity">
              Sign In
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default App;
