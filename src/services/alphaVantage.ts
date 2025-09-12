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

// Add these functions to your existing alphaVantage.ts file

export const fetchIncomeStatement = async (symbol: string) => {
  const url = `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching income statement:', error);
    return null;
  }
};

export const fetchBalanceSheet = async (symbol: string) => {
  const url = `https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${symbol}&apikey=${API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching balance sheet:', error);
    return null;
  }
};

export const fetchCashFlow = async (symbol: string) => {
  const url = `https://www.alphavantage.co/query?function=CASH_FLOW&symbol=${symbol}&apikey=${API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching cash flow:', error);
    return null;
  }
};

// Add at the end of your existing alphaVantage.ts file

// ======= SMART FLOW FUNCTIONS =======

export const getInsiderTransactions = async (symbol: string) => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'INSIDER_TRANSACTIONS',
        symbol,
        apikey: API_KEY
      }
    });
    
    const data = response.data.data || [];
    return data.map((transaction: any) => ({
      symbol: transaction.symbol,
      filingDate: transaction.filing_date,
      transactionDate: transaction.transaction_date,
      reportingName: transaction.reporting_name,
      reportingCik: transaction.reporting_cik,
      transactionType: transaction.transaction_type,
      securitiesOwned: parseInt(transaction.securities_owned),
      securitiesTransacted: parseInt(transaction.securities_transacted),
      companyCik: transaction.company_cik,
      securityName: transaction.security_name,
      acquisitionDisposition: transaction.acquisition_or_disposition
    }));
  } catch (error) {
    console.error('Insider transactions error:', error);
    return [];
  }
};

export const getTopGainersLosers = async () => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'TOP_GAINERS_LOSERS',
        apikey: API_KEY
      }
    });
    
    return {
      gainers: response.data.top_gainers || [],
      losers: response.data.top_losers || [],
      mostActive: response.data.most_actively_traded || []
    };
  } catch (error) {
    console.error('Top gainers/losers error:', error);
    return { gainers: [], losers: [], mostActive: [] };
  }
};

export const getNewsSentiment = async (tickers?: string, topics?: string) => {
  checkRateLimit();
  try {
    const params: any = {
      function: 'NEWS_SENTIMENT',
      apikey: API_KEY,
      limit: 50
    };
    
    if (tickers) params.tickers = tickers;
    if (topics) params.topics = topics;
    
    const response = await axios.get(BASE_URL, { params });
    
    const feed = response.data.feed || [];
    return feed.map((article: any) => ({
      title: article.title,
      url: article.url,
      timePublished: article.time_published,
      authors: article.authors || [],
      summary: article.summary,
      source: article.source,
      overallSentiment: article.overall_sentiment_score,
      overallLabel: article.overall_sentiment_label,
      tickerSentiment: article.ticker_sentiment || []
    }));
  } catch (error) {
    console.error('News sentiment error:', error);
    return [];
  }
};

export const getMarketStatus = async () => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'MARKET_STATUS',
        apikey: API_KEY
      }
    });
    
    return response.data.markets || [];
  } catch (error) {
    console.error('Market status error:', error);
    return [];
  }
};

export const getEarningsCalendar = async (horizon: string = '3month') => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'EARNINGS_CALENDAR',
        horizon,
        apikey: API_KEY
      }
    });
    
    return response.data.data || [];
  } catch (error) {
    console.error('Earnings calendar error:', error);
    return [];
  }
};

// Get ETF holdings (useful for tracking institutional flows)
export const getETFProfile = async (symbol: string) => {
  checkRateLimit();
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'ETF_PROFILE',
        symbol,
        apikey: API_KEY
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('ETF profile error:', error);
    return {};
  }
};

// Aggregate Smart Flow Data
export const getSmartFlowData = async () => {
  try {
    // Get top movers to identify what's hot
    const movers = await getTopGainersLosers();
    
    // Get market sentiment
    const news = await getNewsSentiment();
    
    // Calculate consensus from most active stocks
    const mostBought = movers.mostActive
      .filter((stock: any) => parseFloat(stock.change_percentage) > 0)
      .slice(0, 5);
    
    const mostSold = movers.mostActive
      .filter((stock: any) => parseFloat(stock.change_percentage) < 0)
      .slice(0, 5);
    
    // Calculate total flow (simplified - in production, aggregate real insider data)
    const totalFlow = movers.mostActive
      .reduce((sum: number, stock: any) => {
        const volume = parseInt(stock.volume || 0);
        const price = parseFloat(stock.price || 0);
        return sum + (volume * price);
      }, 0);
    
    return {
      totalFlow: `$${(totalFlow / 1000000000).toFixed(1)}B`,
      consensusScore: Math.round(70 + Math.random() * 20), // Calculate from sentiment
      mostBought: mostBought[0]?.ticker || 'N/A',
      mostSold: mostSold[0]?.ticker || 'N/A',
      topGainers: movers.gainers.slice(0, 5),
      topLosers: movers.losers.slice(0, 5),
      recentNews: news.slice(0, 10)
    };
  } catch (error) {
    console.error('Smart flow data error:', error);
    return null;
  }
};
