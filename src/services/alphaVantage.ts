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

export const getDailyPrices = async (symbol: string) => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol,
        apikey: API_KEY,
        outputsize: 'compact'
      }
    });
    
    const timeSeries = response.data['Time Series (Daily)'] || {};
    return Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: values['1. open'],
      high: values['2. high'],
      low: values['3. low'],
      close: values['4. close'],
      volume: values['5. volume']
    }));
  } catch (error) {
    console.error('Daily prices error:', error);
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
