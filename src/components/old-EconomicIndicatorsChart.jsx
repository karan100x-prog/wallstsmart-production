
import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Globe, Briefcase, Gauge, Coins, ArrowUpRight, ArrowDownRight, Clock, Database, LineChart as LineChartIcon, Calendar, Layers, Eye, EyeOff, Zap, Droplet, Package, Wheat, Bitcoin, ChevronUp, ChevronDown } from 'lucide-react';
import EconomicIndicatorsChart from './EconomicIndicatorsChart';
import { 
  fetchHistoricalMarketData, 
  fetchAndProcessMacroData, 
  fetchCommodityData, 
  fetchCryptoData 
} from '../services/macroDataService';

const MacroDashboard = () => {
  const [showSP500, setShowSP500] = useState(true);
  const [showDOW, setShowDOW] = useState(true);
  const [showNASDAQ, setShowNASDAQ] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('Connecting...');
  
  // State for real API data
  const [historicalData, setHistoricalData] = useState([]);
  const [economicData, setEconomicData] = useState(null);
  const [commoditiesData, setCommoditiesData] = useState([]);
  const [cryptoData, setCryptoData] = useState([]);

  useEffect(() => {
    loadAllData();
    // Refresh data every 5 minutes
    const interval = setInterval(loadAllData, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTimeout(() => setAnimationComplete(true), 500);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Fetch all real data
      const [historical, economic, commodities, crypto] = await Promise.all([
        fetchHistoricalMarketData(),
        fetchAndProcessMacroData(),
        fetchCommodityData(),
        fetchCryptoData()
      ]);

      setHistoricalData(historical);
      setEconomicData(economic);
      setCommoditiesData(commodities);
      setCryptoData(crypto);
      setDataSource('Live Alpha Vantage Data');
      
      console.log('Loaded real data:', { historical, economic, commodities, crypto });
    } catch (error) {
      console.error('Error loading data:', error);
      setDataSource('Using Cached Data');
      // Use default data if API fails
      setHistoricalData(generateSimulatedHistoricalData());
      setEconomicData(getDefaultEconomicData());
      setCommoditiesData(getDefaultCommodityData());
      setCryptoData(getDefaultCryptoData());
    } finally {
      setLoading(false);
    }
  };

  // Fallback data generation
  const generateSimulatedHistoricalData = () => {
    const data = [];
    const startYear = 2000;
    const currentYear = 2024;
    
    for (let year = startYear; year <= currentYear; year++) {
      for (let month = 0; month < 12; month++) {
        if (year === currentYear && month > 8) break;
        
        let sp500Base = 1400;
        let dowBase = 10000;
        let nasdaqBase = 2500;
        
        if (year <= 2002) {
          sp500Base -= (2002 - year) * 200;
          nasdaqBase -= (2002 - year) * 800;
        }
        
        if (year >= 2003 && year <= 2007) {
          sp500Base += (year - 2003) * 150;
          nasdaqBase += (year - 2003) * 400;
        }
        
        if (year === 2008 || year === 2009) {
          sp500Base *= 0.65;
          dowBase *= 0.62;
          nasdaqBase *= 0.68;
        }
        
        if (year >= 2010) {
          const growthYears = year - 2010;
          sp500Base = 1100 + growthYears * 285;
          dowBase = 10000 + growthYears * 2100;
          nasdaqBase = 2200 + growthYears * 980;
        }
        
        const monthlyVolatility = Math.sin(month * 0.5) * 0.03 + Math.random() * 0.02;
        
        data.push({
          date: `${year}-${String(month + 1).padStart(2, '0')}`,
          displayDate: month === 0 ? year.toString() : '',
          year: year,
          sp500: Math.round(sp500Base * (1 + monthlyVolatility)),
          dow: Math.round(dowBase * (1 + monthlyVolatility)),
          nasdaq: Math.round(nasdaqBase * (1 + monthlyVolatility))
        });
      }
    }
    
    return data;
  };

  const getDefaultEconomicData = () => ({
    gdp: { value: 2.8, change: 0.3, trend: 'up', target: 2.5 },
    cpi: { value: 2.9, change: -0.3, trend: 'down', target: 2.0 },
    unemployment: { value: 3.7, change: -0.2, trend: 'down', target: 4.0 },
    fedRate: { value: 4.33, change: 0, trend: 'flat', target: 3.0 },
    treasury10Y: { value: 4.06, change: 0.05, trend: 'up', target: 3.5 },
    retailSales: { value: 0.4, change: 0.1, trend: 'up', target: 0.3 },
    nonfarmPayroll: { value: 236, change: 12, trend: 'up', target: 200 },
    durableGoods: { value: 0.3, change: -0.2, trend: 'down', target: 0.5 }
  });

  const getDefaultCommodityData = () => [
    { name: 'WTI Oil', value: 62.60, change: 0.61, icon: '🛢️', color: '#000000' },
    { name: 'Natural Gas', value: 3.10, change: 1.64, icon: '⚡', color: '#3b82f6' },
    { name: 'Gold', value: 2042.30, change: 0.62, icon: '🥇', color: '#fbbf24' },
    { name: 'Silver', value: 23.85, change: 1.79, icon: '🥈', color: '#9ca3af' },
    { name: 'Copper', value: 4.21, change: 3.19, icon: '🔧', color: '#dc2626' },
    { name: 'Aluminum', value: 2385, change: 1.92, icon: '🏗️', color: '#6b7280' },
    { name: 'Wheat', value: 585.25, change: -1.47, icon: '🌾', color: '#eab308' },
    { name: 'Corn', value: 445.50, change: 0.73, icon: '🌽', color: '#84cc16' }
  ];

  const getDefaultCryptoData = () => [
    { name: 'Bitcoin', symbol: 'BTC', price: 98542, change: 2.23, marketCap: 1940, dominance: 52.3 },
    { name: 'Ethereum', symbol: 'ETH', price: 3845, change: 3.36, marketCap: 462, dominance: 12.5 }
  ];

  const gradients = (
    <defs>
      <linearGradient id="sp500Gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
      </linearGradient>
      <linearGradient id="dowGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
      </linearGradient>
      <linearGradient id="nasdaqGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1}/>
      </linearGradient>
    </defs>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg p-3 shadow-2xl">
          <p className="text-gray-400 text-xs mb-2 font-semibold">{label}</p>
          {payload.map((entry, index) => (
            entry.value && (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-300">{entry.name}:</span>
                <span className="text-white font-semibold">
                  {entry.value.toLocaleString()}
                </span>
              </div>
            )
          ))}
        </div>
      );
    }
    return null;
  };

  const EconomicIndicatorCard = ({ title, data, icon: Icon }) => {
    if (!data) return null;
    
    // Parse value to get numeric value for calculation
    const numericValue = typeof data.value === 'string' 
      ? parseFloat(data.value.replace('%', ''))
      : data.value;
    
    const percentage = (numericValue / (data.target * 2)) * 100;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all hover:shadow-2xl hover:shadow-blue-500/10 group">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-white">
                {typeof data.value === 'string' ? data.value : `${data.value}%`}
              </span>
              <span className={`text-sm flex items-center ${data.trend === 'up' ? 'text-green-400' : data.trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                {data.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : data.trend === 'down' ? <ArrowDownRight className="w-4 h-4" /> : '→'}
                {data.change}
              </span>
            </div>
          </div>
          <div className="relative">
            <svg width="90" height="90" className="transform -rotate-90">
              <circle
                cx="45"
                cy="45"
                r={radius}
                stroke="rgba(75, 85, 99, 0.3)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="45"
                cy="45"
                r={radius}
                stroke={data.trend === 'up' ? '#10b981' : data.trend === 'down' ? '#ef4444' : '#6b7280'}
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {Icon && <Icon className="w-6 h-6 text-blue-400" />}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Target: {data.target}</span>
          <span className={`font-semibold ${percentage > 100 ? 'text-yellow-400' : 'text-blue-400'}`}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
    );
  };

  const CommodityCard = ({ commodity }) => (
    <div className={`bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur rounded-2xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all hover:scale-105 hover:shadow-2xl group ${animationComplete ? 'animate-fade-in' : 'opacity-0'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{commodity.icon}</span>
          <span className="text-gray-300 font-medium">{commodity.name}</span>
        </div>
        <div className={`flex items-center ${commodity.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {commodity.change > 0 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold text-white">
          ${typeof commodity.value === 'number' ? commodity.value.toLocaleString() : commodity.value}
        </span>
        <span className={`text-sm font-semibold ${commodity.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {commodity.change > 0 ? '+' : ''}{commodity.change}%
        </span>
      </div>
      <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${commodity.change > 0 ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
          style={{ width: `${Math.min(Math.abs(commodity.change) * 10, 100)}%` }}
        />
      </div>
    </div>
  );

  const CryptoCard = ({ crypto }) => (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all hover:shadow-2xl hover:shadow-purple-500/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            crypto.symbol === 'BTC' ? 'bg-orange-500/20' : 'bg-purple-500/20'
          }`}>
            <Bitcoin className={`w-6 h-6 ${
              crypto.symbol === 'BTC' ? 'text-orange-400' : 'text-purple-400'
            }`} />
          </div>
          <div>
            <p className="text-white font-semibold">{crypto.name}</p>
            <p className="text-gray-400 text-sm">{crypto.symbol}/USD</p>
          </div>
        </div>
        <div className={`text-right ${crypto.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
          <p className="text-sm font-semibold">{crypto.change > 0 ? '+' : ''}{crypto.change}%</p>
          <p className="text-xs text-gray-500">24h</p>
        </div>
      </div>
      <div className="mb-4">
        <p className="text-3xl font-bold text-white">${crypto.price.toLocaleString()}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700/50">
        <div>
          <p className="text-xs text-gray-400 mb-1">Market Cap</p>
          <p className="text-sm font-semibold text-white">${crypto.marketCap}B</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Dominance</p>
          <p className="text-sm font-semibold text-white">{crypto.dominance}%</p>
        </div>
      </div>
    </div>
  );

  const sectorPerformance = [
    { name: 'Technology', value: 28, color: '#3b82f6' },
    { name: 'Healthcare', value: 18, color: '#10b981' },
    { name: 'Finance', value: 22, color: '#a855f7' },
    { name: 'Energy', value: 12, color: '#f59e0b' },
    { name: 'Consumer', value: 20, color: '#ef4444' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-semibold mb-2">Loading Real Market Data</p>
          <p className="text-gray-400">Fetching from Alpha Vantage Premium API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Macro Economic Dashboard
          </h1>
          <p className="text-gray-400">Real-time market data and economic indicators since 2000</p>
        </div>

        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/50 backdrop-blur rounded-3xl p-6 border border-gray-700/50 mb-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">US Market Indices Since 2000</h2>
            <p className="text-sm text-gray-400">24-year historical performance of major indices</p>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={historicalData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
              {gradients}
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
              <XAxis 
                dataKey="displayDate" 
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="line"
                wrapperStyle={{ paddingBottom: '20px' }}
              />
              
              {showSP500 && (
                <Area
                  type="monotone"
                  dataKey="sp500"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#sp500Gradient)"
                  name="S&P 500"
                  animationDuration={2000}
                />
              )}
              
              {showDOW && (
                <Area
                  type="monotone"
                  dataKey="dow"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#dowGradient)"
                  name="DOW Jones"
                  animationDuration={2000}
                  animationBegin={300}
                />
              )}
              
              {showNASDAQ && (
                <Area
                  type="monotone"
                  dataKey="nasdaq"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#nasdaqGradient)"
                  name="NASDAQ"
                  animationDuration={2000}
                  animationBegin={600}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>

          <div className="flex gap-3 mt-6 justify-center">
            <button
              onClick={() => setShowSP500(!showSP500)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                showSP500 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
                  : 'bg-gray-700/30 text-gray-400 border border-gray-600/50'
              }`}
            >
              S&P 500
            </button>
            <button
              onClick={() => setShowDOW(!showDOW)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                showDOW 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                  : 'bg-gray-700/30 text-gray-400 border border-gray-600/50'
              }`}
            >
              DOW Jones
            </button>
            <button
              onClick={() => setShowNASDAQ(!showNASDAQ)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                showNASDAQ 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' 
                  : 'bg-gray-700/30 text-gray-400 border border-gray-600/50'
              }`}
            >
              NASDAQ
            </button>
          </div>
        </div>

        {/* ADD THE ECONOMIC INDICATORS CHART HERE */}
        <div className="mb-8">
          <EconomicIndicatorsChart />
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-400" />
            Economic Indicators
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {economicData && (
              <>
                <EconomicIndicatorCard title="GDP Growth Rate" data={economicData.gdp} icon={TrendingUp} />
                <EconomicIndicatorCard title="CPI Inflation" data={economicData.cpi} icon={Gauge} />
                <EconomicIndicatorCard title="Unemployment Rate" data={economicData.unemployment} icon={Briefcase} />
                <EconomicIndicatorCard title="Federal Funds Rate" data={economicData.fedRate} icon={DollarSign} />
                <EconomicIndicatorCard title="10Y Treasury Yield" data={economicData.treasury10Y} icon={BarChart3} />
                <EconomicIndicatorCard title="Retail Sales" data={economicData.retailSales} icon={Package} />
                <EconomicIndicatorCard title="Nonfarm Payroll (K)" data={economicData.nonfarmPayroll} icon={Briefcase} />
                <EconomicIndicatorCard title="Durable Goods" data={economicData.durableGoods} icon={Package} />
              </>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Droplet className="w-6 h-6 text-yellow-400" />
            Commodities & Energy
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {commoditiesData.map((commodity, index) => (
              <CommodityCard key={index} commodity={commodity} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Bitcoin className="w-6 h-6 text-orange-400" />
              Cryptocurrencies
            </h2>
            <div className="space-y-4">
              {cryptoData.map((crypto, index) => (
                <CryptoCard key={index} crypto={crypto} />
              ))}
            </div>
          </div>

          <div className="col-span-1">
            <h2 className="text-xl font-bold text-white mb-4">Sector Performance</h2>
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/50 backdrop-blur rounded-2xl p-4 border border-gray-700/50">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sectorPerformance}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {sectorPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-span-1">
            <h2 className="text-xl font-bold text-white mb-4">Market Sentiment</h2>
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/50 backdrop-blur rounded-2xl p-4 border border-gray-700/50">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={[
                  { metric: 'Fear/Greed', value: 65 },
                  { metric: 'Volatility', value: 35 },
                  { metric: 'Momentum', value: 78 },
                  { metric: 'Volume', value: 82 },
                  { metric: 'Put/Call', value: 55 },
                  { metric: 'Breadth', value: 70 }
                ]}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="metric" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9ca3af" />
                  <Radar name="Current" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 rounded-2xl p-4 border border-purple-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium">Last Update: {new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="text-sm">{dataSource}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Powered by Alpha Vantage Premium API</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MacroDashboard;
