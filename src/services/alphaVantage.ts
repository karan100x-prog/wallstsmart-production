// services/alphaVantageService.ts
// REPLACE YOUR EXISTING SERVICE WITH THIS FIXED VERSION

import axios from 'axios';

const API_KEY = 'NMSRS0ZDIOWF3CLL';
const BASE_URL = 'https://www.alphavantage.co/query';

// Cache with shorter durations for real-time data
const cache = new Map<string, { data: any; timestamp: number }>();

class AlphaVantageService {
  private lastCallTime = 0;
  private readonly MIN_CALL_INTERVAL = 800; // 75 calls/min = 800ms between calls

  // Rate limiter
  private async throttle() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < this.MIN_CALL_INTERVAL) {
      await new Promise(resolve => 
        setTimeout(resolve, this.MIN_CALL_INTERVAL - timeSinceLastCall)
      );
    }
    
    this.lastCallTime = Date.now();
  }

  // Check if market is currently open
  private isMarketOpen(): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    const day = now.getUTCDay();
    
    // Convert UTC to ET (EST = UTC-5, EDT = UTC-4)
    // Using UTC-5 for conservative estimate
    const etHour = (utcHour - 5 + 24) % 24;
    
    // Market hours: 9:30 AM - 4:00 PM ET, Monday-Friday
    if (day === 0 || day === 6) return false; // Weekend
    
    const marketStart = 9.5; // 9:30 AM
    const marketEnd = 16; // 4:00 PM
    const currentTime = etHour + (utcMinute / 60);
    
    return currentTime >= marketStart && currentTime < marketEnd && day >= 1 && day <= 5;
  }

  // Get cache duration based on market status
  private getCacheDuration(): number {
    if (this.isMarketOpen()) {
      return 5000; // 5 seconds during market hours
    }
    return 60000; // 1 minute after hours
  }

  // Main method to get current price - FIXED VERSION
  async getCurrentPrice(symbol: string): Promise<{
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    timestamp: string;
    isRealtime: boolean;
    previousClose: number;
  }> {
    const isMarketOpen = this.isMarketOpen();
    
    if (isMarketOpen) {
      // During market hours: Use intraday for real-time prices
      return this.getIntradayPrice(symbol);
    } else {
      // After hours: Use global quote
      return this.getGlobalQuote(symbol);
    }
  }

  // Get real-time price using intraday data (MOST ACCURATE DURING MARKET HOURS)
  private async getIntradayPrice(symbol: string) {
    const cacheKey = `intraday_${symbol}`;
    const cacheDuration = 5000; // 5 seconds for real-time
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      console.log(`Cache hit (intraday): ${symbol}`);
      return cached.data;
    }

    console.log(`Fetching real-time price for ${symbol}...`);
    await this.throttle();

    try {
      const response = await axios.get(BASE_URL, {
        params: {
          function: 'TIME_SERIES_INTRADAY',
          symbol: symbol,
          interval: '1min',
          outputsize: 'compact', // Last 100 data points
          apikey: API_KEY
        }
      });

      const data = response.data;
      
      // Check for API error
      if (data['Error Message'] || data['Note']) {
        console.error('API Error:', data['Error Message'] || data['Note']);
        throw new Error('API limit reached or invalid symbol');
      }

      const timeSeries = data['Time Series (1min)'];
      
      if (!timeSeries) {
        console.error('No intraday data available for', symbol);
        // Fallback to global quote
        return this.getGlobalQuote(symbol);
      }

      // Get the latest minute candle
      const times = Object.keys(timeSeries);
      const latestTime = times[0]; // Most recent first
      const latestCandle = timeSeries[latestTime];
      
      // Get previous close from second-to-last day's close
      // For accurate change calculation, we need yesterday's close
      const globalQuote = await this.getGlobalQuoteData(symbol);
      const previousClose = globalQuote ? parseFloat(globalQuote['08. previous close']) : 0;
      
      const currentPrice = parseFloat(latestCandle['4. close']);
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      const priceData = {
        symbol: symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        volume: parseInt(latestCandle['5. volume']),
        timestamp: latestTime,
        isRealtime: true,
        previousClose: previousClose,
        open: parseFloat(latestCandle['1. open']),
        high: parseFloat(latestCandle['2. high']),
        low: parseFloat(latestCandle['3. low'])
      };

      // Cache the result
      cache.set(cacheKey, {
        data: priceData,
        timestamp: Date.now()
      });

      return priceData;
    } catch (error) {
      console.error('Error fetching intraday price:', error);
      // Fallback to global quote
      return this.getGlobalQuote(symbol);
    }
  }

  // Get global quote data (helper method)
  private async getGlobalQuoteData(symbol: string) {
    await this.throttle();
    
    try {
      const response = await axios.get(BASE_URL, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: API_KEY
        }
      });

      return response.data['Global Quote'];
    } catch (error) {
      console.error('Error fetching global quote:', error);
      return null;
    }
  }

  // Get price using global quote (AFTER HOURS FALLBACK)
  private async getGlobalQuote(symbol: string) {
    const cacheKey = `quote_${symbol}`;
    const cacheDuration = this.getCacheDuration();
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      console.log(`Cache hit (global): ${symbol}`);
      return cached.data;
    }

    console.log(`Fetching global quote for ${symbol}...`);
    const quoteData = await this.getGlobalQuoteData(symbol);

    if (!quoteData) {
      throw new Error('Failed to fetch quote data');
    }

    // IMPORTANT: Use '05. price' NOT '08. previous close'
    const currentPrice = parseFloat(quoteData['05. price']); // THIS IS THE FIX!
    const previousClose = parseFloat(quoteData['08. previous close']);
    const change = parseFloat(quoteData['09. change']);
    const changePercent = parseFloat(quoteData['10. change percent'].replace('%', ''));

    const priceData = {
      symbol: symbol,
      price: currentPrice, // Using current price, not previous close!
      change: change,
      changePercent: changePercent,
      volume: parseInt(quoteData['06. volume']),
      timestamp: quoteData['07. latest trading day'],
      isRealtime: false,
      previousClose: previousClose,
      open: parseFloat(quoteData['02. open']),
      high: parseFloat(quoteData['03. high']),
      low: parseFloat(quoteData['04. low'])
    };

    // Cache the result
    cache.set(cacheKey, {
      data: priceData,
      timestamp: Date.now()
    });

    return priceData;
  }

  // Bulk quotes for multiple symbols (efficient for lists)
  async getBulkQuotes(symbols: string[]): Promise<any[]> {
    // Alpha Vantage doesn't have true bulk, but we can optimize
    const promises = symbols.map(symbol => this.getCurrentPrice(symbol));
    return Promise.all(promises);
  }

  // Clear cache (useful for forcing refresh)
  clearCache() {
    cache.clear();
    console.log('Price cache cleared');
  }

  // Get company overview (for fundamentals)
  async getCompanyOverview(symbol: string) {
    const cacheKey = `overview_${symbol}`;
    const cacheDuration = 3600000; // 1 hour for fundamentals
    
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return cached.data;
    }

    await this.throttle();
    
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'OVERVIEW',
        symbol: symbol,
        apikey: API_KEY
      }
    });

    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });

    return response.data;
  }
}

// Export as singleton
export default new AlphaVantageService();
