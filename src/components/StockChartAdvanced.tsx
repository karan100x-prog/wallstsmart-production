import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { alphaVantageService } from '../services/alphaVantage';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface StockChartAdvancedProps {
  symbol: string;
}

interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TimeSeriesData {
  [key: string]: {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  };
}

const StockChartAdvanced: React.FC<StockChartAdvancedProps> = ({ symbol }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('1M');
  const [chartType, setChartType] = useState('line');

  useEffect(() => {
    fetchChartData();
  }, [symbol, timeRange]);

  const fetchChartData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data: ChartDataPoint[] = [];
      
      switch (timeRange) {
        case '1D': {
          const response = await alphaVantageService.getIntradayData(symbol, '5min');
          if (response && response['Time Series (5min)']) {
            const timeSeries = response['Time Series (5min)'] as TimeSeriesData;
            data = Object.entries(timeSeries)
              .slice(0, 78) // ~6.5 hours of trading
              .map(([date, values]) => ({
                date,
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseFloat(values['5. volume'])
              }))
              .reverse();
          }
          break;
        }
        
        case '5D': {
          const response = await alphaVantageService.getIntradayData(symbol, '30min');
          if (response && response['Time Series (30min)']) {
            const timeSeries = response['Time Series (30min)'] as TimeSeriesData;
            data = Object.entries(timeSeries)
              .slice(0, 65) // ~5 days
              .map(([date, values]) => ({
                date,
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseFloat(values['5. volume'])
              }))
              .reverse();
          }
          break;
        }
        
        case '1M': {
          const response = await alphaVantageService.getDailyData(symbol);
          if (response && response['Time Series (Daily)']) {
            const timeSeries = response['Time Series (Daily)'] as TimeSeriesData;
            data = Object.entries(timeSeries)
              .slice(0, 30)
              .map(([date, values]) => ({
                date,
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseFloat(values['5. volume'])
              }))
              .reverse();
          }
          break;
        }
        
        case '3M': {
          const response = await alphaVantageService.getDailyData(symbol);
          if (response && response['Time Series (Daily)']) {
            const timeSeries = response['Time Series (Daily)'] as TimeSeriesData;
            data = Object.entries(timeSeries)
              .slice(0, 90)
              .map(([date, values]) => ({
                date,
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseFloat(values['5. volume'])
              }))
              .reverse();
          }
          break;
        }
        
        case '6M': {
          const response = await alphaVantageService.getWeeklyData(symbol);
          if (response && response['Weekly Time Series']) {
            const timeSeries = response['Weekly Time Series'] as TimeSeriesData;
            data = Object.entries(timeSeries)
              .slice(0, 26)
              .map(([date, values]) => ({
                date,
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseFloat(values['5. volume'])
              }))
              .reverse();
          }
          break;
        }
        
        case '1Y': {
          const response = await alphaVantageService.getWeeklyData(symbol);
          if (response && response['Weekly Time Series']) {
            const timeSeries = response['Weekly Time Series'] as TimeSeriesData;
            data = Object.entries(timeSeries)
              .slice(0, 52)
              .map(([date, values]) => ({
                date,
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseFloat(values['5. volume'])
              }))
              .reverse();
          }
          break;
        }
        
        case '5Y': {
          const response = await alphaVantageService.getMonthlyData(symbol);
          if (response && response['Monthly Time Series']) {
            const timeSeries = response['Monthly Time Series'] as TimeSeriesData;
            data = Object.entries(timeSeries)
              .slice(0, 60)
              .map(([date, values]) => ({
                date,
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseFloat(values['5. volume'])
              }))
              .reverse();
          }
          break;
        }
        
        case 'MAX': {
          const response = await alphaVantageService.getMonthlyData(symbol);
          if (response && response['Monthly Time Series']) {
            const timeSeries = response['Monthly Time Series'] as TimeSeriesData;
            data = Object.entries(timeSeries)
              .map(([date, values]) => ({
                date,
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseFloat(values['5. volume'])
              }))
              .reverse();
          }
          break;
        }
        
        default:
          break;
      }
      
      setChartData(data);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (timeRange === '1D' || timeRange === '5D') {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (timeRange === '1M' || timeRange === '3M') {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
    }
  };

  const getChartConfig = () => {
    const labels = chartData.map(d => formatDate(d.date));
    const prices = chartData.map(d => d.close);
    
    const lastPrice = prices[prices.length - 1];
    const firstPrice = prices[0];
    const isPositive = lastPrice >= firstPrice;
    const color = isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
    
    return {
      labels,
      datasets: [
        {
          label: `${symbol} Price`,
          data: prices,
          borderColor: color,
          backgroundColor: `${color}20`,
          borderWidth: 2,
          tension: chartType === 'smooth' ? 0.4 : 0,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true
        }
      ]
    };
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            const dataPoint = chartData[context.dataIndex];
            return [
              `Close: $${dataPoint.close.toFixed(2)}`,
              `Open: $${dataPoint.open.toFixed(2)}`,
              `High: $${dataPoint.high.toFixed(2)}`,
              `Low: $${dataPoint.low.toFixed(2)}`,
              `Volume: ${dataPoint.volume.toLocaleString()}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 8,
          maxRotation: 0
        }
      },
      y: {
        position: 'right' as const,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: (value: any) => `$${value.toFixed(2)}`
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600 text-center py-8">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Price Chart</h2>
        
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['1D', '5D', '1M', '3M', '6M', '1Y', '5Y', 'MAX'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="px-3 py-1 border rounded-lg text-sm"
          >
            <option value="line">Line</option>
            <option value="smooth">Smooth</option>
          </select>
        </div>
      </div>
      
      <div className="h-96">
        {chartData.length > 0 ? (
          <Line data={getChartConfig()} options={options} />
        ) : (
          <div className="text-center text-gray-500 py-8">
            No chart data available
          </div>
        )}
      </div>
      
      {chartData.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Current Price</span>
            <div className="font-semibold">
              ${chartData[chartData.length - 1].close.toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Day Range</span>
            <div className="font-semibold">
              ${Math.min(...chartData.slice(-1).map(d => d.low)).toFixed(2)} - 
              ${Math.max(...chartData.slice(-1).map(d => d.high)).toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Volume</span>
            <div className="font-semibold">
              {chartData[chartData.length - 1].volume.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Period Change</span>
            <div className={`font-semibold ${
              chartData[chartData.length - 1].close >= chartData[0].close 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {((chartData[chartData.length - 1].close - chartData[0].close) / chartData[0].close * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockChartAdvanced;
