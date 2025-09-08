// src/services/alphaVantage.ts

const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'NMSRS0ZDIOWF3CLL';
const BASE_URL = 'https://www.alphavantage.co/query';

// Cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = {
  QUOTE: 30000,      // 30 seconds for quotes
  SEARCH: 300000,    // 5 minutes for search
  OVERVIEW: 3600000, // 1 hour for company overview
  DAILY: 60000,      // 1 minute for daily data
  INTRADAY: 30000,   // 30 seconds for intraday
  NEWS: 300000,      // 5 minutes for news
};

// Rate limiting
let requestQueue: Promise<any> = Promise.resolve();
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 800; // 75 requests per minute = 800ms minimum between requests

async function throttledFetch(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    requestQueue = requestQueue.then(async () => {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(r => setTimeout(r, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }
      
      lastRequestTime = Date.now();
      
      try {
        const response = await fetch(url);
        const data = await response.json();
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Named export for the service
export const alphaVantageService = {
  async searchSymbols(keywords: string) {
    const cacheKey = `search_${keywords}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION.SEARCH) {
      return cached.data;
    }
    
    const url = `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords)}&apikey=${API_KEY}`;
    const data = await throttledFetch(url);
    
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  async getGlobalQuote(symbol: string) {
    const cacheKey = `quote_${symbol}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION.QUOTE) {
      return cached.data;
    }
    
    const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
    const data = await throttledFetch(url);
    
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  async getCompanyOverview(symbol: string) {
    const cacheKey = `overview_${symbol}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION.OVERVIEW) {
      return cached.data;
    }
    
    const url = `${BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;
    const data = await throttledFetch(url);
    
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  async getDailyData(symbol: string, outputsize: 'compact' | 'full' = 'compact') {
    const cacheKey = `daily_${symbol}_${outputsize}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION.DAILY) {
      return cached.data;
    }
    
    const url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputsize}&apikey=${API_KEY}`;
    const data = await throttledFetch(url);
    
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  async getIntradayData(symbol: string, interval: '1min' | '5min' | '15min' | '30min' | '60min' = '5min') {
    const cacheKey = `intraday_${symbol}_${interval}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION.INTRADAY) {
      return cached.data;
    }
    
    const url = `${BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${API_KEY}`;
    const data = await throttledFetch(url);
    
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  async getWeeklyData(symbol: string) {
    const cacheKey = `weekly_${symbol}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION.DAILY) {
      return cached.data;
    }
    
    const url = `${BASE_URL}?function=TIME_SERIES_WEEKLY&symbol=${symbol}&apikey=${API_KEY}`;
    const data = await throttledFetch(url);
    
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  async getMonthlyData(symbol: string) {
    const cacheKey = `monthly_${symbol}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION.DAILY) {
      return cached.data;
    }
    
    const url = `${BASE_URL}?function=TIME_SERIES_MONTHLY&symbol=${symbol}&apikey=${API_KEY}`;
    const data = await throttledFetch(url);
    
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  async getEarnings(symbol: string) {
    const cacheKey = `earnings_${symbol}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION.OVERVIEW) {
      return cached.data;
    }
    
    const url = `${BASE_URL}?function=EARNINGS&symbol=${symbol}&apikey=${API_KEY}`;
    const data = await throttledFetch(url);
    
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  async getNewsSentiment(tickers?: string, topics?: string) {
    const params = new URLSearchParams({
      function: 'NEWS_SENTIMENT',
      apikey: API_KEY,
    });
    
    if (tickers) params.append('tickers', tickers);
    if (topics) params.append('topics', topics);
    
    const cacheKey = `news_${tickers}_${topics}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION.NEWS) {
      return cached.data;
    }
    
    const url = `${BASE_URL}?${params.toString()}`;
    const data = await throttledFetch(url);
    
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  async getTopGainersLosers() {
    const cacheKey = 'top_gainers_losers';
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION.QUOTE) {
      return cached.data;
    }
    
    const url = `${BASE_URL}?function=TOP_GAINERS_LOSERS&apikey=${API_KEY}`;
    const data = await throttledFetch(url);
    
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  // Clear cache method for manual refresh
  clearCache(key?: string) {
    if (key) {
      // Clear specific cache entries matching the key pattern
      for (const [cacheKey] of cache) {
        if (cacheKey.includes(key)) {
          cache.delete(cacheKey);
        }
      }
    } else {
      // Clear all cache
      cache.clear();
    }
  }
};

// Also export as default for flexibility
export default alphaVantageService;
