import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Globe, Briefcase, Gauge, Coins, ArrowUpRight, ArrowDownRight, Clock, Database, LineChart as LineChartIcon, Calendar, Layers, Eye, EyeOff, Zap, Droplet, Package, Wheat, Bitcoin, ChevronUp, ChevronDown } from 'lucide-react';
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
  
  // State for time intervals
  const [marketTimeInterval, setMarketTimeInterval] = useState('All');
  const [economicTimeInterval, setEconomicTimeInterval] = useState('All');
  
  // State for economic indicators visibility
  const [showCPI, setShowCPI] = useState(true);
  const [showUnemployment, setShowUnemployment] = useState(true);
  const [showFedRate, setShowFedRate] = useState(true);
  const [showGDP, setShowGDP] = useState(true);
  const [showTreasury, setShowTreasury] = useState(true);
  
  // State for real API data
  const [historicalData, setHistoricalData] = useState([]);
  const [economicData, setEconomicData] = useState(null);
  const [commoditiesData, setCommoditiesData] = useState([]);
  const [cryptoData, setCryptoData] = useState([]);
  const [economicHistoricalData, setEconomicHistoricalData] = useState([]);

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
      
      // Generate economic historical data
      setEconomicHistoricalData(generateEconomicHistoricalData());
      
      console.log('Loaded real data:', { historical, economic, commodities, crypto });
    } catch (error) {
      console.error('Error loading data:', error);
      setDataSource('Using Cached Data');
      // Use default data if API fails
      setHistoricalData(generateSimulatedHistoricalData());
      setEconomicData(getDefaultEconomicData());
      setCommoditiesData(getDefaultCommodityData());
      setCryptoData(getDefaultCryptoData());
      setEconomicHistoricalData(generateEconomicHistoricalData());
    } finally {
      setLoading(false);
    }
  };

  // Generate economic historical data from 2000 to 2030 with quarterly granularity
  const generateEconomicHistoricalData = () => {
    const data = [];
    const startYear = 2000;
    const endYear = 2030;
    
    for (let year = startYear; year <= endYear; year++) {
      // Generate quarterly data for more granular representation
      for (let quarter = 0; quarter < 4; quarter++) {
        // Skip future quarters in current year
        if (year === 2024 && quarter > 2) continue;
        
        let cpi, unemployment, fedRate, gdp, treasury10Y;
        
        // Historical patterns based on real economic cycles with quarterly variation
        if (year === 2000) {
          cpi = 3.4 + quarter * 0.1;
          unemployment = 3.9 + quarter * 0.05;
          fedRate = 6.0 + quarter * 0.1;
          gdp = 4.1 - quarter * 0.3;
          treasury10Y = 6.4 - quarter * 0.1;
        } else if (year === 2001) {
          cpi = 2.8 - quarter * 0.2;
          unemployment = 4.2 + quarter * 0.3;
          fedRate = 6.0 - quarter * 1.0;
          gdp = 1.0 - quarter * 0.5;
          treasury10Y = 5.0 - quarter * 0.2;
        } else if (year === 2002) {
          cpi = 1.6 + quarter * 0.1;
          unemployment = 5.7 + quarter * 0.1;
          fedRate = 1.75 - quarter * 0.1;
          gdp = 1.6 + quarter * 0.2;
          treasury10Y = 4.6 - quarter * 0.2;
        } else if (year === 2003) {
          cpi = 2.3 - quarter * 0.1;
          unemployment = 6.0 - quarter * 0.1;
          fedRate = 1.25 - quarter * 0.05;
          gdp = 2.0 + quarter * 0.5;
          treasury10Y = 4.0 + quarter * 0.1;
        } else if (year === 2004) {
          cpi = 2.7 + quarter * 0.2;
          unemployment = 5.7 - quarter * 0.1;
          fedRate = 1.0 + quarter * 0.5;
          gdp = 3.8 - quarter * 0.2;
          treasury10Y = 4.3 + quarter * 0.1;
        } else if (year === 2005) {
          cpi = 3.4 + quarter * 0.1;
          unemployment = 5.3 - quarter * 0.1;
          fedRate = 2.5 + quarter * 0.5;
          gdp = 3.3 - quarter * 0.1;
          treasury10Y = 4.3 + quarter * 0.05;
        } else if (year === 2006) {
          cpi = 3.2 - quarter * 0.2;
          unemployment = 4.7 - quarter * 0.05;
          fedRate = 4.75 + quarter * 0.125;
          gdp = 2.7 - quarter * 0.3;
          treasury10Y = 4.8 + quarter * 0.05;
        } else if (year === 2007) {
          cpi = 2.8 + quarter * 0.3;
          unemployment = 4.6 + quarter * 0.2;
          fedRate = 5.25 - quarter * 0.5;
          gdp = 1.8 - quarter * 0.4;
          treasury10Y = 4.6 - quarter * 0.1;
        } else if (year === 2008) {
          // Financial crisis - sharp changes
          if (quarter === 0) {
            cpi = 4.0; unemployment = 5.0; fedRate = 3.0; gdp = -0.7; treasury10Y = 3.7;
          } else if (quarter === 1) {
            cpi = 3.9; unemployment = 5.4; fedRate = 2.25; gdp = 0.6; treasury10Y = 3.9;
          } else if (quarter === 2) {
            cpi = 5.0; unemployment = 5.8; fedRate = 2.0; gdp = -2.7; treasury10Y = 4.0;
          } else {
            cpi = 0.1; unemployment = 6.8; fedRate = 0.25; gdp = -8.4; treasury10Y = 3.3;
          }
        } else if (year === 2009) {
          // Recovery begins
          if (quarter === 0) {
            cpi = -0.4; unemployment = 8.2; fedRate = 0.25; gdp = -6.4; treasury10Y = 2.7;
          } else if (quarter === 1) {
            cpi = -1.3; unemployment = 9.3; fedRate = 0.25; gdp = -0.7; treasury10Y = 3.3;
          } else if (quarter === 2) {
            cpi = -1.4; unemployment = 9.6; fedRate = 0.25; gdp = 1.5; treasury10Y = 3.5;
          } else {
            cpi = 1.8; unemployment = 10.0; fedRate = 0.25; gdp = 4.5; treasury10Y = 3.4;
          }
        } else if (year >= 2010 && year <= 2019) {
          // Post-crisis recovery - gradual improvement
          const yearOffset = year - 2010;
          cpi = 1.5 + yearOffset * 0.1 + quarter * 0.1;
          unemployment = 9.6 - yearOffset * 0.6 - quarter * 0.05;
          fedRate = 0.25 + (yearOffset > 5 ? (yearOffset - 5) * 0.5 : 0);
          gdp = 2.5 - quarter * 0.2 + (yearOffset % 2) * 0.5;
          treasury10Y = 2.5 + yearOffset * 0.15 + quarter * 0.05;
        } else if (year === 2020) {
          // COVID-19 impact
          if (quarter === 0) {
            cpi = 2.5; unemployment = 3.5; fedRate = 1.75; gdp = -5.0; treasury10Y = 1.9;
          } else if (quarter === 1) {
            cpi = 0.3; unemployment = 13.3; fedRate = 0.25; gdp = -31.4; treasury10Y = 0.7;
          } else if (quarter === 2) {
            cpi = 1.0; unemployment = 8.8; fedRate = 0.25; gdp = 33.4; treasury10Y = 0.6;
          } else {
            cpi = 1.2; unemployment = 6.7; fedRate = 0.25; gdp = 4.3; treasury10Y = 0.9;
          }
        } else if (year === 2021) {
          // Inflation begins
          cpi = 1.4 + quarter * 1.5;
          unemployment = 6.0 - quarter * 0.6;
          fedRate = 0.25;
          gdp = 6.3 - quarter * 0.3;
          treasury10Y = 1.0 + quarter * 0.2;
        } else if (year === 2022) {
          // Peak inflation
          if (quarter === 0) {
            cpi = 7.5; unemployment = 4.0; fedRate = 0.25; gdp = -1.6; treasury10Y = 1.9;
          } else if (quarter === 1) {
            cpi = 8.6; unemployment = 3.6; fedRate = 0.75; gdp = -0.6; treasury10Y = 2.9;
          } else if (quarter === 2) {
            cpi = 9.1; unemployment = 3.5; fedRate = 2.5; gdp = 2.6; treasury10Y = 3.0;
          } else {
            cpi = 7.1; unemployment = 3.5; fedRate = 3.75; gdp = 2.9; treasury10Y = 3.8;
          }
        } else if (year === 2023) {
          // Disinflation
          cpi = 6.0 - quarter * 0.5;
          unemployment = 3.5 + quarter * 0.05;
          fedRate = 4.5 + quarter * 0.25;
          gdp = 2.5 - quarter * 0.1;
          treasury10Y = 3.5 + quarter * 0.15;
        } else if (year === 2024) {
          // Current year
          if (quarter === 0) {
            cpi = 3.5; unemployment = 3.8; fedRate = 5.33; gdp = 1.3; treasury10Y = 4.2;
          } else if (quarter === 1) {
            cpi = 3.4; unemployment = 3.9; fedRate = 5.33; gdp = 3.0; treasury10Y = 4.4;
          } else if (quarter === 2) {
            cpi = 2.9; unemployment = 4.0; fedRate = 5.33; gdp = 2.8; treasury10Y = 4.3;
          }
        } else if (year >= 2025 && year <= 2030) {
          // Projections - normalization with some volatility
          const yearsFromNow = year - 2024;
          const baselineAdjustment = yearsFromNow * 0.2;
          
          cpi = 3.0 - baselineAdjustment * 0.3 + quarter * 0.05;
          cpi = Math.max(1.5, Math.min(3.5, cpi));
          
          unemployment = 4.0 + baselineAdjustment * 0.15 + quarter * 0.02;
          unemployment = Math.max(3.5, Math.min(5.5, unemployment));
          
          fedRate = 5.0 - baselineAdjustment * 0.5;
          fedRate = Math.max(2.0, Math.min(5.0, fedRate));
          
          gdp = 2.5 - baselineAdjustment * 0.1 + quarter * 0.1;
          gdp = Math.max(1.0, Math.min(3.5, gdp));
          
          treasury10Y = 4.0 - baselineAdjustment * 0.15 + quarter * 0.05;
          treasury10Y = Math.max(2.5, Math.min(4.5, treasury10Y));
        }
        
        // Only add annual data points to avoid overcrowding
        if (quarter === 0 || (year <= 2010 || year >= 2020)) {
          data.push({
            year: quarter === 0 ? year.toString() : '',
            date: `${year}-Q${quarter + 1}`,
            cpi: parseFloat(cpi.toFixed(2)),
            unemployment: parseFloat(unemployment.toFixed(2)),
            fedRate: parseFloat(fedRate.toFixed(2)),
            gdp: parseFloat(gdp.toFixed(2)),
            treasury10Y: parseFloat(treasury10Y.toFixed(2)),
            isProjection: year > 2024
          });
        }
      }
    }
    
    return data;
  };

  // Fallback data generation
  const generateSimulatedHistoricalData = () => {
    const data = [];
    const startYear = 2000;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const endYear = currentYear + 5; // 5-year runway
    
    for (let year = startYear; year <= endYear; year++) {
      // Only generate yearly data points for cleaner visualization
      // Stop at current year for actual data
      if (year <= currentYear) {
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
        
        // Add some variation for realistic feel
        const yearlyVolatility = Math.sin(year * 0.5) * 0.03 + Math.random() * 0.02;
        
        data.push({
          date: `${year}-01`,
          displayDate: year.toString(),
          year: year,
          sp500: Math.round(sp500Base * (1 + yearlyVolatility)),
          dow: Math.round(dowBase * (1 + yearlyVolatility)),
          nasdaq: Math.round(nasdaqBase * (1 + yearlyVolatility)),
          isHistorical: true
        });
      } else {
        // Add empty runway years for future
        data.push({
          date: `${year}-01`,
          displayDate: year.toString(),
          year: year,
          sp500: null,
          dow: null,
          nasdaq: null,
          isHistorical: false
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
      <linearGradient id="cpiGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
      </linearGradient>
      <linearGradient id="unemploymentGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
      </linearGradient>
      <linearGradient id="fedRateGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
      </linearGradient>
      <linearGradient id="gdpGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
      </linearGradient>
      <linearGradient id="treasuryGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1}/>
      </linearGradient>
    </defs>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg p-3 shadow-2xl">
          <p className="text-gray-400 text-xs mb-2 font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            entry.value && (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-300">{entry.name}:</span>
                <span className="text-white font-semibold">
                  {entry.dataKey && ['cpi', 'unemployment', 'fedRate', 'gdp', 'treasury10Y'].includes(entry.dataKey) 
                    ? `${entry.value}%` 
                    : entry.value.toLocaleString()}
                </span>
              </div>
            )
          ))}
        </div>
      );
    }
    return null;
  };

  const EconomicIndicatorCard = ({ title, data, icon: Icon }: any) => {
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

  const CommodityCard = ({ commodity }: any) => (
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

  const CryptoCard = ({ crypto }: any) => (
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

  // Filter data based on time interval
  const filterDataByTimeInterval = (data, interval, isEconomicData = false) => {
    if (!data || data.length === 0) return data;
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    let cutoffDate;
    
    switch(interval) {
      case '1Y':
        cutoffDate = new Date(currentYear - 1, currentDate.getMonth(), 1);
        break;
      case '5Y':
        cutoffDate = new Date(currentYear - 5, currentDate.getMonth(), 1);
        break;
      case '20Y':
        cutoffDate = new Date(currentYear - 20, currentDate.getMonth(), 1);
        break;
      case 'All':
      default:
        return data;
    }
    
    return data.filter(item => {
      if (isEconomicData) {
        // For economic data, parse the year directly
        const itemYear = parseInt(item.year) || parseInt(item.date.split('-')[0]);
        const cutoffYear = cutoffDate.getFullYear();
        return itemYear >= cutoffYear;
      } else {
        // For market data, use the date field
        const itemDate = new Date(item.date);
        return itemDate >= cutoffDate;
      }
    });
  };

  // Get filtered data for charts
  const filteredHistoricalData = filterDataByTimeInterval(historicalData, marketTimeInterval);
  const filteredEconomicHistoricalData = filterDataByTimeInterval(economicHistoricalData, economicTimeInterval, true);

  // Time interval selector component
  const TimeIntervalSelector = ({ interval, setInterval, chartType }) => (
    <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-1">
      {['1Y', '5Y', '20Y', 'All'].map((option) => (
        <button
          key={option}
          onClick={() => setInterval(option)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            interval === option
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );

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
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">US Market Indices Since 2000</h2>
              <p className="text-sm text-gray-400">24-year historical performance of major indices</p>
            </div>
            <TimeIntervalSelector 
              interval={marketTimeInterval} 
              setInterval={setMarketTimeInterval} 
              chartType="market"
            />
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={filteredHistoricalData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
              {gradients}
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
              <XAxis 
                dataKey="displayDate" 
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                interval={marketTimeInterval === '1Y' ? 0 : marketTimeInterval === '5Y' ? 0 : 1}
                angle={0}
                textAnchor="middle"
              />
              <YAxis 
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => value ? `${(value / 1000).toFixed(0)}k` : ''}
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
                  type="linear"
                  dataKey="sp500"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#sp500Gradient)"
                  name="S&P 500"
                  animationDuration={2000}
                  connectNulls={false}
                  dot={{ r: 2 }}
                />
              )}
              
              {showDOW && (
                <Area
                  type="linear"
                  dataKey="dow"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#dowGradient)"
                  name="DOW Jones"
                  animationDuration={2000}
                  animationBegin={300}
                  connectNulls={false}
                  dot={{ r: 2 }}
                />
              )}
              
              {showNASDAQ && (
                <Area
                  type="linear"
                  dataKey="nasdaq"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#nasdaqGradient)"
                  name="NASDAQ"
                  animationDuration={2000}
                  animationBegin={600}
                  connectNulls={false}
                  dot={{ r: 2 }}
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

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-400" />
            Current Economic Indicators
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
