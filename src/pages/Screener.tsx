// src/services/screenerService.ts
import axios from 'axios';

const API_KEY = 'NMSRS0ZDIOWF3CLL'; // Your Premium API key

export interface ScreenerStock {
  symbol: string;
  name: string;
  marketCap: number;
  peRatio: number;
  pegRatio: number;
  priceToBook: number;
  dividendYield: number;
  revenue: number;
  revenueGrowth: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  roe: number;
  roa: number;
  debtToEquity: number;
  currentRatio: number;
  quickRatio: number;
  freeCashFlow: number;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  beta: number;
  week52High: number;
  week52Low: number;
  price52WeekPercent: number;
}

export class ScreenerService {
  private cache: Map<string, any> = new Map();
  private cacheTimeout = 4 * 60 * 60 * 1000; // 4 hours
  private apiBase = 'https://www.alphavantage.co/query';

  // Popular stocks for initial load (fallback)
  private popularStocks = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'JNJ', 'V',
    'MA', 'UNH', 'HD', 'DIS', 'BAC', 'ADBE', 'CRM', 'NFLX', 'PFE', 'TMO',
    'ABBV', 'KO', 'PEP', 'AVGO', 'COST', 'WMT', 'CVX', 'LLY', 'NKE', 'MCD'
  ];

  // Get screening universe
  async getScreenerUniverse(): Promise<string[]> {
    // For initial MVP, use popular stocks
    // Later, expand with LISTING_STATUS endpoint
    return this.popularStocks;
  }

  // Main screening function
  async runScreen(filters: any): Promise<ScreenerStock[]> {
    try {
      const symbols = await this.getScreenerUniverse();
      const stocks = await this.fetchStocksData(symbols);
      return this.applyFilters(stocks, filters);
    } catch (error) {
      console.error('Screening error:', error);
      throw error;
    }
  }

  // Fetch data for multiple stocks
  async fetchStocksData(symbols: string[]): Promise<ScreenerStock[]> {
    const stocks: ScreenerStock[] = [];
    
    // Process in batches to respect rate limits
    const batchSize = 15; // Conservative for 75/min limit
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(symbol => this.fetchStockData(symbol));
      
      try {
        const results = await Promise.allSettled(promises);
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            stocks.push(result.value);
          }
        });
      } catch (error) {
        console.error('Batch processing error:', error);
      }
      
      // Rate limit delay (800ms between batches)
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    
    return stocks;
  }

  // Fetch individual stock data
  async fetchStockData(symbol: string): Promise<ScreenerStock | null> {
    try {
      // Check cache
      const cacheKey = `stock_${symbol}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Fetch from Alpha Vantage
      const [overview, quote] = await Promise.all([
        this.fetchOverview(symbol),
        this.fetchQuote(symbol)
      ]);

      if (!overview || !quote || !overview.Name) {
        return null;
      }

      // Parse and calculate metrics
      const stock: ScreenerStock = {
        symbol: symbol,
        name: overview.Name || symbol,
        marketCap: this.parseFloat(overview.MarketCapitalization),
        peRatio: this.parseFloat(overview.PERatio),
        pegRatio: this.parseFloat(overview.PEGRatio),
        priceToBook: this.parseFloat(overview.PriceToBookRatio),
        dividendYield: this.parseFloat(overview.DividendYield) * 100,
        revenue: this.parseFloat(overview.RevenueTTM),
        revenueGrowth: this.parseFloat(overview.QuarterlyRevenueGrowthYOY) * 100,
        grossMargin: (this.parseFloat(overview.GrossProfitTTM) / this.parseFloat(overview.RevenueTTM)) * 100,
        operatingMargin: this.parseFloat(overview.OperatingMarginTTM) * 100,
        netMargin: this.parseFloat(overview.ProfitMargin) * 100,
        roe: this.parseFloat(overview.ReturnOnEquityTTM) * 100,
        roa: this.parseFloat(overview.ReturnOnAssetsTTM) * 100,
        debtToEquity: this.calculateDebtToEquity(overview),
        currentRatio: this.parseFloat(overview.CurrentRatio),
        quickRatio: this.parseFloat(overview.QuickRatio),
        freeCashFlow: this.parseFloat(overview.FreeCashFlowTTM),
        price: this.parseFloat(quote['05. price']),
        change: this.parseFloat(quote['09. change']),
        changePercent: this.parseFloat(quote['10. change percent']?.replace('%', '')),
        volume: this.parseFloat(quote['06. volume']),
        avgVolume: this.parseFloat(overview['50DayMovingAverage']),
        beta: this.parseFloat(overview.Beta),
        week52High: this.parseFloat(overview['52WeekHigh']),
        week52Low: this.parseFloat(overview['52WeekLow']),
        price52WeekPercent: this.calculate52WeekPosition(
          this.parseFloat(quote['05. price']),
          this.parseFloat(overview['52WeekHigh']),
          this.parseFloat(overview['52WeekLow'])
        )
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: stock,
        timestamp: Date.now()
      });

      return stock;
    } catch (error) {
      console.error(`Error fetching ${symbol}:`, error);
      return null;
    }
  }

  // API call helpers
  private async fetchOverview(symbol: string) {
    const response = await axios.get(this.apiBase, {
      params: {
        function: 'OVERVIEW',
        symbol: symbol,
        apikey: API_KEY
      }
    });
    return response.data;
  }

  private async fetchQuote(symbol: string) {
    const response = await axios.get(this.apiBase, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol,
        apikey: API_KEY
      }
    });
    return response.data['Global Quote'];
  }

  // Apply filters to stocks
  applyFilters(stocks: ScreenerStock[], filters: any): ScreenerStock[] {
    if (!filters || Object.keys(filters).length === 0) {
      return stocks;
    }

    return stocks.filter(stock => {
      for (const [key, value] of Object.entries(filters)) {
        if (!value) continue;
        
        const filterValue = value as any;
        let stockValue: any;

        // Map filter keys to stock properties
        const keyMap: any = {
          marketCap: stock.marketCap,
          peRatio: stock.peRatio,
          pegRatio: stock.pegRatio,
          priceToBook: stock.priceToBook,
          dividendYield: stock.dividendYield,
          revenue: stock.revenue,
          revenueGrowth: stock.revenueGrowth,
          earningsGrowth: stock.revenueGrowth, // Using revenue growth as proxy
          grossMargin: stock.grossMargin,
          operatingMargin: stock.operatingMargin,
          netMargin: stock.netMargin,
          roe: stock.roe,
          roa: stock.roa,
          debtToEquity: stock.debtToEquity,
          currentRatio: stock.currentRatio,
          quickRatio: stock.quickRatio,
          freeCashFlow: stock.freeCashFlow,
          price52WeekHigh: stock.price52WeekPercent,
          rsi: 50, // Default RSI for now
          volume: (stock.volume / stock.avgVolume) * 100,
          beta: stock.beta,
          institutionalOwnership: 70, // Default for now
          insiderOwnership: 10, // Default for now
          shortInterest: 5 // Default for now
        };

        stockValue = keyMap[key];
        
        if (stockValue === undefined || stockValue === null) continue;
        
        // Handle range filters
        if (typeof filterValue === 'object' && filterValue !== null) {
          if (filterValue.min !== undefined && stockValue < filterValue.min) {
            return false;
          }
          if (filterValue.max !== undefined && stockValue > filterValue.max) {
            return false;
          }
        }
        
        // Handle select filters
        if (key === 'aboveMA50') {
          // Simplified MA check using current price vs 52-week average
          const isAbove = stock.price > (stock.week52High + stock.week52Low) / 2;
          if (filterValue === 'above' && !isAbove) return false;
          if (filterValue === 'below' && isAbove) return false;
        }
      }
      return true;
    });
  }

  // Utility functions
  private parseFloat(value: any): number {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value.toString().replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  private calculateDebtToEquity(overview: any): number {
    // Simple calculation based on available data
    const bookValue = this.parseFloat(overview.BookValue);
    const priceToBook = this.parseFloat(overview.PriceToBookRatio);
    
    if (bookValue && priceToBook) {
      // Rough estimate: higher P/B often correlates with lower debt
      return Math.max(0, 2 - priceToBook);
    }
    return 0.5; // Default moderate debt
  }

  private calculate52WeekPosition(price: number, high: number, low: number): number {
    if (!price || !high || !low) return 50;
    const position = ((price - low) / (high - low)) * 100;
    return Math.min(100, Math.max(0, position));
  }
}

// Export singleton instance
export const screenerService = new ScreenerService();
