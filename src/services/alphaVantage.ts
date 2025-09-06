import axios from 'axios';

const API_KEY = 'NMSRS0ZDIOWF3CLL'; // Your Premium API Key
const BASE_URL = 'https://www.alphavantage.co/query';

// Rate limiting: 75 calls per minute with premium
let callCount = 0;
let resetTime = Date.now() + 60000;

const checkRateLimit = () => {
  const now = Date.now();
  if (now > resetTime) {
    callCount = 0;
    resetTime = now + 60000;
  }
  if (callCount >= 75) {
    const waitTime = resetTime - now;
    throw new Error(`Rate limit reached. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
  }
  callCount++;
};

export const searchStocks = async (keywords: string) => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'SYMBOL_SEARCH',
        keywords,
        apikey: API_KEY
      }
    });
    
    const matches = response.data.bestMatches || [];
    return matches.map((match: any) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      type: match['3. type'],
      region: match['4. region'],
      currency: match['8. currency']
    }));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

export const getQuote = async (symbol: string) => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: API_KEY
      }
    });
    return response.data['Global Quote'] || {};
  } catch (error) {
    console.error('Quote error:', error);
    return {};
  }
};

export const getCompanyOverview = async (symbol: string) => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'OVERVIEW',
        symbol,
        apikey: API_KEY
      }
    });
    return response.data;
  } catch (error) {
    console.error('Overview error:', error);
    return {};
  }
};

// ✅ FIXED WITH DEBUGGING
export const getDailyPrices = async (symbol: string, outputsize: string = 'compact') => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'TIME_SERIES_DAILY_ADJUSTED',
        symbol,
        apikey: API_KEY,
        outputsize: outputsize
      }
    });
    
    // 🔍 DEBUG: Let's see what we're getting from the API
    console.log('=== DEBUG getDailyPrices ===');
    console.log('Symbol:', symbol);
    console.log('API Response keys:', Object.keys(response.data));
    
    const timeSeries = response.data['Time Series (Daily)'] || {};
    const entries = Object.entries(timeSeries);
    
    if (entries.length > 0) {
      console.log('First data point:', entries[0]);
      console.log('Available fields in first data point:', Object.keys(entries[0][1] as any));
    }
    
    const result = entries.map(([date, values]: [string, any]) => {
      const dataPoint = {
        date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        adjustedClose: parseFloat(values['5. adjusted close'] || values['4. close']), // Fallback to close if no adjusted
        volume: parseInt(values['6. volume'] || values['5. volume']), // Handle both cases
        dividendAmount: parseFloat(values['7. dividend amount'] || '0'),
        splitCoefficient: parseFloat(values['8. split coefficient'] || '1')
      };
      
      // 🔍 DEBUG: Log if we find a split
      if (dataPoint.splitCoefficient !== 1) {
        console.log(`🚨 SPLIT DETECTED on ${date}: ${dataPoint.splitCoefficient}x`);
      }
      
      return dataPoint;
    });
    
    console.log('=== END DEBUG ===');
    return result;
    
  } catch (error) {
    console.error('Daily prices error:', error);
    return [];
  }
};

// ✅ FIXED: Intraday with adjusted parameter
export const getIntradayPrices = async (symbol: string, interval: string = '5min') => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'TIME_SERIES_INTRADAY',
        symbol,
        interval,
        apikey: API_KEY,
        outputsize: 'full',
        adjusted: 'true'
      }
    });
    
    const timeSeries = response.data[`Time Series (${interval})`] || {};
    return Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'])
    }));
  } catch (error) {
    console.error('Intraday prices error:', error);
    return [];
  }
};

// ✅ FIXED WITH DEBUGGING
export const getWeeklyPrices = async (symbol: string) => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'TIME_SERIES_WEEKLY_ADJUSTED',
        symbol,
        apikey: API_KEY
      }
    });
    
    // 🔍 DEBUG
    console.log('=== DEBUG getWeeklyPrices ===');
    console.log('Weekly API Response keys:', Object.keys(response.data));
    
    const timeSeries = response.data['Weekly Adjusted Time Series'] || {};
    const entries = Object.entries(timeSeries);
    
    if (entries.length > 0) {
      console.log('First weekly data point fields:', Object.keys(entries[0][1] as any));
    }
    
    const result = entries.map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      adjustedClose: parseFloat(values['5. adjusted close'] || values['4. close']),
      volume: parseInt(values['6. volume'] || values['5. volume']),
      dividendAmount: parseFloat(values['7. dividend amount'] || '0')
    }));
    
    console.log('=== END DEBUG ===');
    return result;
    
  } catch (error) {
    console.error('Weekly prices error:', error);
    return [];
  }
};

// ✅ FIXED WITH DEBUGGING
export const getMonthlyPrices = async (symbol: string) => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'TIME_SERIES_MONTHLY_ADJUSTED',
        symbol,
        apikey: API_KEY
      }
    });
    
    // 🔍 DEBUG
    console.log('=== DEBUG getMonthlyPrices ===');
    console.log('Monthly API Response keys:', Object.keys(response.data));
    
    const timeSeries = response.data['Monthly Adjusted Time Series'] || {};
    const entries = Object.entries(timeSeries);
    
    if (entries.length > 0) {
      console.log('First monthly data point fields:', Object.keys(entries[0][1] as any));
    }
    
    const result = entries.map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      adjustedClose: parseFloat(values['5. adjusted close'] || values['4. close']),
      volume: parseInt(values['6. volume'] || values['5. volume']),
      dividendAmount: parseFloat(values['7. dividend amount'] || '0')
    }));
    
    console.log('=== END DEBUG ===');
    return result;
    
  } catch (error) {
    console.error('Monthly prices error:', error);
    return [];
  }
};

export const getEarnings = async (symbol: string) => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'EARNINGS',
        symbol,
        apikey: API_KEY
      }
    });
    return response.data;
  } catch (error) {
    console.error('Earnings error:', error);
    return {};
  }
};

export const getNews = async () => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'NEWS_SENTIMENT',
        apikey: API_KEY,
        limit: 50
      }
    });
    return response.data.feed || [];
  } catch (error) {
    console.error('News error:', error);
    return [];
  }
};

// ✅ NEW FUNCTION: Get stock splits history
export const getStockSplits = async (symbol: string) => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'SPLITS',
        symbol,
        apikey: API_KEY
      }
    });
    
    const data = response.data.data || [];
    return data.map((split: any) => ({
      date: split.split_date,
      ratio: split.split_ratio,
      symbol: split.symbol
    }));
  } catch (error) {
    console.error('Splits error:', error);
    return [];
  }
};
