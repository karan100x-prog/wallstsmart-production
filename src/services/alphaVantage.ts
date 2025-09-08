// services/alphaVantage.ts - CRITICAL FIX FOR PRICE FIELD

const API_KEY = 'NMSRS0ZDIOWF3CLL';
const BASE_URL = 'https://www.alphavantage.co/query';

// Helper to make API calls
async function fetchFromAlphaVantage(params: Record<string, string>) {
  const url = new URL(BASE_URL);
  Object.entries({ ...params, apikey: API_KEY }).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}

// 1. Search stocks - FOR HOMEPAGE SEARCH
export async function searchStocks(keywords: string) {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'SYMBOL_SEARCH',
      keywords
    });
    // Return the correct structure for search
    return data.bestMatches || [];
  } catch (error) {
    console.error('Error searching stocks:', error);
    return [];
  }
}

// 2. Get quote - FIXED TO RETURN CURRENT PRICE
export async function getQuote(symbol: string) {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'GLOBAL_QUOTE',
      symbol
    });
    
    const quote = data['Global Quote'];
    
    // Log to debug
    console.log('Raw quote data for', symbol, quote);
    
    // CRITICAL: Make sure we're returning the CURRENT price structure
    if (quote) {
      // The API returns:
      // "01. symbol": "APP"
      // "02. open": "537.08"
      // "03. high": "555.50"
      // "04. low": "535.70"
      // "05. price": "546.88" <-- THIS IS CURRENT PRICE
      // "06. volume": "8345678"
      // "07. latest trading day": "2025-01-09"
      // "08. previous close": "490.24" <-- NOT THIS
      // "09. change": "56.64"
      // "10. change percent": "11.55%"
      
      return {
        '01. symbol': quote['01. symbol'],
        '02. open': quote['02. open'],
        '03. high': quote['03. high'],
        '04. low': quote['04. low'],
        '05. price': quote['05. price'], // CURRENT PRICE
        '06. volume': quote['06. volume'],
        '07. latest trading day': quote['07. latest trading day'],
        '08. previous close': quote['08. previous close'],
        '09. change': quote['09. change'],
        '10. change percent': quote['10. change percent']
      };
    }
    
    return {};
  } catch (error) {
    console.error('Error fetching quote:', error);
    return {};
  }
}

// 3. Get company overview
export async function getCompanyOverview(symbol: string) {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'OVERVIEW',
      symbol
    });
    return data;
  } catch (error) {
    console.error('Error fetching company overview:', error);
    return {};
  }
}

// 4. Get intraday prices - FOR CHARTS
export async function getIntradayPrices(symbol: string, interval: string = '5min') {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'TIME_SERIES_INTRADAY',
      symbol,
      interval,
      outputsize: 'full'
    });
    
    // Return the time series data for charts
    const timeSeriesKey = `Time Series (${interval})`;
    return {
      'Meta Data': data['Meta Data'],
      [timeSeriesKey]: data[timeSeriesKey] || {}
    };
  } catch (error) {
    console.error('Error fetching intraday prices:', error);
    return {};
  }
}

// 5. Get daily prices - FOR CHARTS
export async function getDailyPrices(symbol: string) {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'TIME_SERIES_DAILY',
      symbol,
      outputsize: 'full'
    });
    
    return {
      'Meta Data': data['Meta Data'],
      'Time Series (Daily)': data['Time Series (Daily)'] || {}
    };
  } catch (error) {
    console.error('Error fetching daily prices:', error);
    return {};
  }
}

// 6. Get weekly prices - FOR CHARTS
export async function getWeeklyPrices(symbol: string) {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'TIME_SERIES_WEEKLY',
      symbol
    });
    
    return {
      'Meta Data': data['Meta Data'],
      'Weekly Time Series': data['Weekly Time Series'] || {}
    };
  } catch (error) {
    console.error('Error fetching weekly prices:', error);
    return {};
  }
}

// 7. Get monthly prices - FOR CHARTS
export async function getMonthlyPrices(symbol: string) {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'TIME_SERIES_MONTHLY',
      symbol
    });
    
    return {
      'Meta Data': data['Meta Data'],
      'Monthly Time Series': data['Monthly Time Series'] || {}
    };
  } catch (error) {
    console.error('Error fetching monthly prices:', error);
    return {};
  }
}

// 8. Fetch income statement
export async function fetchIncomeStatement(symbol: string) {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'INCOME_STATEMENT',
      symbol
    });
    return data;
  } catch (error) {
    console.error('Error fetching income statement:', error);
    return {};
  }
}

// 9. Fetch balance sheet
export async function fetchBalanceSheet(symbol: string) {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'BALANCE_SHEET',
      symbol
    });
    return data;
  } catch (error) {
    console.error('Error fetching balance sheet:', error);
    return {};
  }
}

// 10. Fetch cash flow
export async function fetchCashFlow(symbol: string) {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'CASH_FLOW',
      symbol
    });
    return data;
  } catch (error) {
    console.error('Error fetching cash flow:', error);
    return {};
  }
}

// Export as default for compatibility
export default {
  searchStocks,
  getQuote,
  getCompanyOverview,
  getIntradayPrices,
  getDailyPrices,
  getWeeklyPrices,
  getMonthlyPrices,
  fetchIncomeStatement,
  fetchBalanceSheet,
  fetchCashFlow
};
