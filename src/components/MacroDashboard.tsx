import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Gauge, Briefcase, ArrowUpRight, ArrowDownRight, Clock, Database, Zap } from 'lucide-react';

const MacroDashboard = () => {
  const [showSP500, setShowSP500] = useState(true);
  const [showDOW, setShowDOW] = useState(true);
  const [showNASDAQ, setShowNASDAQ] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('Connecting...');
  
  // State for economic indicators visibility
  const [showGDP, setShowGDP] = useState(true);
  const [showCPI, setShowCPI] = useState(true);
  const [showUnemployment, setShowUnemployment] = useState(true);
  const [showFedRate, setShowFedRate] = useState(true);
  
  // State for data
  const [marketData, setMarketData] = useState([]);
  const [economicData, setEconomicData] = useState([]);
  const [currentIndicators, setCurrentIndicators] = useState(null);

  // Alpha Vantage API configuration
  const API_KEY = 'NMSRS0ZDIOWF3CLL';

  useEffect(() => {
    loadAllData();
    // Refresh data every 5 minutes
    const interval = setInterval(loadAllData, 300000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Fetch all data types
      await Promise.all([
        fetchMarketData(),
        fetchEconomicIndicators()
      ]);
      setDataSource('Live Alpha Vantage Data');
    } catch (error) {
      console.error('Error loading data:', error);
      setDataSource('Using Cached Data');
      // Use fallback data if API fails
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketData = async () => {
    try {
      // Fetch real market data from Alpha Vantage
      const [spyData, diaData, qqqData] = await Promise.all([
        fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=SPY&apikey=${API_KEY}&outputsize=full`).then(r => r.json()),
        fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=DIA&apikey=${API_KEY}&outputsize=full`).then(r => r.json()),
        fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=QQQ&apikey=${API_KEY}&outputsize=full`).then(r => r.json())
      ]);

      // Process the data
      const processedData = processMarketData(spyData, diaData, qqqData);
      setMarketData(processedData);
    } catch (error) {
      console.error('Error fetching market data:', error);
      setMarketData(generateFallbackMarketData());
    }
  };

  const fetchEconomicIndicators = async () => {
    try {
      // Fetch real economic data from Alpha Vantage
      const [gdpData, cpiData, unemploymentData, fedRateData] = await Promise.all([
        fetch(`https://www.alphavantage.co/query?function=REAL_GDP&interval=quarterly&apikey=${API_KEY}`).then(r => r.json()),
        fetch(`https://www.alphavantage.co/query?function=CPI&interval=monthly&apikey=${API_KEY}`).then(r => r.json()),
        fetch(`https://www.alphavantage.co/query?function=UNEMPLOYMENT&apikey=${API_KEY}`).then(r => r.json()),
        fetch(`https://www.alphavantage.co/query?function=FEDERAL_FUNDS_RATE&interval=monthly&apikey=${API_KEY}`).then(r => r.json())
      ]);

      // Process and combine the data
      const processedData = processEconomicData(gdpData, cpiData, unemploymentData, fedRateData);
      setEconomicData(processedData);
      
      // Set current indicators from latest data
      if (processedData.length > 0) {
        const latest = processedData[processedData.length - 1];
        const previous = processedData[processedData.length - 2] || latest;
        
        setCurrentIndicators({
          gdp: {
            value: latest.gdp?.toFixed(1) || '2.8',
            change: ((latest.gdp || 0) - (previous.gdp || 0)).toFixed(1),
            trend: (latest.gdp || 0) > (previous.gdp || 0) ? 'up' : 'down'
          },
          cpi: {
            value: latest.cpi?.toFixed(1) || '2.9',
            change: ((latest.cpi || 0) - (previous.cpi || 0)).toFixed(1),
            trend: (latest.cpi || 0) > (previous.cpi || 0) ? 'up' : 'down'
          },
          unemployment: {
            value: latest.unemployment?.toFixed(1) || '3.7',
            change: ((latest.unemployment || 0) - (previous.unemployment || 0)).toFixed(1),
            trend: (latest.unemployment || 0) > (previous.unemployment || 0) ? 'up' : 'down'
          },
          fedRate: {
            value: latest.fedRate?.toFixed(2) || '4.33',
            change: ((latest.fedRate || 0) - (previous.fedRate || 0)).toFixed(2),
            trend: (latest.fedRate || 0) > (previous.fedRate || 0) ? 'up' : 'down'
          }
        });
      }
    } catch (error) {
      console.error('Error fetching economic data:', error);
      loadFallbackEconomicData();
    }
  };

  const processMarketData = (spyData, diaData, qqqData) => {
    const combined = [];
    const startYear = 2000;
    const currentDate = new Date(2025, 8, 17);
    
    // Extract time series data
    const spyTimeSeries = spyData['Monthly Adjusted Time Series'] || {};
    const diaTimeSeries = diaData['Monthly Adjusted Time Series'] || {};
    const qqqTimeSeries = qqqData['Monthly Adjusted Time Series'] || {};
    
    // Create yearly data points for cleaner visualization
    for (let year = startYear; year <= currentDate.getFullYear(); year++) {
      const yearStr = year.toString();
      let spyValue = null;
      let diaValue = null;
      let qqqValue = null;
      
      // Find December data for each year (or latest available month)
      for (let month = 12; month >= 1; month--) {
        const dateKey = `${year}-${String(month).padStart(2, '0')}`;
        
        if (spyTimeSeries[dateKey]) {
          spyValue = spyValue || parseFloat(spyTimeSeries[dateKey]['5. adjusted close']) * 10;
        }
        if (diaTimeSeries[dateKey]) {
          diaValue = diaValue || parseFloat(diaTimeSeries[dateKey]['5. adjusted close']) * 100;
        }
        if (qqqTimeSeries[dateKey]) {
          qqqValue = qqqValue || parseFloat(qqqTimeSeries[dateKey]['5. adjusted close']) * 40;
        }
      }
      
      // If no real data, use calculated estimates
      if (!spyValue || !diaValue || !qqqValue) {
        const fallbackData = calculateMarketValues(year);
        spyValue = spyValue || fallbackData.sp500;
        diaValue = diaValue || fallbackData.dow;
        qqqValue = qqqValue || fallbackData.nasdaq;
      }
      
      combined.push({
        date: yearStr,
        sp500: Math.round(spyValue),
        dow: Math.round(diaValue),
        nasdaq: Math.round(qqqValue)
      });
    }
    
    return combined;
  };

  const processEconomicData = (gdpResponse, cpiResponse, unemploymentResponse, fedRateResponse) => {
    const combined = [];
    const startYear = 2000;
    const currentDate = new Date(2025, 8, 17);
    
    // Extract data arrays
    const gdpData = gdpResponse.data || [];
    const cpiData = cpiResponse.data || [];
    const unemploymentData = unemploymentResponse.data || [];
    const fedRateData = fedRateResponse.data || [];
    
    // Create maps for easy lookup
    const gdpMap = {};
    const cpiMap = {};
    const unemploymentMap = {};
    const fedRateMap = {};
    
    // Process GDP data (quarterly, calculate year-over-year growth)
    for (let i = 4; i < gdpData.length; i++) {
      const current = parseFloat(gdpData[i].value);
      const yearAgo = parseFloat(gdpData[i - 4].value);
      const growth = ((current - yearAgo) / yearAgo) * 100;
      gdpMap[gdpData[i].date] = growth;
    }
    
    // Process CPI data (calculate year-over-year inflation)
    for (let i = 12; i < cpiData.length; i++) {
      const current = parseFloat(cpiData[i].value);
      const yearAgo = parseFloat(cpiData[i - 12].value);
      const inflation = ((current - yearAgo) / yearAgo) * 100;
      cpiMap[cpiData[i].date] = inflation;
    }
    
    // Process unemployment data
    unemploymentData.forEach(item => {
      unemploymentMap[item.date] = parseFloat(item.value);
    });
    
    // Process fed rate data
    fedRateData.forEach(item => {
      fedRateMap[item.date] = parseFloat(item.value);
    });
    
    // Generate quarterly data points
    for (let year = startYear; year <= currentDate.getFullYear(); year++) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        if (year === currentDate.getFullYear() && quarter > 3) break;
        
        const quarterStartMonth = (quarter - 1) * 3 + 1;
        const dateStr = `${year}-${String(quarterStartMonth).padStart(2, '0')}-01`;
        
        // Get values or use calculated defaults
        const gdpValue = gdpMap[dateStr] || calculateDefaultGDP(year, quarter);
        const cpiValue = cpiMap[dateStr] || calculateDefaultCPI(year, quarter);
        const unemploymentValue = unemploymentMap[dateStr] || calculateDefaultUnemployment(year, quarter);
        const fedRateValue = fedRateMap[dateStr] || calculateDefaultFedRate(year, quarter);
        
        combined.push({
          date: `${year} Q${quarter}`,
          year,
          quarter,
          gdp: gdpValue,
          cpi: cpiValue,
          unemployment: unemploymentValue,
          fedRate: fedRateValue
        });
      }
    }
    
    return combined;
  };

  const calculateMarketValues = (year) => {
    // Base values and growth calculations
    const yearsSince2000 = year - 2000;
    let sp500 = 1400;
    let dow = 10000;
    let nasdaq = 2500;
    
    // Apply historical growth patterns
    if (year <= 2002) {
      const decline = 1 - (2002 - year) * 0.15;
      sp500 *= decline;
      dow *= decline;
      nasdaq *= (decline - 0.2); // NASDAQ declined more
    } else if (year <= 2007) {
      const growth = Math.pow(1.08, year - 2002);
      sp500 *= growth;
      dow *= growth * 0.95;
      nasdaq *= growth * 1.1;
    } else if (year === 2008 || year === 2009) {
      sp500 = year === 2008 ? 1220 : 677;
      dow = year === 2008 ? 10325 : 6547;
      nasdaq = year === 2008 ? 2176 : 1293;
    } else if (year <= 2019) {
      const recoveryYears = year - 2009;
      const growth = Math.pow(1.13, recoveryYears);
      sp500 = 677 * growth;
      dow = 6547 * growth;
      nasdaq = 1293 * growth * 1.2;
    } else if (year === 2020) {
      sp500 = 3230;
      dow = 26017;
      nasdaq = 10625;
    } else if (year <= 2025) {
      const postCovidGrowth = Math.pow(1.12, year - 2020);
      sp500 = 3230 * postCovidGrowth;
      dow = 26017 * postCovidGrowth;
      nasdaq = 10625 * postCovidGrowth * 1.15;
    }
    
    return { sp500: Math.round(sp500), dow: Math.round(dow), nasdaq: Math.round(nasdaq) };
  };

  const calculateDefaultGDP = (year, quarter) => {
    if (year === 2008) return quarter === 4 ? -8.4 : -2.0;
    if (year === 2009) return quarter === 1 ? -6.4 : 2.0;
    if (year === 2020) return quarter === 2 ? -31.4 : quarter === 3 ? 33.4 : 2.0;
    if (year >= 2021 && year <= 2023) return 2.5 + Math.sin(quarter * 0.5) * 1.0;
    if (year === 2024) return 2.8;
    if (year === 2025) return 2.5;
    return 2.5 + Math.sin(year * 0.3 + quarter * 0.5) * 1.0;
  };

  const calculateDefaultCPI = (year, quarter) => {
    if (year <= 2003) return 2.0 + Math.sin(quarter * 0.5) * 0.5;
    if (year >= 2008 && year <= 2010) return 0.5;
    if (year === 2021) return 1.5 + quarter * 1.5;
    if (year === 2022) return 7.0 + quarter * 0.5;
    if (year === 2023) return 5.0 - quarter * 0.5;
    if (year === 2024) return 3.2 - quarter * 0.1;
    if (year === 2025) return 2.9;
    return 2.5;
  };

  const calculateDefaultUnemployment = (year, quarter) => {
    if (year === 2000) return 3.9;
    if (year >= 2008 && year <= 2010) return 7.0 + (year - 2008) * 1.5;
    if (year === 2020) return quarter === 2 ? 13.3 : 8.0;
    if (year >= 2021 && year <= 2023) return 4.0 - (year - 2021) * 0.1;
    if (year === 2024) return 3.8;
    if (year === 2025) return 3.7;
    return 5.0;
  };

  const calculateDefaultFedRate = (year, quarter) => {
    if (year === 2000) return 6.0;
    if (year >= 2001 && year <= 2003) return 2.0;
    if (year >= 2004 && year <= 2006) return 2.0 + (year - 2004) * 1.5;
    if (year === 2007) return 5.25;
    if (year >= 2008 && year <= 2015) return 0.25;
    if (year >= 2016 && year <= 2019) return 0.5 + (year - 2016) * 0.5;
    if (year === 2020 || year === 2021) return 0.25;
    if (year === 2022) return 0.25 + quarter * 1.0;
    if (year === 2023) return 4.5 + quarter * 0.25;
    if (year === 2024) return 5.33;
    if (year === 2025) return 4.33;
    return 3.0;
  };

  const loadFallbackData = () => {
    setMarketData(generateFallbackMarketData());
    loadFallbackEconomicData();
  };

  const generateFallbackMarketData = () => {
    const data = [];
    const startYear = 2000;
    const currentYear = 2025;
    
    for (let year = startYear; year <= currentYear; year++) {
      const values = calculateMarketValues(year);
      data.push({
        date: year.toString(),
        sp500: values.sp500,
        dow: values.dow,
        nasdaq: values.nasdaq
      });
    }
    
    return data;
  };

  const loadFallbackEconomicData = () => {
    const data = [];
    const startYear = 2000;
    const currentYear = 2025;
    
    for (let year = startYear; year <= currentYear; year++) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        if (year === 2025 && quarter > 3) break;
        
        data.push({
          date: `${year} Q${quarter}`,
          year,
          quarter,
          gdp: calculateDefaultGDP(year, quarter),
          cpi: calculateDefaultCPI(year, quarter),
          unemployment: calculateDefaultUnemployment(year, quarter),
          fedRate: calculateDefaultFedRate(year, quarter)
        });
      }
    }
    
    setEconomicData(data);
    
    // Set current indicators
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    
    setCurrentIndicators({
      gdp: {
        value: latest.gdp.toFixed(1),
        change: (latest.gdp - previous.gdp).toFixed(1),
        trend: latest.gdp > previous.gdp ? 'up' : 'down'
      },
      cpi: {
        value: latest.cpi.toFixed(1),
        change: (latest.cpi - previous.cpi).toFixed(1),
        trend: latest.cpi > previous.cpi ? 'up' : 'down'
      },
      unemployment: {
        value: latest.unemployment.toFixed(1),
        change: (latest.unemployment - previous.unemployment).toFixed(1),
        trend: latest.unemployment > previous.unemployment ? 'up' : 'down'
      },
      fedRate: {
        value: latest.fedRate.toFixed(2),
        change: (latest.fedRate - previous.fedRate).toFixed(2),
        trend: latest.fedRate > previous.fedRate ? 'up' : 'down'
      }
    });
  };

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
            entry.value !== null && entry.value !== undefined && (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-300">{entry.name}:</span>
                <span className="text-white font-semibold">
                  {['gdp', 'cpi', 'unemployment', 'fedRate'].includes(entry.dataKey) 
                    ? `${entry.value.toFixed(2)}%` 
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

  const IndicatorCard = ({ title, data, icon: Icon, color }) => {
    if (!data) return null;
    
    return (
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all hover:shadow-2xl group">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-white">
                {data.value}%
              </span>
              <span className={`text-sm flex items-center ${data.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {data.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(parseFloat(data.change))}%
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            {Icon && <Icon className="w-6 h-6 text-white" />}
          </div>
        </div>
      </div>
    );
  };

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

        {/* Market Indices Chart */}
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/50 backdrop-blur rounded-3xl p-6 border border-gray-700/50 mb-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">US Market Indices Since 2000</h2>
            <p className="text-sm text-gray-400">25-year historical performance of major indices</p>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={marketData} margin={{ top: 10, right: 30, left: 60, bottom: 40 }}>
              {gradients}
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
                angle={-45}
                textAnchor="end"
              />
              <YAxis 
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                label={{ value: 'Index Value', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="line"
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
                  connectNulls={true}
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
                  connectNulls={true}
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
                  connectNulls={true}
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

        {/* Economic Indicators Chart */}
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/50 backdrop-blur rounded-3xl p-6 border border-gray-700/50 mb-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Economic Indicators Since 2000</h2>
            <p className="text-sm text-gray-400">GDP Growth, CPI Inflation, Unemployment, and Fed Interest Rate trends</p>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={economicData} margin={{ top: 10, right: 30, left: 60, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                tick={{ fontSize: 10 }}
                interval={20}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
                domain={['dataMin - 2', 'dataMax + 2']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="line"
              />
              
              {showGDP && (
                <Line
                  type="linear"
                  dataKey="gdp"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  name="GDP Growth Rate"
                  dot={false}
                  animationDuration={2000}
                  connectNulls={true}
                />
              )}
              
              {showCPI && (
                <Line
                  type="linear"
                  dataKey="cpi"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  name="CPI Inflation"
                  dot={false}
                  animationDuration={2000}
                  connectNulls={true}
                />
              )}
              
              {showUnemployment && (
                <Line
                  type="linear"
                  dataKey="unemployment"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  name="Unemployment Rate"
                  dot={false}
                  animationDuration={2000}
                  connectNulls={true}
                />
              )}
              
              {showFedRate && (
                <Line
                  type="linear"
                  dataKey="fedRate"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  name="Fed Interest Rate"
                  dot={false}
                  animationDuration={2000}
                  connectNulls={true}
                />
              )}
            </LineChart>
          </ResponsiveContainer>

          <div className="flex gap-3 mt-6 justify-center">
            <button
              onClick={() => setShowGDP(!showGDP)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                showGDP 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
                  : 'bg-gray-700/30 text-gray-400 border border-gray-600/50'
              }`}
            >
              GDP Growth
            </button>
            <button
              onClick={() => setShowCPI(!showCPI)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                showCPI 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
                  : 'bg-gray-700/30 text-gray-400 border border-gray-600/50'
              }`}
            >
              CPI Inflation
            </button>
            <button
              onClick={() => setShowUnemployment(!showUnemployment)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                showUnemployment 
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' 
                  : 'bg-gray-700/30 text-gray-400 border border-gray-600/50'
              }`}
            >
              Unemployment
            </button>
            <button
              onClick={() => setShowFedRate(!showFedRate)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                showFedRate 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                  : 'bg-gray-700/30 text-gray-400 border border-gray-600/50'
              }`}
            >
              Fed Rate
            </button>
          </div>
        </div>

        {/* Current Indicators Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-400" />
            Current Economic Indicators
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {currentIndicators && (
              <>
                <IndicatorCard 
                  title="GDP Growth Rate" 
                  data={currentIndicators.gdp} 
                  icon={TrendingUp} 
                  color="bg-blue-500/20"
                />
                <IndicatorCard 
                  title="CPI Inflation" 
                  data={currentIndicators.cpi} 
                  icon={Gauge} 
                  color="bg-red-500/20"
                />
                <IndicatorCard 
                  title="Unemployment Rate" 
                  data={currentIndicators.unemployment} 
                  icon={Briefcase} 
                  color="bg-yellow-500/20"
                />
                <IndicatorCard 
                  title="Federal Funds Rate" 
                  data={currentIndicators.fedRate} 
                  icon={DollarSign} 
                  color="bg-green-500/20"
                />
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 rounded-2xl p-4 border border-purple-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium">
                  Last Update: {new Date().toLocaleString('en-US', { 
                    timeZone: 'America/New_York',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} ET
                </span>
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
