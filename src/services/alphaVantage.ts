// services/alphaVantage.ts
// Complete service with ALL functions your components need

const API_KEY = 'NMSRS0ZDIOWF3CLL';
const BASE_URL = 'https://www.alphavantage.co/query';

// Simple fetch wrapper with basic error handling
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

// 1. Search stocks
export async function searchStocks(keywords: string) {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'SYMBOL_SEARCH',
      keywords
    });
    return data;
  } catch (error) {
    console.error('Error searching stocks:', error);
    return { bestMatches: [] };
  }
}

// 2. Get quote - FIXED to use correct price field
export async function getQuote(symbol: string) {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'GLOBAL_QUOTE',
      symbol
    });
    
    // Return the Global Quote object
    return data['Global Quote'] || {};
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

// 4. Get intraday prices
export async function getIntradayPrices(symbol: string, interval: string = '5min') {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'TIME_SERIES_INTRADAY',
      symbol,
      interval,
      outputsize: 'full'
    });
    return data;
  } catch (error) {
    console.error('Error fetching intraday prices:', error);
    return {};
  }
}

// 5. Get daily prices
export async function getDailyPrices(symbol: string) {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'TIME_SERIES_DAILY',
      symbol,
      outputsize: 'full'
    });
    return data;
  } catch (error) {
    console.error('Error fetching daily prices:', error);
    return {};
  }
}

// 6. Get weekly prices
export async function getWeeklyPrices(symbol: string) {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'TIME_SERIES_WEEKLY',
      symbol
    });
    return data;
  } catch (error) {
    console.error('Error fetching weekly prices:', error);
    return {};
  }
}

// 7. Get monthly prices
export async function getMonthlyPrices(symbol: string) {
  try {
    const data = await fetchFromAlphaVantage({
      function: 'TIME_SERIES_MONTHLY',
      symbol
    });
    return data;
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

// Also export as default for any components that might use default import
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
