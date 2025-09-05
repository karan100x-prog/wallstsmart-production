import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getQuote, getCompanyOverview } from '../services/alphaVantage';
import StockChartAdvanced from './StockChartAdvanced';

interface StockDetailProps {
  symbol: string;
  onBack: () => void;
}

const StockDetail: React.FC<StockDetailProps> = ({ symbol, onBack }) => {
  const [quote, setQuote] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStockData();
  }, [symbol]);

  const loadStockData = async () => {
    setLoading(true);
    try {
      const [quoteData, companyData] = await Promise.all([
        getQuote(symbol),
        getCompanyOverview(symbol)
      ]);
      
      setQuote(quoteData);
      setCompany(companyData);
    } catch (error) {
      console.error('Error loading stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const price = parseFloat(quote?.['05. price'] || '0');
  const change = parseFloat(quote?.['09. change'] || '0');
  const changePercent = quote?.['10. change percent'] || '0%';
  const volume = parseInt(quote?.['06. volume'] || '0');

  // Helper function to format large numbers
  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  // Helper function to format percentages
  const formatPercent = (value: any) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 'N/A';
    return `${(num * 100).toFixed(2)}%`;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{symbol}</h1>
            <p className="text-xl text-gray-400">{company?.Name || 'Loading...'}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">${price.toFixed(2)}</div>
            <div className={`text-lg flex items-center justify-end gap-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent})
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-8">
        <StockChartAdvanced symbol={symbol} />
      </div>

      {/* Valuation Metrics */}
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6">
        <h3 className="text-xl font-bold mb-4">Valuation Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-gray-400 text-sm">Market Cap</span>
            <div className="text-lg font-semibold">
              ${formatLargeNumber(parseFloat(company?.MarketCapitalization || '0'))}
            </div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">P/E Ratio</span>
            <div className="text-lg font-semibold">{company?.PERatio || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">PEG Ratio</span>
            <div className="text-lg font-semibold">{company?.PEGRatio || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Book Value</span>
            <div className="text-lg font-semibold">${company?.BookValue || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Price/Book</span>
            <div className="text-lg font-semibold">{company?.PriceToBookRatio || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Price/Sales TTM</span>
            <div className="text-lg font-semibold">{company?.PriceToSalesRatioTTM || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Enterprise Value</span>
            <div className="text-lg font-semibold">
              ${formatLargeNumber(parseFloat(company?.EnterpriseValue || '0'))}
            </div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">EV/Revenue</span>
            <div className="text-lg font-semibold">{company?.EnterpriseValueToRevenue || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">EV/EBITDA</span>
            <div className="text-lg font-semibold">{company?.EnterpriseValueToEBITDA || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Profitability Metrics */}
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6">
        <h3 className="text-xl font-bold mb-4">Profitability Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-gray-400 text-sm">Profit Margin</span>
            <div className="text-lg font-semibold">{formatPercent(company?.ProfitMargin)}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Operating Margin TTM</span>
            <div className="text-lg font-semibold">{formatPercent(company?.OperatingMarginTTM)}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Gross Profit TTM</span>
            <div className="text-lg font-semibold">
              ${formatLargeNumber(parseFloat(company?.GrossProfitTTM || '0'))}
            </div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">EBITDA</span>
            <div className="text-lg font-semibold">
              ${formatLargeNumber(parseFloat(company?.EBITDA || '0'))}
            </div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">ROA (TTM)</span>
            <div className="text-lg font-semibold">{formatPercent(company?.ReturnOnAssetsTTM)}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">ROE (TTM)</span>
            <div className="text-lg font-semibold">{formatPercent(company?.ReturnOnEquityTTM)}</div>
          </div>
        </div>
      </div>

      {/* Income Statement Data */}
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6">
        <h3 className="text-xl font-bold mb-4">Income Statement</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-gray-400 text-sm">Revenue (TTM)</span>
            <div className="text-lg font-semibold">
              ${formatLargeNumber(parseFloat(company?.RevenueTTM || '0'))}
            </div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Revenue Per Share</span>
            <div className="text-lg font-semibold">${company?.RevenuePerShareTTM || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">EPS</span>
            <div className="text-lg font-semibold">${company?.EPS || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Diluted EPS (TTM)</span>
            <div className="text-lg font-semibold">${company?.DilutedEPSTTM || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Earnings Growth YoY</span>
            <div className="text-lg font-semibold">{formatPercent(company?.QuarterlyEarningsGrowthYOY)}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Revenue Growth YoY</span>
            <div className="text-lg font-semibold">{formatPercent(company?.QuarterlyRevenueGrowthYOY)}</div>
          </div>
        </div>
      </div>

      {/* Dividend Information */}
      {company?.DividendYield && parseFloat(company?.DividendYield) > 0 && (
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6">
          <h3 className="text-xl font-bold mb-4">Dividend Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-gray-400 text-sm">Dividend Yield</span>
              <div className="text-lg font-semibold text-green-500">{formatPercent(company?.DividendYield)}</div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Annual Dividend</span>
              <div className="text-lg font-semibold">${company?.DividendPerShare || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Payout Ratio</span>
              <div className="text-lg font-semibold">{formatPercent(company?.PayoutRatio)}</div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Ex-Dividend Date</span>
              <div className="text-lg font-semibold">{company?.ExDividendDate || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Dividend Date</span>
              <div className="text-lg font-semibold">{company?.DividendDate || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Forward Dividend Yield</span>
              <div className="text-lg font-semibold">{formatPercent(company?.ForwardAnnualDividendYield)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Trading Metrics */}
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6">
        <h3 className="text-xl font-bold mb-4">Trading Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-gray-400 text-sm">Beta</span>
            <div className="text-lg font-semibold">{company?.Beta || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">52 Week High</span>
            <div className="text-lg font-semibold">${company?.['52WeekHigh'] || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">52 Week Low</span>
            <div className="text-lg font-semibold">${company?.['52WeekLow'] || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">50 Day MA</span>
            <div className="text-lg font-semibold">${company?.['50DayMovingAverage'] || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">200 Day MA</span>
            <div className="text-lg font-semibold">${company?.['200DayMovingAverage'] || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Volume</span>
            <div className="text-lg font-semibold">{formatLargeNumber(volume)}</div>
          </div>
        </div>
      </div>

      {/* Ownership & Short Interest */}
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6">
        <h3 className="text-xl font-bold mb-4">Ownership & Short Interest</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-gray-400 text-sm">Institutional Ownership</span>
            <div className="text-lg font-semibold">{formatPercent(company?.PercentInstitutions)}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Insider Ownership</span>
            <div className="text-lg font-semibold">{formatPercent(company?.PercentInsiders)}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Shares Outstanding</span>
            <div className="text-lg font-semibold">
              {formatLargeNumber(parseFloat(company?.SharesOutstanding || '0'))}
            </div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Float</span>
            <div className="text-lg font-semibold">
              {formatLargeNumber(parseFloat(company?.SharesFloat || '0'))}
            </div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Short Interest</span>
            <div className="text-lg font-semibold">
              {formatLargeNumber(parseFloat(company?.SharesShort || '0'))}
            </div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Short % of Float</span>
            <div className="text-lg font-semibold">{formatPercent(company?.ShortPercentFloat)}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Short Ratio</span>
            <div className="text-lg font-semibold">{company?.ShortRatio || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-bold mb-4">Company Information</h3>
          <div className="space-y-3">
            <div>
              <span className="text-gray-400">Exchange:</span>
              <span className="ml-2">{company?.Exchange || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Sector:</span>
              <span className="ml-2">{company?.Sector || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Industry:</span>
              <span className="ml-2">{company?.Industry || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Country:</span>
              <span className="ml-2">{company?.Country || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Employees:</span>
              <span className="ml-2">{formatLargeNumber(parseFloat(company?.FullTimeEmployees || '0'))}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-bold mb-4">Analyst Targets</h3>
          <div className="space-y-3">
            <div>
              <span className="text-gray-400">Target Price:</span>
              <span className="ml-2 text-xl font-bold text-green-500">
                ${company?.AnalystTargetPrice || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Forward P/E:</span>
              <span className="ml-2">{company?.ForwardPE || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Trailing P/E:</span>
              <span className="ml-2">{company?.TrailingPE || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Latest Quarter:</span>
              <span className="ml-2">{company?.LatestQuarter || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Fiscal Year End:</span>
              <span className="ml-2">{company?.FiscalYearEnd || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Company Description */}
      {company?.Description && (
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mt-6">
          <h3 className="text-xl font-bold mb-4">About {company?.Name}</h3>
          <p className="text-gray-300 leading-relaxed">{company?.Description}</p>
        </div>
      )}
    </div>
  );
};

export default StockDetail;
