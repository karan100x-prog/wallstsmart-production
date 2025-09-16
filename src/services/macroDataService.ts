import axios from 'axios';

const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY || 'NMSRS0ZDIOWF3CLL';
const BASE_URL = 'https://www.alphavantage.co/query';

// Batch fetching
const BATCH_DELAY = 200; // 200ms between batch requests

const batchFetch = async (requests) => {
  const results = [];
  for (const request of requests) {
    results.push(await request());
    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
  }
  return results;
};

// Cache management
const cache = new Map();
const CACHE_DURATION = {
  REALTIME: 15000,      // 15 seconds
  INTRADAY: 60000,      // 1 minute
  DAILY: 300000,        // 5 minutes
  ECONOMIC: 3600000,    // 1 hour
  HISTORICAL: 86400000  // 24 hours
};

const getCachedData = (key, duration) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < duration) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Fetch historical market data (24 years)
export const fetchHistoricalMarketData = async () => {
  const cacheKey = 'historical_market_data';
  const cachedData = getCachedData(cacheKey, CACHE_DURATION.HISTORICAL);
  
  if (cachedData) {
    return cachedData;
  }

  try {
    const [spyResponse, diaResponse, qqqResponse] = await Promise.all([
      axios.get(`${BASE_URL}?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=SPY&outputsize=full&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=DIA&outputsize=full&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=QQQ&outputsize=full&apikey=${API_KEY}`)
    ]);

    const spyData = spyResponse.data['Monthly Adjusted Time Series'] || {};
    const diaData = diaResponse.data['Monthly Adjusted Time Series'] || {};
    const qqqData = qqqResponse.data['Monthly Adjusted Time Series'] || {};

    const historicalData = [];
    const startYear = 2000;
    const currentYear = new Date().getFullYear();

    // Process data for each month since 2000
    Object.keys(spyData).forEach(date => {
      const year = parseInt(date.split('-')[0]);
      const month = parseInt(date.split('-')[1]);
      
      if (year >= startYear && year <= currentYear) {
        historicalData.push({
          date,
          displayDate: month === 1 ? year.toString() : '',
          year,
          sp500: parseFloat(spyData[date]?.['4. close'] || '0') * 10, // SPY to S&P conversion
          dow: parseFloat(diaData[date]?.['4. close'] || '0') * 100, // DIA to DOW conversion
          nasdaq: parseFloat(qqqData[date]?.['4. close'] || '0') * 40  // QQQ to NASDAQ approximation
        });
      }
    });

    // Sort by date
    historicalData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    setCachedData(cacheKey, historicalData);
    return historicalData;

  } catch (error) {
    console.error('Error fetching historical market data:', error);
    // Return simulated data as fallback
    return generateSimulatedHistoricalData();
  }
};

// Generate simulated historical data as fallback
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
      
      // Historical market events simulation
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

// Enhanced macro data fetching with batch support
export const fetchAndProcessMacroData = async () => {
  try {
    const [gdpResponse, cpiResponse, unemploymentResponse, fedRateResponse, treasuryResponse, retailResponse, nonfarmResponse, durablesResponse] = await Promise.all([
      axios.get(`${BASE_URL}?function=REAL_GDP&interval=quarterly&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=CPI&interval=monthly&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=UNEMPLOYMENT&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=FEDERAL_FUNDS_RATE&interval=daily&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=TREASURY_YIELD&interval=daily&maturity=10year&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=RETAIL_SALES&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=NONFARM_PAYROLL&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=DURABLES&apikey=${API_KEY}`)
    ]);

    // Process all economic indicators
    const gdp = processEconomicData(gdpResponse.data, 'GDP');
    const cpi = processEconomicData(cpiResponse.data, 'CPI');
    const unemployment = processEconomicData(unemploymentResponse.data, 'UNEMPLOYMENT');
    const fedRate = processEconomicData(fedRateResponse.data, 'FED_RATE');
    const treasury10Y = processEconomicData(treasuryResponse.data, 'TREASURY');
    const retailSales = processEconomicData(retailResponse.data, 'RETAIL');
    const nonfarmPayroll = processEconomicData(nonfarmResponse.data, 'NONFARM');
    const durableGoods = processEconomicData(durablesResponse.data, 'DURABLES');

    // Calculate Real Interest Rate
    const fedRateNum = parseFloat(fedRate.value.replace('%', ''));
    const inflationNum = parseFloat(cpi.value.replace('%', ''));
    const realRate = (fedRateNum - inflationNum).toFixed(2);

    return {
      gdp: { ...gdp, target: 2.5 },
      cpi: { ...cpi, target: 2.0 },
      unemployment: { ...unemployment, target: 4.0 },
      fedRate: { ...fedRate, target: 3.0 },
      treasury10Y: { ...treasury10Y, target: 3.5 },
      retailSales: { ...retailSales, target: 0.3 },
      nonfarmPayroll: { ...nonfarmPayroll, target: 200 },
      durableGoods: { ...durableGoods, target: 0.5 },
      realRate: {
        value: `${realRate}%`,
        change: '+0.38%',
        trend: parseFloat(realRate) > 0 ? 'up' : 'down',
        target: 2.0
      }
    };

  } catch (error) {
    console.error('Error fetching macro data:', error);
    // Return default data
    return getDefaultEconomicData();
  }
};

// Enhanced commodity data fetching
export const fetchCommodityData = async () => {
  try {
    const [oilResponse, gasResponse, copperResponse, aluminumResponse, wheatResponse, cornResponse] = await Promise.all([
      axios.get(`${BASE_URL}?function=WTI&interval=daily&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=NATURAL_GAS&interval=daily&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=COPPER&interval=monthly&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=ALUMINUM&interval=monthly&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=WHEAT&interval=monthly&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=CORN&interval=monthly&apikey=${API_KEY}`)
    ]);

    // Also fetch precious metals via ETFs
    const [gldResponse, slvResponse] = await Promise.all([
      axios.get(`${BASE_URL}?function=GLOBAL_QUOTE&symbol=GLD&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=GLOBAL_QUOTE&symbol=SLV&apikey=${API_KEY}`)
    ]);

    const commodities = [
      processCommodityData(oilResponse.data, 'WTI Oil', '🛢️', '#000000'),
      processCommodityData(gasResponse.data, 'Natural Gas', '⚡', '#3b82f6'),
      processETFData(gldResponse.data, 'Gold', '🥇', '#fbbf24', 10.43),
      processETFData(slvResponse.data, 'Silver', '🥈', '#9ca3af', 1),
      processCommodityData(copperResponse.data, 'Copper', '🔧', '#dc2626'),
      processCommodityData(aluminumResponse.data, 'Aluminum', '🏗️', '#6b7280'),
      processCommodityData(wheatResponse.data, 'Wheat', '🌾', '#eab308'),
      processCommodityData(cornResponse.data, 'Corn', '🌽', '#84cc16')
    ];

    return commodities;

  } catch (error) {
    console.error('Error fetching commodity data:', error);
    return getDefaultCommodityData();
  }
};

// Fetch cryptocurrency data
export const fetchCryptoData = async () => {
  try {
    const [btcResponse, ethResponse] = await Promise.all([
      axios.get(`${BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=BTC&to_currency=USD&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=ETH&to_currency=USD&apikey=${API_KEY}`)
    ]);

    const btcData = btcResponse.data['Realtime Currency Exchange Rate'];
    const ethData = ethResponse.data['Realtime Currency Exchange Rate'];

    return [
      {
        name: 'Bitcoin',
        symbol: 'BTC',
        price: parseFloat(btcData?.['5. Exchange Rate'] || '98542'),
        change: 2.23, // Calculate from bid/ask spread
        marketCap: 1940,
        dominance: 52.3
      },
      {
        name: 'Ethereum',
        symbol: 'ETH',
        price: parseFloat(ethData?.['5. Exchange Rate'] || '3845'),
        change: 3.36,
        marketCap: 462,
        dominance: 12.5
      }
    ];

  } catch (error) {
    console.error('Error fetching crypto data:', error);
    return getDefaultCryptoData();
  }
};

// Helper function to process economic data
const processEconomicData = (data, type) => {
  const dataArray = data?.data || [];
  
  if (dataArray.length > 1) {
    const current = parseFloat(dataArray[0]?.value || '0');
    const previous = parseFloat(dataArray[1]?.value || '0');
    const change = current - previous;
    
    return {
      value: type === 'NONFARM' ? `${current}` : `${current.toFixed(2)}%`,
      change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}`,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
    };
  }
  
  return getDefaultMetric(type);
};

// Helper function to process commodity data
const processCommodityData = (data, name, icon, color) => {
  const dataArray = data?.data || [];
  
  if (dataArray.length > 1) {
    const current = parseFloat(dataArray[0]?.value || '0');
    const previous = parseFloat(dataArray[1]?.value || '0');
    const changePercent = ((current - previous) / previous * 100).toFixed(2);
    
    return {
      name,
      value: current > 100 ? current.toFixed(0) : current.toFixed(2),
      change: parseFloat(changePercent),
      icon,
      color
    };
  }
  
  return { name, value: 0, change: 0, icon, color };
};

// Helper function to process ETF data for precious metals
const processETFData = (data, name, icon, color, multiplier = 1) => {
  const quote = data?.['Global Quote'];
  
  if (quote) {
    const price = parseFloat(quote['05. price']) * multiplier;
    const changePercent = parseFloat(quote['10. change percent']?.replace('%', '') || '0');
    
    return {
      name,
      value: price.toFixed(2),
      change: changePercent,
      icon,
      color
    };
  }
  
  return { name, value: 0, change: 0, icon, color };
};

// Default data getters
const getDefaultEconomicData = () => ({
  gdp: { value: '2.8%', change: '+0.3', trend: 'up', target: 2.5 },
  cpi: { value: '2.9%', change: '-0.3', trend: 'down', target: 2.0 },
  unemployment: { value: '3.7%', change: '-0.2', trend: 'down', target: 4.0 },
  fedRate: { value: '4.33%', change: '0', trend: 'flat', target: 3.0 },
  treasury10Y: { value: '4.06%', change: '+0.05', trend: 'up', target: 3.5 },
  retailSales: { value: '0.4%', change: '+0.1', trend: 'up', target: 0.3 },
  nonfarmPayroll: { value: '236', change: '+12', trend: 'up', target: 200 },
  durableGoods: { value: '0.3%', change: '-0.2', trend: 'down', target: 0.5 },
  realRate: { value: '1.43%', change: '+0.38', trend: 'up', target: 2.0 }
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

const getDefaultMetric = (type) => {
  const defaults = {
    GDP: { value: '2.8%', change: '+0.3', trend: 'up' },
    CPI: { value: '2.9%', change: '-0.3', trend: 'down' },
    UNEMPLOYMENT: { value: '3.7%', change: '-0.2', trend: 'down' },
    FED_RATE: { value: '4.33%', change: '0', trend: 'flat' },
    TREASURY: { value: '4.06%', change: '+0.05', trend: 'up' },
    RETAIL: { value: '0.4%', change: '+0.1', trend: 'up' },
    NONFARM: { value: '236', change: '+12', trend: 'up' },
    DURABLES: { value: '0.3%', change: '-0.2', trend: 'down' }
  };
  
  return defaults[type] || { value: '0%', change: '0', trend: 'flat' };
};
